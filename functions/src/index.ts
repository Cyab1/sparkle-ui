import * as functions from "firebase-functions/v2";
import { onRequest, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

export { payfastWebhook, releaseStalePendingBookings } from "./payfastWebhook";

admin.initializeApp();

function db() {
  return admin.database();
}

// ── Updated OpenAI config ──────────────────────────────────────
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

// ── Updated quota config — matches current membership tier names ──────────────
const QUOTA: Record<string, number> = {
  // Current tiers
  unlimited_12m: 100,
  unlimited_6m: 100,
  unlimited_m2m: 100,
  hybrid_12m: 20,
  hybrid_6m: 20,
  hybrid_m2m: 20,
  u18: 20,
  // Legacy fallbacks
  gold: 100,
  silver: 20,
  basic: 0,
};

async function checkAndIncrementQuota(uid: string): Promise<number> {
  const userSnap = await db().ref(`mk2_users/${uid}`).once("value");
  const user = userSnap.val();
  if (!user)
    throw new functions.https.HttpsError("not-found", "User not found");

  const membership = user.membership ?? "basic";

  // Block only basic (non-member / credits-only)
  if (membership === "basic") {
    throw new functions.https.HttpsError("permission-denied", "JOIN_GYM");
  }

  const total = QUOTA[membership] ?? 0;
  if (total === 0) {
    throw new functions.https.HttpsError("permission-denied", "JOIN_GYM");
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const quotaRef = db().ref(`mk2_users/${uid}/aiQuota`);
  const quotaSnap = await quotaRef.once("value");
  const quota = quotaSnap.val() || { used: 0, month };

  if (quota.month !== month) {
    quota.used = 0;
    quota.month = month;
  }

  if (quota.used >= total) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "QUOTA_EXCEEDED",
    );
  }

  const newUsed = quota.used + 1;
  await quotaRef.set({ used: newUsed, month });

  return Math.max(0, total - newUsed);
}

// ── Updated OpenAI caller ──────────────────────────────────────
async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: any[],
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 1500,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenAI API error:", response.status, err);
    throw new functions.https.HttpsError(
      "internal",
      `OpenAI API error: ${response.status}`,
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  if (!text) {
    throw new functions.https.HttpsError("internal", "EMPTY_RESPONSE");
  }

  return text;
}

export const aiChat = onCall(
  {
    region: "europe-west1",
    secrets: ["OPENAI_API_KEY"],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "Not logged in");
    }

    const { mode, prompt, systemPrompt, fileData, mediaType, isPDF } =
      request.data as {
        mode: string;
        prompt?: string;
        systemPrompt?: string;
        fileData?: string;
        mediaType?: string;
        isPDF?: boolean;
      };

    const quotaRemaining = await checkAndIncrementQuota(uid);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        "internal",
        "API key not configured",
      );
    }

    const sysPrompt =
      systemPrompt ||
      "You are a helpful fitness assistant at MK2 Rivers Fitness, South Africa.";

    // ── Updated InBody extraction (OpenAI format, no PDF) ──
    if (mode === "inbody_extract") {
      if (!fileData || !mediaType) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "fileData and mediaType are required for inbody_extract mode",
        );
      }

      if (isPDF) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "PDF extraction is not supported with the current AI provider — please upload an image instead.",
        );
      }

      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                prompt ||
                `Extract InBody values as JSON with keys: weight, bodyFat, muscleMass, fatMass, visceralFat, totalBodyWater. Respond ONLY with the JSON object.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${fileData}` },
            },
          ],
        },
      ];

      const response = await callOpenAI(apiKey, sysPrompt, messages);
      return { response, quotaRemaining };
    }

    if (!prompt) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "prompt is required for this mode",
      );
    }

    const messages = [{ role: "user", content: prompt }];
    const response = await callOpenAI(apiKey, sysPrompt, messages);
    return { response, quotaRemaining };
  },
);

async function writeNotification(
  uid: string,
  title: string,
  body: string,
  link?: string,
) {
  await db()
    .ref(`users/${uid}/notifications`)
    .push({
      title,
      body,
      message: body,
      timestamp: Date.now(),
      read: false,
      createdAt: Date.now(),
      ...(link ? { link } : {}),
    });
}

async function writeNotificationForAll(
  uidTokenPairs: { uid: string }[],
  title: string,
  body: string,
  link?: string,
) {
  const writes = uidTokenPairs.map(({ uid }) =>
    writeNotification(uid, title, body, link),
  );
  await Promise.all(writes);
}

async function getUserToken(uid: string): Promise<string | null> {
  const snap = await db().ref(`mk2_users/${uid}/fcmToken`).once("value");
  return snap.val() as string | null;
}

async function getUserPrefs(uid: string): Promise<Record<string, boolean>> {
  const snap = await db()
    .ref(`mk2_users/${uid}/notificationPrefs`)
    .once("value");
  return snap.val() || {};
}

async function sendToTokens(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;

  const unique = [...new Set(tokens.filter(Boolean))];
  if (unique.length === 0) return;

  const message: admin.messaging.MulticastMessage = {
    notification: { title, body },
    tokens: unique,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  const cleanupPromises: Promise<any>[] = [];
  response.responses.forEach((resp, idx) => {
    if (
      !resp.success &&
      (resp.error?.code === "messaging/invalid-registration-token" ||
        resp.error?.code === "messaging/registration-token-not-registered")
    ) {
      const badToken = unique[idx];
      cleanupPromises.push(
        db()
          .ref("mk2_users")
          .once("value")
          .then((snap) =>
            snap.forEach((user) => {
              if (user.child("fcmToken").val() === badToken) {
                user.ref.child("fcmToken").remove();
              }
            }),
          ),
      );
    }
  });

  await Promise.all(cleanupPromises);
}

async function sendToUser(
  uid: string,
  title: string,
  body: string,
  link?: string,
) {
  const token = await getUserToken(uid);
  await writeNotification(uid, title, body, link);
  if (token) await sendToTokens([token], title, body);
  console.log(`Notification sent + written for ${uid}`);
}

async function sendToAllUsers(
  title: string,
  body: string,
  prefKey?: string,
  link?: string,
) {
  const usersSnap = await db().ref("mk2_users").once("value");
  const tokens: string[] = [];
  const eligibleUids: { uid: string }[] = [];

  usersSnap.forEach((user) => {
    if (!user.key) return;
    if (prefKey) {
      const prefs = user.child("notificationPrefs").val() || {};
      if (prefs[prefKey] === false) return;
    }
    eligibleUids.push({ uid: user.key });
    const token = user.child("fcmToken").val() as string | null;
    if (token) tokens.push(token);
  });

  await writeNotificationForAll(eligibleUids, title, body, link);
  await sendToTokens(tokens, title, body);
}

export const onClassBookingCreate = functions.database.onValueCreated(
  {
    ref: "/class_bookings/{classDay}/{userId}",
    instance: "gym-pro-20ee6-default-rtdb",
    region: "europe-west1",
  },
  async (event: any) => {
    const userId = event.params.userId;
    const classDay = event.params.classDay;
    const bookingData = event.data.val();

    if (bookingData?.paid === true) {
      console.log(
        `onClassBookingCreate: skipping paid booking for ${userId} — payfastNotify handles notification`,
      );
      return null;
    }

    const prefs = await getUserPrefs(userId);
    if (prefs.classReminders === false) return null;

    await sendToUser(
      userId,
      "Class Booking Confirmed 🏋️",
      `You are booked for the class on ${classDay}. See you there!`,
      "classes",
    );
    return null;
  },
);

export const onMessageCreate = functions.database.onValueCreated(
  {
    ref: "/rooms/{roomId}/messages/{messageId}",
    instance: "gym-pro-20ee6-default-rtdb",
    region: "europe-west1",
  },
  async (event: any) => {
    const roomId = event.params.roomId;
    const message = event.data.val() as {
      uid: string;
      user?: string;
      text?: string;
    };
    if (!message) return null;

    const usersSnap = await db().ref("mk2_users").once("value");
    const tokens: string[] = [];
    const eligibleUids: { uid: string }[] = [];

    usersSnap.forEach((user) => {
      if (!user.key || user.key === message.uid) return;
      const prefs = user.child("notificationPrefs").val() || {};
      if (prefs.community === false) return;
      const joinedRooms = user.child("joinedRooms").val() || {};
      if (!joinedRooms[roomId]) return;
      eligibleUids.push({ uid: user.key });
      const token = user.child("fcmToken").val() as string | null;
      if (token) tokens.push(token);
    });

    const title = `💬 New message in ${roomId}`;
    const body = message.text
      ? `${message.user || "Someone"}: ${message.text.slice(0, 100)}`
      : `${message.user || "Someone"} sent a file`;

    await writeNotificationForAll(eligibleUids, title, body, "community");
    await sendToTokens(tokens, title, body);
    return null;
  },
);

export const onPollCreate = functions.database.onValueCreated(
  {
    ref: "/rooms/{roomId}/polls/{pollId}",
    instance: "gym-pro-20ee6-default-rtdb",
    region: "europe-west1",
  },
  async (event: any) => {
    const poll = event.data.val() as { uid: string; question?: string };
    const roomId = event.params.roomId;
    if (!poll) return null;

    const usersSnap = await db().ref("mk2_users").once("value");
    const tokens: string[] = [];
    const eligibleUids: { uid: string }[] = [];

    usersSnap.forEach((user) => {
      if (!user.key || user.key === poll.uid) return;
      const prefs = user.child("notificationPrefs").val() || {};
      if (prefs.community === false) return;
      const joinedRooms = user.child("joinedRooms").val() || {};
      if (!joinedRooms[roomId]) return;
      eligibleUids.push({ uid: user.key });
      const token = user.child("fcmToken").val() as string | null;
      if (token) tokens.push(token);
    });

    const title = `📊 New Poll in ${roomId}`;
    const body = poll.question || "A new poll has been posted. Go vote!";

    await writeNotificationForAll(eligibleUids, title, body, "community");
    await sendToTokens(tokens, title, body);
    return null;
  },
);

export const onNewsPostCreate = functions.database.onValueCreated(
  {
    ref: "/admin_news/{newsId}",
    instance: "gym-pro-20ee6-default-rtdb",
    region: "europe-west1",
  },
  async (event: any) => {
    const news = event.data.val() as {
      title?: string;
      content?: string;
      status?: string;
    };

    if (news?.status === "draft") {
      console.log(
        "onNewsPostCreate: skipping draft post — no notification sent",
      );
      return null;
    }

    await sendToAllUsers(
      news.title || "📢 News Update",
      news.content || "Read the latest news from MK Two Rivers.",
      "gymNews",
    );
    return null;
  },
);

export const checkinReminder = onSchedule(
  {
    schedule: "0 9 * * 1-6",
    timeZone: "Africa/Johannesburg",
    region: "europe-west1",
  },
  async () => {
    const now = new Date(
      new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }),
    );
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const bookingsSnap = await db().ref("class_bookings").once("value");
    if (!bookingsSnap.exists()) return;

    const bookedUids = new Set<string>();
    bookingsSnap.forEach((classNode) => {
      if (!classNode.key?.endsWith(todayKey)) return;
      classNode.forEach((userNode) => {
        if (userNode.key) bookedUids.add(userNode.key);
      });
    });

    if (bookedUids.size === 0) {
      console.log(
        `checkinReminder: no bookings found for ${todayKey}, skipping.`,
      );
      return;
    }

    const sends = [...bookedUids].map(async (uid) => {
      const prefs = await getUserPrefs(uid);
      if (prefs.classReminders === false) return;
      await sendToUser(
        uid,
        "Class Reminder 🏋️",
        "You have a class booked today — don't forget to check in at the gym!",
        "classes",
      );
    });

    await Promise.all(sends);
  },
);

export const payfastNotify = onRequest(
  { region: "europe-west1" },
  async (req: any, res: any) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const data = req.body as Record<string, string>;

    const paramString = Object.entries(data)
      .filter(([key]) => key !== "signature")
      .map(
        ([k, v]) => `${k}=${encodeURIComponent(v ?? "").replace(/%20/g, "+")}`,
      )
      .join("&");

    const validRes = await fetch(
      "https://www.payfast.co.za/eng/query/validate",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: paramString,
      },
    );
    const validText = await validRes.text();

    if (validText !== "VALID") {
      console.error("PayFast validation failed:", validText);
      res.status(400).send("Invalid payment");
      return;
    }

    if (data.payment_status !== "COMPLETE") {
      res.status(200).send("Not complete, ignoring");
      return;
    }

    const uid = data.custom_str1;
    const refId = data.custom_str2;
    const credits = parseInt(data.custom_str3 ?? "0");
    const paymentType = data.custom_str4;

    if (paymentType === "class_booking") {
      const bookingId = uid;
      const price = parseFloat(data.amount);

      const bookingRef = db().ref(`mk2_bookings/${bookingId}`);
      const bookingSnap = await bookingRef.get();
      if (!bookingSnap.exists()) {
        console.error(`Booking ${bookingId} not found`);
        res.status(404).send("Booking not found");
        return;
      }

      const booking = bookingSnap.val();
      if (booking.status !== "pending_payment") {
        console.log(
          `Booking ${bookingId} already processed (${booking.status})`,
        );
        res.status(200).send("OK");
        return;
      }

      await bookingRef.update({
        status: "confirmed",
        paymentId: data.pf_payment_id,
        paidAt: Date.now(),
      });

      const {
        userId,
        className,
        dateKey,
        time,
        classId,
        dayName,
        category,
        trainer,
      } = booking;
      const userSnap = await db().ref(`mk2_users/${userId}`).get();
      const userData = userSnap.val();
      if (!userData) throw new Error("User not found");

      const safeKey = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, "_");
      const classBookingKey = `${safeKey(className)}_${dateKey}`;

      await db().ref(`class_bookings/${classBookingKey}/${userId}`).set({
        name: userData.name,
        email: userData.email,
        bookedAt: Date.now(),
        paid: true,
        amount: price,
      });

      const newBooking = {
        name: className,
        time,
        dateKey,
        displayDate: booking.dateDisplay,
        category: category || "Class",
        trainer: trainer || "Coach",
        price,
      };
      const existingBookings = userData.bookings || [];
      await db()
        .ref(`mk2_users/${userId}/bookings`)
        .set([...existingBookings, newBooking]);

      if (classId) {
        await db()
          .ref(`admin_classes/${classId}`)
          .transaction((current) => {
            if (current) current.bookedCount = (current.bookedCount || 0) + 1;
            return current;
          });
      } else {
        const classesSnap = await db().ref("admin_classes").once("value");
        let foundId: string | null = null;
        classesSnap.forEach((child) => {
          const cls = child.val();
          if (
            cls.name === className &&
            ((cls.scheduleType === "date" && cls.specificDate === dateKey) ||
              (cls.scheduleType === "day" && cls.day === dayName))
          ) {
            foundId = child.key;
          }
        });
        if (foundId) {
          await db()
            .ref(`admin_classes/${foundId}/bookedCount`)
            .transaction((c) => (c || 0) + 1);
        }
      }

      await sendToUser(
        userId,
        "Class Booking Confirmed 🏋️",
        `Your payment for ${className} on ${booking.dateDisplay} was successful. See you there!`,
        "classes",
      );

      console.log(`✓ Class booking confirmed: ${bookingId} for user ${userId}`);
      res.status(200).send("OK");
      return;
    }

    if (paymentType === "credits") {
      if (!uid) {
        res.status(400).send("Missing uid");
        return;
      }

      const credRef = db().ref(`mk2_users/${uid}/classCredits`);
      const snap = await credRef.once("value");
      const current = snap.exists() ? (snap.val() as number) : 0;
      await credRef.set(current + credits);

      await db()
        .ref(`mk2_users/${uid}/creditHistory`)
        .push({
          amount: credits,
          type: "payfast_purchase",
          note: `PayFast: ${data.item_name} (${data.m_payment_id})`,
          timestamp: Date.now(),
        });

      await sendToUser(
        uid,
        "Credits Added! 🎟",
        `${credits} class credits have been added to your account.`,
        "classes",
      );
      console.log(`✓ Added ${credits} credits to ${uid}`);
      res.status(200).send("OK");
      return;
    }

    if (paymentType === "membership") {
      if (!uid) {
        res.status(400).send("Missing uid");
        return;
      }

      await db().ref(`mk2_users/${uid}/membership`).set(refId);
      await db()
        .ref(`mk2_users/${uid}/membershipHistory`)
        .push({
          tier: refId,
          type: "payfast_upgrade",
          note: `PayFast: ${data.item_name} (${data.m_payment_id})`,
          timestamp: Date.now(),
        });

      await sendToUser(
        uid,
        "Membership Upgraded! 🏆",
        `Welcome to ${refId.charAt(0).toUpperCase() + refId.slice(1)} membership!`,
        "profile",
      );
      console.log(`✓ Upgraded ${uid} to ${refId}`);
      res.status(200).send("OK");
      return;
    }

    console.warn("Unknown payment type:", paymentType);
    res.status(400).send("Unknown payment type");
  },
);

export const logPR = onCall({ region: "europe-west1" }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid)
    throw new functions.https.HttpsError("unauthenticated", "Not logged in");

  const data = request.data;
  const required = [
    "exercise_id",
    "value",
    "displayValue",
    "category",
    "level",
  ];
  for (const field of required) {
    if (!data[field]) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Missing ${field}`,
      );
    }
  }

  const userSnap = await db().ref(`mk2_users/${uid}`).once("value");
  const user = userSnap.val();
  if (!user)
    throw new functions.https.HttpsError("not-found", "User not found");

  const prData = {
    uid,
    athlete: user.name || "Unknown",
    gender: user.gender === "female" ? "Female" : "Male",
    level: data.level,
    category: data.category,
    exercise_id: data.exercise_id,
    exercise: data.exercise,
    value: data.value,
    unit: data.unit,
    displayValue: data.displayValue,
    notes: data.notes || "",
    date_logged: data.date_logged,
    timestamp: Date.now(),
  };

  const newRef = await db().ref("pr_logbook").push(prData);
  return { success: true, key: newRef.key };
});

export const sendPushNotification = onCall(
  { region: "europe-west1" },
  async (request) => {
    const { token, title, body, type } = request.data as {
      token: string;
      title: string;
      body: string;
      type?: string;
    };

    if (!token || !title || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "token, title and body are required",
      );
    }

    const message: admin.messaging.Message = {
      token,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        },
        fcmOptions: { link: "/" },
      },
      data: { type: type ?? "general" },
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  },
);

export const sendPushBroadcast = onCall(
  { region: "europe-west1" },
  async (request) => {
    const { tokens, title, body, type } = request.data as {
      tokens: string[];
      title: string;
      body: string;
      type?: string;
    };

    if (!tokens?.length || !title || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "tokens[], title and body are required",
      );
    }

    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }

    let successCount = 0;
    let failureCount = 0;
    const cleanupPromises: Promise<any>[] = [];

    for (const chunk of chunks) {
      const multicast: admin.messaging.MulticastMessage = {
        tokens: chunk,
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
          },
          fcmOptions: { link: "/" },
        },
        data: { type: type ?? "general" },
      };

      const response = await admin.messaging().sendEachForMulticast(multicast);
      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === "messaging/invalid-registration-token" ||
            resp.error?.code === "messaging/registration-token-not-registered")
        ) {
          const badToken = chunk[idx];
          cleanupPromises.push(
            db()
              .ref("mk2_users")
              .once("value")
              .then((snap) =>
                snap.forEach((user) => {
                  if (user.child("fcmToken").val() === badToken) {
                    user.ref.child("fcmToken").remove();
                  }
                }),
              ),
          );
        }
      });
    }

    await Promise.all(cleanupPromises);
    return { success: true, successCount, failureCount };
  },
);

// import * as functions from "firebase-functions/v2";
// import { onRequest, onCall } from "firebase-functions/v2/https";
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import * as admin from "firebase-admin";

// export { payfastWebhook, releaseStalePendingBookings } from "./payfastWebhook";

// admin.initializeApp();

// function db() {
//   return admin.database();
// }

// const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// // ── Updated quota config — matches current membership tier names ──────────────
// const QUOTA: Record<string, number> = {
//   // Current tiers
//   unlimited_12m: 100,
//   unlimited_6m: 100,
//   unlimited_m2m: 100,
//   hybrid_12m: 20,
//   hybrid_6m: 20,
//   hybrid_m2m: 20,
//   u18: 20,
//   // Legacy fallbacks
//   gold: 100,
//   silver: 20,
//   basic: 0,
// };

// async function checkAndIncrementQuota(uid: string): Promise<number> {
//   const userSnap = await db().ref(`mk2_users/${uid}`).once("value");
//   const user = userSnap.val();
//   if (!user)
//     throw new functions.https.HttpsError("not-found", "User not found");

//   const membership = user.membership ?? "basic";

//   // Block only basic (non-member / credits-only)
//   if (membership === "basic") {
//     throw new functions.https.HttpsError("permission-denied", "JOIN_GYM");
//   }

//   const total = QUOTA[membership] ?? 0;
//   if (total === 0) {
//     throw new functions.https.HttpsError("permission-denied", "JOIN_GYM");
//   }

//   const now = new Date();
//   const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

//   const quotaRef = db().ref(`mk2_users/${uid}/aiQuota`);
//   const quotaSnap = await quotaRef.once("value");
//   const quota = quotaSnap.val() || { used: 0, month };

//   if (quota.month !== month) {
//     quota.used = 0;
//     quota.month = month;
//   }

//   if (quota.used >= total) {
//     throw new functions.https.HttpsError(
//       "resource-exhausted",
//       "QUOTA_EXCEEDED",
//     );
//   }

//   const newUsed = quota.used + 1;
//   await quotaRef.set({ used: newUsed, month });

//   return Math.max(0, total - newUsed);
// }

// async function callAnthropic(
//   apiKey: string,
//   systemPrompt: string,
//   messages: any[],
// ): Promise<string> {
//   const response = await fetch(ANTHROPIC_API_URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "x-api-key": apiKey,
//       "anthropic-version": "2023-06-01",
//     },
//     body: JSON.stringify({
//       model: ANTHROPIC_MODEL,
//       max_tokens: 1500,
//       system: systemPrompt,
//       messages,
//     }),
//   });

//   if (!response.ok) {
//     const err = await response.text();
//     console.error("Anthropic API error:", response.status, err);
//     throw new functions.https.HttpsError(
//       "internal",
//       `Anthropic API error: ${response.status}`,
//     );
//   }

//   const data = await response.json();
//   const text = data.content?.find((b: any) => b.type === "text")?.text ?? "";

//   if (!text) {
//     throw new functions.https.HttpsError("internal", "EMPTY_RESPONSE");
//   }

//   return text;
// }

// export const aiChat = onCall(
//   {
//     region: "europe-west1",
//     secrets: ["ANTHROPIC_API_KEY"],
//     timeoutSeconds: 120,
//     memory: "512MiB",
//   },
//   async (request) => {
//     const uid = request.auth?.uid;
//     if (!uid) {
//       throw new functions.https.HttpsError("unauthenticated", "Not logged in");
//     }

//     const { mode, prompt, systemPrompt, fileData, mediaType, isPDF } =
//       request.data as {
//         mode: string;
//         prompt?: string;
//         systemPrompt?: string;
//         fileData?: string;
//         mediaType?: string;
//         isPDF?: boolean;
//       };

//     const quotaRemaining = await checkAndIncrementQuota(uid);

//     const apiKey = process.env.ANTHROPIC_API_KEY;
//     if (!apiKey) {
//       throw new functions.https.HttpsError(
//         "internal",
//         "API key not configured",
//       );
//     }

//     const sysPrompt =
//       systemPrompt ||
//       "You are a helpful fitness assistant at MK2 Rivers Fitness, South Africa.";

//     if (mode === "inbody_extract") {
//       if (!fileData || !mediaType) {
//         throw new functions.https.HttpsError(
//           "invalid-argument",
//           "fileData and mediaType are required for inbody_extract mode",
//         );
//       }

//       const contentBlock = isPDF
//         ? {
//             type: "document",
//             source: {
//               type: "base64",
//               media_type: "application/pdf",
//               data: fileData,
//             },
//           }
//         : {
//             type: "image",
//             source: { type: "base64", media_type: mediaType, data: fileData },
//           };

//       const messages = [
//         {
//           role: "user",
//           content: [
//             contentBlock,
//             {
//               type: "text",
//               text:
//                 prompt ||
//                 `Extract InBody values as JSON with keys: weight, bodyFat, muscleMass, fatMass, visceralFat, totalBodyWater. Respond ONLY with the JSON object.`,
//             },
//           ],
//         },
//       ];

//       const response = await callAnthropic(apiKey, sysPrompt, messages);
//       return { response, quotaRemaining };
//     }

//     if (!prompt) {
//       throw new functions.https.HttpsError(
//         "invalid-argument",
//         "prompt is required for this mode",
//       );
//     }

//     const messages = [{ role: "user", content: prompt }];
//     const response = await callAnthropic(apiKey, sysPrompt, messages);
//     return { response, quotaRemaining };
//   },
// );

// async function writeNotification(
//   uid: string,
//   title: string,
//   body: string,
//   link?: string,
// ) {
//   await db()
//     .ref(`users/${uid}/notifications`)
//     .push({
//       title,
//       body,
//       message: body,
//       timestamp: Date.now(),
//       read: false,
//       createdAt: Date.now(),
//       ...(link ? { link } : {}),
//     });
// }

// async function writeNotificationForAll(
//   uidTokenPairs: { uid: string }[],
//   title: string,
//   body: string,
//   link?: string,
// ) {
//   const writes = uidTokenPairs.map(({ uid }) =>
//     writeNotification(uid, title, body, link),
//   );
//   await Promise.all(writes);
// }

// async function getUserToken(uid: string): Promise<string | null> {
//   const snap = await db().ref(`mk2_users/${uid}/fcmToken`).once("value");
//   return snap.val() as string | null;
// }

// async function getUserPrefs(uid: string): Promise<Record<string, boolean>> {
//   const snap = await db()
//     .ref(`mk2_users/${uid}/notificationPrefs`)
//     .once("value");
//   return snap.val() || {};
// }

// async function sendToTokens(tokens: string[], title: string, body: string) {
//   if (tokens.length === 0) return;

//   const unique = [...new Set(tokens.filter(Boolean))];
//   if (unique.length === 0) return;

//   const message: admin.messaging.MulticastMessage = {
//     notification: { title, body },
//     tokens: unique,
//   };

//   const response = await admin.messaging().sendEachForMulticast(message);

//   const cleanupPromises: Promise<any>[] = [];
//   response.responses.forEach((resp, idx) => {
//     if (
//       !resp.success &&
//       (resp.error?.code === "messaging/invalid-registration-token" ||
//         resp.error?.code === "messaging/registration-token-not-registered")
//     ) {
//       const badToken = unique[idx];
//       cleanupPromises.push(
//         db()
//           .ref("mk2_users")
//           .once("value")
//           .then((snap) =>
//             snap.forEach((user) => {
//               if (user.child("fcmToken").val() === badToken) {
//                 user.ref.child("fcmToken").remove();
//               }
//             }),
//           ),
//       );
//     }
//   });

//   await Promise.all(cleanupPromises);
// }

// async function sendToUser(
//   uid: string,
//   title: string,
//   body: string,
//   link?: string,
// ) {
//   const token = await getUserToken(uid);
//   await writeNotification(uid, title, body, link);
//   if (token) await sendToTokens([token], title, body);
//   console.log(`Notification sent + written for ${uid}`);
// }

// async function sendToAllUsers(
//   title: string,
//   body: string,
//   prefKey?: string,
//   link?: string,
// ) {
//   const usersSnap = await db().ref("mk2_users").once("value");
//   const tokens: string[] = [];
//   const eligibleUids: { uid: string }[] = [];

//   usersSnap.forEach((user) => {
//     if (!user.key) return;
//     if (prefKey) {
//       const prefs = user.child("notificationPrefs").val() || {};
//       if (prefs[prefKey] === false) return;
//     }
//     eligibleUids.push({ uid: user.key });
//     const token = user.child("fcmToken").val() as string | null;
//     if (token) tokens.push(token);
//   });

//   await writeNotificationForAll(eligibleUids, title, body, link);
//   await sendToTokens(tokens, title, body);
// }

// export const onClassBookingCreate = functions.database.onValueCreated(
//   {
//     ref: "/class_bookings/{classDay}/{userId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const userId = event.params.userId;
//     const classDay = event.params.classDay;
//     const bookingData = event.data.val();

//     if (bookingData?.paid === true) {
//       console.log(
//         `onClassBookingCreate: skipping paid booking for ${userId} — payfastNotify handles notification`,
//       );
//       return null;
//     }

//     const prefs = await getUserPrefs(userId);
//     if (prefs.classReminders === false) return null;

//     await sendToUser(
//       userId,
//       "Class Booking Confirmed 🏋️",
//       `You are booked for the class on ${classDay}. See you there!`,
//       "classes",
//     );
//     return null;
//   },
// );

// export const onMessageCreate = functions.database.onValueCreated(
//   {
//     ref: "/rooms/{roomId}/messages/{messageId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const roomId = event.params.roomId;
//     const message = event.data.val() as {
//       uid: string;
//       user?: string;
//       text?: string;
//     };
//     if (!message) return null;

//     const usersSnap = await db().ref("mk2_users").once("value");
//     const tokens: string[] = [];
//     const eligibleUids: { uid: string }[] = [];

//     usersSnap.forEach((user) => {
//       if (!user.key || user.key === message.uid) return;
//       const prefs = user.child("notificationPrefs").val() || {};
//       if (prefs.community === false) return;
//       const joinedRooms = user.child("joinedRooms").val() || {};
//       if (!joinedRooms[roomId]) return;
//       eligibleUids.push({ uid: user.key });
//       const token = user.child("fcmToken").val() as string | null;
//       if (token) tokens.push(token);
//     });

//     const title = `💬 New message in ${roomId}`;
//     const body = message.text
//       ? `${message.user || "Someone"}: ${message.text.slice(0, 100)}`
//       : `${message.user || "Someone"} sent a file`;

//     await writeNotificationForAll(eligibleUids, title, body, "community");
//     await sendToTokens(tokens, title, body);
//     return null;
//   },
// );

// export const onPollCreate = functions.database.onValueCreated(
//   {
//     ref: "/rooms/{roomId}/polls/{pollId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const poll = event.data.val() as { uid: string; question?: string };
//     const roomId = event.params.roomId;
//     if (!poll) return null;

//     const usersSnap = await db().ref("mk2_users").once("value");
//     const tokens: string[] = [];
//     const eligibleUids: { uid: string }[] = [];

//     usersSnap.forEach((user) => {
//       if (!user.key || user.key === poll.uid) return;
//       const prefs = user.child("notificationPrefs").val() || {};
//       if (prefs.community === false) return;
//       const joinedRooms = user.child("joinedRooms").val() || {};
//       if (!joinedRooms[roomId]) return;
//       eligibleUids.push({ uid: user.key });
//       const token = user.child("fcmToken").val() as string | null;
//       if (token) tokens.push(token);
//     });

//     const title = `📊 New Poll in ${roomId}`;
//     const body = poll.question || "A new poll has been posted. Go vote!";

//     await writeNotificationForAll(eligibleUids, title, body, "community");
//     await sendToTokens(tokens, title, body);
//     return null;
//   },
// );

// export const onNewsPostCreate = functions.database.onValueCreated(
//   {
//     ref: "/admin_news/{newsId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const news = event.data.val() as {
//       title?: string;
//       content?: string;
//       status?: string;
//     };

//     if (news?.status === "draft") {
//       console.log(
//         "onNewsPostCreate: skipping draft post — no notification sent",
//       );
//       return null;
//     }

//     await sendToAllUsers(
//       news.title || "📢 News Update",
//       news.content || "Read the latest news from MK Two Rivers.",
//       "gymNews",
//     );
//     return null;
//   },
// );

// export const checkinReminder = onSchedule(
//   {
//     schedule: "0 9 * * 1-6",
//     timeZone: "Africa/Johannesburg",
//     region: "europe-west1",
//   },
//   async () => {
//     const now = new Date(
//       new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }),
//     );
//     const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

//     const bookingsSnap = await db().ref("class_bookings").once("value");
//     if (!bookingsSnap.exists()) return;

//     const bookedUids = new Set<string>();
//     bookingsSnap.forEach((classNode) => {
//       if (!classNode.key?.endsWith(todayKey)) return;
//       classNode.forEach((userNode) => {
//         if (userNode.key) bookedUids.add(userNode.key);
//       });
//     });

//     if (bookedUids.size === 0) {
//       console.log(
//         `checkinReminder: no bookings found for ${todayKey}, skipping.`,
//       );
//       return;
//     }

//     const sends = [...bookedUids].map(async (uid) => {
//       const prefs = await getUserPrefs(uid);
//       if (prefs.classReminders === false) return;
//       await sendToUser(
//         uid,
//         "Class Reminder 🏋️",
//         "You have a class booked today — don't forget to check in at the gym!",
//         "classes",
//       );
//     });

//     await Promise.all(sends);
//   },
// );

// export const payfastNotify = onRequest(
//   { region: "europe-west1" },
//   async (req: any, res: any) => {
//     if (req.method !== "POST") {
//       res.status(405).send("Method not allowed");
//       return;
//     }

//     const data = req.body as Record<string, string>;

//     const paramString = Object.entries(data)
//       .filter(([key]) => key !== "signature")
//       .map(
//         ([k, v]) => `${k}=${encodeURIComponent(v ?? "").replace(/%20/g, "+")}`,
//       )
//       .join("&");

//     const validRes = await fetch(
//       "https://www.payfast.co.za/eng/query/validate",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: paramString,
//       },
//     );
//     const validText = await validRes.text();

//     if (validText !== "VALID") {
//       console.error("PayFast validation failed:", validText);
//       res.status(400).send("Invalid payment");
//       return;
//     }

//     if (data.payment_status !== "COMPLETE") {
//       res.status(200).send("Not complete, ignoring");
//       return;
//     }

//     const uid = data.custom_str1;
//     const refId = data.custom_str2;
//     const credits = parseInt(data.custom_str3 ?? "0");
//     const paymentType = data.custom_str4;

//     if (paymentType === "class_booking") {
//       const bookingId = uid;
//       const price = parseFloat(data.amount);

//       const bookingRef = db().ref(`mk2_bookings/${bookingId}`);
//       const bookingSnap = await bookingRef.get();
//       if (!bookingSnap.exists()) {
//         console.error(`Booking ${bookingId} not found`);
//         res.status(404).send("Booking not found");
//         return;
//       }

//       const booking = bookingSnap.val();
//       if (booking.status !== "pending_payment") {
//         console.log(
//           `Booking ${bookingId} already processed (${booking.status})`,
//         );
//         res.status(200).send("OK");
//         return;
//       }

//       await bookingRef.update({
//         status: "confirmed",
//         paymentId: data.pf_payment_id,
//         paidAt: Date.now(),
//       });

//       const {
//         userId,
//         className,
//         dateKey,
//         time,
//         classId,
//         dayName,
//         category,
//         trainer,
//       } = booking;
//       const userSnap = await db().ref(`mk2_users/${userId}`).get();
//       const userData = userSnap.val();
//       if (!userData) throw new Error("User not found");

//       const safeKey = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, "_");
//       const classBookingKey = `${safeKey(className)}_${dateKey}`;

//       await db().ref(`class_bookings/${classBookingKey}/${userId}`).set({
//         name: userData.name,
//         email: userData.email,
//         bookedAt: Date.now(),
//         paid: true,
//         amount: price,
//       });

//       const newBooking = {
//         name: className,
//         time,
//         dateKey,
//         displayDate: booking.dateDisplay,
//         category: category || "Class",
//         trainer: trainer || "Coach",
//         price,
//       };
//       const existingBookings = userData.bookings || [];
//       await db()
//         .ref(`mk2_users/${userId}/bookings`)
//         .set([...existingBookings, newBooking]);

//       if (classId) {
//         await db()
//           .ref(`admin_classes/${classId}`)
//           .transaction((current) => {
//             if (current) current.bookedCount = (current.bookedCount || 0) + 1;
//             return current;
//           });
//       } else {
//         const classesSnap = await db().ref("admin_classes").once("value");
//         let foundId: string | null = null;
//         classesSnap.forEach((child) => {
//           const cls = child.val();
//           if (
//             cls.name === className &&
//             ((cls.scheduleType === "date" && cls.specificDate === dateKey) ||
//               (cls.scheduleType === "day" && cls.day === dayName))
//           ) {
//             foundId = child.key;
//           }
//         });
//         if (foundId) {
//           await db()
//             .ref(`admin_classes/${foundId}/bookedCount`)
//             .transaction((c) => (c || 0) + 1);
//         }
//       }

//       await sendToUser(
//         userId,
//         "Class Booking Confirmed 🏋️",
//         `Your payment for ${className} on ${booking.dateDisplay} was successful. See you there!`,
//         "classes",
//       );

//       console.log(`✓ Class booking confirmed: ${bookingId} for user ${userId}`);
//       res.status(200).send("OK");
//       return;
//     }

//     if (paymentType === "credits") {
//       if (!uid) {
//         res.status(400).send("Missing uid");
//         return;
//       }

//       const credRef = db().ref(`mk2_users/${uid}/classCredits`);
//       const snap = await credRef.once("value");
//       const current = snap.exists() ? (snap.val() as number) : 0;
//       await credRef.set(current + credits);

//       await db()
//         .ref(`mk2_users/${uid}/creditHistory`)
//         .push({
//           amount: credits,
//           type: "payfast_purchase",
//           note: `PayFast: ${data.item_name} (${data.m_payment_id})`,
//           timestamp: Date.now(),
//         });

//       await sendToUser(
//         uid,
//         "Credits Added! 🎟",
//         `${credits} class credits have been added to your account.`,
//         "classes",
//       );
//       console.log(`✓ Added ${credits} credits to ${uid}`);
//       res.status(200).send("OK");
//       return;
//     }

//     if (paymentType === "membership") {
//       if (!uid) {
//         res.status(400).send("Missing uid");
//         return;
//       }

//       await db().ref(`mk2_users/${uid}/membership`).set(refId);
//       await db()
//         .ref(`mk2_users/${uid}/membershipHistory`)
//         .push({
//           tier: refId,
//           type: "payfast_upgrade",
//           note: `PayFast: ${data.item_name} (${data.m_payment_id})`,
//           timestamp: Date.now(),
//         });

//       await sendToUser(
//         uid,
//         "Membership Upgraded! 🏆",
//         `Welcome to ${refId.charAt(0).toUpperCase() + refId.slice(1)} membership!`,
//         "profile",
//       );
//       console.log(`✓ Upgraded ${uid} to ${refId}`);
//       res.status(200).send("OK");
//       return;
//     }

//     console.warn("Unknown payment type:", paymentType);
//     res.status(400).send("Unknown payment type");
//   },
// );

// export const logPR = onCall({ region: "europe-west1" }, async (request) => {
//   const uid = request.auth?.uid;
//   if (!uid)
//     throw new functions.https.HttpsError("unauthenticated", "Not logged in");

//   const data = request.data;
//   const required = [
//     "exercise_id",
//     "value",
//     "displayValue",
//     "category",
//     "level",
//   ];
//   for (const field of required) {
//     if (!data[field]) {
//       throw new functions.https.HttpsError(
//         "invalid-argument",
//         `Missing ${field}`,
//       );
//     }
//   }

//   const userSnap = await db().ref(`mk2_users/${uid}`).once("value");
//   const user = userSnap.val();
//   if (!user)
//     throw new functions.https.HttpsError("not-found", "User not found");

//   const prData = {
//     uid,
//     athlete: user.name || "Unknown",
//     gender: user.gender === "female" ? "Female" : "Male",
//     level: data.level,
//     category: data.category,
//     exercise_id: data.exercise_id,
//     exercise: data.exercise,
//     value: data.value,
//     unit: data.unit,
//     displayValue: data.displayValue,
//     notes: data.notes || "",
//     date_logged: data.date_logged,
//     timestamp: Date.now(),
//   };

//   const newRef = await db().ref("pr_logbook").push(prData);
//   return { success: true, key: newRef.key };
// });

// export const sendPushNotification = onCall(
//   { region: "europe-west1" },
//   async (request) => {
//     const { token, title, body, type } = request.data as {
//       token: string;
//       title: string;
//       body: string;
//       type?: string;
//     };

//     if (!token || !title || !body) {
//       throw new functions.https.HttpsError(
//         "invalid-argument",
//         "token, title and body are required",
//       );
//     }

//     const message: admin.messaging.Message = {
//       token,
//       notification: { title, body },
//       webpush: {
//         notification: {
//           title,
//           body,
//           icon: "/icon-192.png",
//           badge: "/icon-192.png",
//         },
//         fcmOptions: { link: "/" },
//       },
//       data: { type: type ?? "general" },
//     };

//     const response = await admin.messaging().send(message);
//     return { success: true, messageId: response };
//   },
// );

// export const sendPushBroadcast = onCall(
//   { region: "europe-west1" },
//   async (request) => {
//     const { tokens, title, body, type } = request.data as {
//       tokens: string[];
//       title: string;
//       body: string;
//       type?: string;
//     };

//     if (!tokens?.length || !title || !body) {
//       throw new functions.https.HttpsError(
//         "invalid-argument",
//         "tokens[], title and body are required",
//       );
//     }

//     const chunks: string[][] = [];
//     for (let i = 0; i < tokens.length; i += 500) {
//       chunks.push(tokens.slice(i, i + 500));
//     }

//     let successCount = 0;
//     let failureCount = 0;
//     const cleanupPromises: Promise<any>[] = [];

//     for (const chunk of chunks) {
//       const multicast: admin.messaging.MulticastMessage = {
//         tokens: chunk,
//         notification: { title, body },
//         webpush: {
//           notification: {
//             title,
//             body,
//             icon: "/icon-192.png",
//             badge: "/icon-192.png",
//           },
//           fcmOptions: { link: "/" },
//         },
//         data: { type: type ?? "general" },
//       };

//       const response = await admin.messaging().sendEachForMulticast(multicast);
//       successCount += response.successCount;
//       failureCount += response.failureCount;

//       response.responses.forEach((resp, idx) => {
//         if (
//           !resp.success &&
//           (resp.error?.code === "messaging/invalid-registration-token" ||
//             resp.error?.code === "messaging/registration-token-not-registered")
//         ) {
//           const badToken = chunk[idx];
//           cleanupPromises.push(
//             db()
//               .ref("mk2_users")
//               .once("value")
//               .then((snap) =>
//                 snap.forEach((user) => {
//                   if (user.child("fcmToken").val() === badToken) {
//                     user.ref.child("fcmToken").remove();
//                   }
//                 }),
//               ),
//           );
//         }
//       });
//     }

//     await Promise.all(cleanupPromises);
//     return { success: true, successCount, failureCount };
//   },
// );
