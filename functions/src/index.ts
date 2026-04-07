import * as functions from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.database();

// ── Helper: Write a notification record to Firebase for a user ───────────────
// This makes notifications appear in the Recents list in the app,
// with full read/unread tracking via the useNotifications hook.
async function writeNotification(
  uid: string,
  title: string,
  body: string,
  link?: string,
) {
  await db.ref(`mk2_users/${uid}/notifications`).push({
    title,
    message: body,
    timestamp: Date.now(),
    read: false,
    ...(link ? { link } : {}),
  });
}

// ── Helper: Write a notification record for all users in token list ──────────
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

// ── Helper: Get token for a single user ──────────────────────────────────────
async function getUserToken(uid: string): Promise<string | null> {
  const snap = await db.ref(`mk2_users/${uid}/fcmToken`).once("value");
  return snap.val() as string | null;
}

// ── Helper: Get user notification preferences ─────────────────────────────────
async function getUserPrefs(uid: string): Promise<Record<string, boolean>> {
  const snap = await db.ref(`mk2_users/${uid}/notificationPrefs`).once("value");
  return snap.val() || {};
}

// ── Helper: Send push to a list of tokens ────────────────────────────────────
async function sendToTokens(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;

  const unique = [...new Set(tokens.filter(Boolean))];
  if (unique.length === 0) return;

  const message: admin.messaging.MulticastMessage = {
    notification: { title, body },
    tokens: unique,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Cleanup invalid tokens
  const cleanupPromises: Promise<any>[] = [];
  response.responses.forEach((resp, idx) => {
    if (
      !resp.success &&
      (resp.error?.code === "messaging/invalid-registration-token" ||
        resp.error?.code === "messaging/registration-token-not-registered")
    ) {
      const badToken = unique[idx];
      cleanupPromises.push(
        db
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

// ── Helper: Send push + write in-app notification to a single user ───────────
async function sendToUser(
  uid: string,
  title: string,
  body: string,
  link?: string,
) {
  const token = await getUserToken(uid);

  // Always write the in-app notification record, even if there's no push token
  await writeNotification(uid, title, body, link);

  if (token) {
    await sendToTokens([token], title, body);
  }

  console.log(`Notification sent + written for ${uid}`);
}

// ── Helper: Send push + write in-app notification to all users ───────────────
async function sendToAllUsers(
  title: string,
  body: string,
  prefKey?: string,
  link?: string,
) {
  const usersSnap = await db.ref("mk2_users").once("value");
  const tokens: string[] = [];
  const eligibleUids: { uid: string }[] = [];

  usersSnap.forEach((user) => {
    if (!user.key) return;

    if (prefKey) {
      const prefs = user.child("notificationPrefs").val() || {};
      // Default is true unless explicitly set to false
      if (prefs[prefKey] === false) return;
    }

    eligibleUids.push({ uid: user.key });

    const token = user.child("fcmToken").val() as string | null;
    if (token) tokens.push(token);
  });

  // Write in-app notification records for all eligible users
  await writeNotificationForAll(eligibleUids, title, body, link);

  // Send push to those with tokens
  await sendToTokens(tokens, title, body);
}

// ── Trigger: New class booking ────────────────────────────────────────────────
export const onClassBookingCreate = functions.database.onValueCreated(
  {
    ref: "/class_bookings/{classDay}/{userId}",
    instance: "gym-pro-20ee6-default-rtdb",
    region: "europe-west1",
  },
  async (event: any) => {
    const userId = event.params.userId;
    const classDay = event.params.classDay;

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

// ── Trigger: New chat message ─────────────────────────────────────────────────
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

    const usersSnap = await db.ref("mk2_users").once("value");
    const tokens: string[] = [];
    const eligibleUids: { uid: string }[] = [];

    usersSnap.forEach((user) => {
      if (!user.key || user.key === message.uid) return; // skip sender

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

    // Write in-app notification for each eligible user
    await writeNotificationForAll(eligibleUids, title, body, "community");

    // Send push
    await sendToTokens(tokens, title, body);

    return null;
  },
);

// ── Trigger: New poll created ─────────────────────────────────────────────────
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

    const usersSnap = await db.ref("mk2_users").once("value");
    const tokens: string[] = [];
    const eligibleUids: { uid: string }[] = [];

    usersSnap.forEach((user) => {
      if (!user.key || user.key === poll.uid) return; // skip creator

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

// ── Trigger: Admin news post ──────────────────────────────────────────────────
export const onNewsPostCreate = functions.database.onValueCreated(
  {
    ref: "/admin_news/{newsId}",
    instance: "gym-pro-20ee6-default-rtdb",
    region: "europe-west1",
  },
  async (event: any) => {
    const news = event.data.val() as { title?: string; content?: string };
    await sendToAllUsers(
      news.title || "📢 News Update",
      news.content || "Read the latest news from MK Two Rivers.",
      "gymNews",
    );
    return null;
  },
);

// ── Scheduled: Daily check-in reminder at 9 AM SAST ──────────────────────────
export const checkinReminder = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Africa/Johannesburg",
  },
  async () => {
    await sendToAllUsers(
      "Check-in Reminder ✅",
      "Don't forget to check in at the gym today! Earn points and stay consistent.",
      "checkinStreaks",
    );
  },
);

// ── PayFast ITN Webhook ───────────────────────────────────────────────────────
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

    if (!uid) {
      res.status(400).send("Missing uid");
      return;
    }

    if (paymentType === "credits") {
      const credRef = db.ref(`mk2_users/${uid}/classCredits`);
      const snap = await credRef.once("value");
      const current = snap.exists() ? (snap.val() as number) : 0;
      await credRef.set(current + credits);

      await db.ref(`mk2_users/${uid}/creditHistory`).push({
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
    } else if (paymentType === "membership") {
      await db.ref(`mk2_users/${uid}/membership`).set(refId);

      await db.ref(`mk2_users/${uid}/membershipHistory`).push({
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
    }

    res.status(200).send("OK");
  },
);

// import * as functions from "firebase-functions/v2";
// import { onRequest } from "firebase-functions/v2/https";
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import * as admin from "firebase-admin";

// admin.initializeApp();
// const db = admin.database();

// // ── Helper: Send notification to a single user ────────────────────────────────
// async function sendToUser(uid: string, title: string, body: string) {
//   const tokenSnap = await db.ref(`mk2_users/${uid}/fcmToken`).once("value");
//   const token = tokenSnap.val() as string | null;
//   if (!token) return;

//   const payload: admin.messaging.Message = {
//     notification: { title, body },
//     token,
//   };

//   try {
//     await admin.messaging().send(payload);
//     console.log(`Notification sent to ${uid}`);
//   } catch (err) {
//     console.error(`Failed to send to ${uid}:`, err);
//   }
// }

// // ── Helper: Send notification to all users ────────────────────────────────────
// async function sendToAllUsers(title: string, body: string) {
//   const usersSnap = await db.ref("mk2_users").once("value");
//   const users = usersSnap.val() as Record<string, { fcmToken?: string }> | null;
//   if (!users) return;

//   const tokens: string[] = [];
//   for (const uid in users) {
//     const token = users[uid]?.fcmToken;
//     if (token) tokens.push(token);
//   }
//   if (tokens.length === 0) return;

//   const payload: admin.messaging.MulticastMessage = {
//     notification: { title, body },
//     tokens,
//   };

//   try {
//     const response = await admin.messaging().sendEachForMulticast(payload);
//     console.log(
//       `Sent to ${response.successCount}, failed: ${response.failureCount}`,
//     );
//   } catch (err) {
//     console.error("Multicast failed:", err);
//   }
// }

// // ── Trigger: New class booking ────────────────────────────────────────────────
// export const onClassBookingCreate = functions.database.onValueCreated(
//   {
//     ref: "/class_bookings/{classDay}/{userId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const userId = event.params.userId;
//     const classDay = event.params.classDay;
//     await sendToUser(
//       userId,
//       "Class Booking Confirmed",
//       `You are booked for the class on ${classDay}. See you there!`,
//     );
//   },
// );

// // ── Trigger: New chat message ─────────────────────────────────────────────────
// export const onMessageCreate = functions.database.onValueCreated(
//   {
//     ref: "/rooms/{roomId}/messages/{messageId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const roomId = event.params.roomId;
//     const message = event.data.val() as { senderId: string; text?: string };
//     if (!message) return;

//     const membersSnap = await db.ref(`rooms/${roomId}/members`).once("value");
//     const members = membersSnap.val() as Record<string, boolean> | null;
//     if (!members) return;

//     for (const uid of Object.keys(members)) {
//       if (uid !== message.senderId) {
//         await sendToUser(
//           uid,
//           `New message in room ${roomId}`,
//           message.text || "Check the chat",
//         );
//       }
//     }
//   },
// );

// // ── Trigger: Admin news post ──────────────────────────────────────────────────
// export const onNewsPostCreate = functions.database.onValueCreated(
//   {
//     ref: "/admin_news/{newsId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const news = event.data.val() as { title?: string; content?: string };
//     await sendToAllUsers(
//       news.title || "News Update",
//       news.content || "Read the latest news from MK Two Rivers.",
//     );
//   },
// );

// // ── Scheduled: Daily check-in reminder at 9 AM SAST ──────────────────────────
// export const checkinReminder = onSchedule(
//   {
//     schedule: "0 9 * * *",
//     timeZone: "Africa/Johannesburg",
//   },
//   async () => {
//     await sendToAllUsers(
//       "Check-in Reminder",
//       "Don't forget to check in at the gym today! Earn points and stay consistent.",
//     );
//   },
// );

// // ── PayFast ITN Webhook ───────────────────────────────────────────────────────
// export const payfastNotify = onRequest(
//   { region: "europe-west1" },
//   async (req: any, res: any) => {
//     if (req.method !== "POST") {
//       res.status(405).send("Method not allowed");
//       return;
//     }

//     const data = req.body as Record<string, string>;

//     // ── Validate with PayFast ─────────────────────────────────────────────
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

//     // ── Only process completed payments ───────────────────────────────────
//     if (data.payment_status !== "COMPLETE") {
//       res.status(200).send("Not complete, ignoring");
//       return;
//     }

//     // ── Extract our custom fields ─────────────────────────────────────────
//     const uid = data.custom_str1;
//     const refId = data.custom_str2;
//     const credits = parseInt(data.custom_str3 ?? "0");
//     const paymentType = data.custom_str4;

//     if (!uid) {
//       res.status(400).send("Missing uid");
//       return;
//     }

//     // ── Update Firebase ───────────────────────────────────────────────────
//     if (paymentType === "credits") {
//       const credRef = db.ref(`mk2_users/${uid}/classCredits`);
//       const snap = await credRef.once("value");
//       const current = snap.exists() ? (snap.val() as number) : 0;
//       await credRef.set(current + credits);

//       await db.ref(`mk2_users/${uid}/creditHistory`).push({
//         amount: credits,
//         type: "payfast_purchase",
//         note: `PayFast: ${data.item_name} (${data.m_payment_id})`,
//         timestamp: Date.now(),
//       });

//       await sendToUser(
//         uid,
//         "Credits Added! 🎟",
//         `${credits} class credits have been added to your account.`,
//       );

//       console.log(`✓ Added ${credits} credits to ${uid}`);
//     } else if (paymentType === "membership") {
//       await db.ref(`mk2_users/${uid}/membership`).set(refId);

//       await db.ref(`mk2_users/${uid}/membershipHistory`).push({
//         tier: refId,
//         type: "payfast_upgrade",
//         note: `PayFast: ${data.item_name} (${data.m_payment_id})`,
//         timestamp: Date.now(),
//       });

//       await sendToUser(
//         uid,
//         "Membership Upgraded! 🏆",
//         `Welcome to ${refId.charAt(0).toUpperCase() + refId.slice(1)} membership!`,
//       );

//       console.log(`✓ Upgraded ${uid} to ${refId}`);
//     }

//     res.status(200).send("OK");
//   },
// );
