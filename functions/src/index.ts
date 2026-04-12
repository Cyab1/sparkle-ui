import * as functions from "firebase-functions/v2";
import { onRequest, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.database();

// ── Helper: Write a notification record for a user ───────────────────────────
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

// ── Helper: Write notifications for multiple users ──────────────────────────
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

// ── Helper: Get FCM token for a single user ─────────────────────────────────
async function getUserToken(uid: string): Promise<string | null> {
  const snap = await db.ref(`mk2_users/${uid}/fcmToken`).once("value");
  return snap.val() as string | null;
}

// ── Helper: Get user notification preferences ────────────────────────────────
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

// ── Helper: Send push + in‑app to a single user ──────────────────────────────
async function sendToUser(
  uid: string,
  title: string,
  body: string,
  link?: string,
) {
  const token = await getUserToken(uid);
  await writeNotification(uid, title, body, link);
  if (token) {
    await sendToTokens([token], title, body);
  }
  console.log(`Notification sent + written for ${uid}`);
}

// ── Helper: Send push + in‑app to all users (with preference filter) ─────────
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
      if (prefs[prefKey] === false) return;
    }

    eligibleUids.push({ uid: user.key });

    const token = user.child("fcmToken").val() as string | null;
    if (token) tokens.push(token);
  });

  await writeNotificationForAll(eligibleUids, title, body, link);
  await sendToTokens(tokens, title, body);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Existing triggers (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

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

    const usersSnap = await db.ref("mk2_users").once("value");
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
    const news = event.data.val() as { title?: string; content?: string };
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

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATED PayFast Webhook – supports class_booking, credits, membership
// ─────────────────────────────────────────────────────────────────────────────
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

    // ── CLASS BOOKING ──────────────────────────────────────────────────────
    if (paymentType === "class_booking") {
      const bookingId = uid;
      const price = parseFloat(data.amount);

      const bookingRef = db.ref(`mk2_bookings/${bookingId}`);
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

      // Confirm the booking
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
      const userSnap = await db.ref(`mk2_users/${userId}`).get();
      const userData = userSnap.val();
      if (!userData) throw new Error("User not found");

      const safeKey = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, "_");
      const classBookingKey = `${safeKey(className)}_${dateKey}`;
      await db.ref(`class_bookings/${classBookingKey}/${userId}`).set({
        name: userData.name,
        email: userData.email,
        bookedAt: Date.now(),
        paid: true,
        amount: price,
      });

      const newBooking = {
        name: className,
        time: time,
        dateKey: dateKey,
        displayDate: booking.dateDisplay,
        category: category || "Class",
        trainer: trainer || "Coach",
        price: price,
      };
      const existingBookings = userData.bookings || [];
      await db
        .ref(`mk2_users/${userId}/bookings`)
        .set([...existingBookings, newBooking]);

      // Increment class bookedCount
      if (classId) {
        const classRef = db.ref(`admin_classes/${classId}`);
        await classRef.transaction((current) => {
          if (current) {
            current.bookedCount = (current.bookedCount || 0) + 1;
          }
          return current;
        });
      } else {
        // Fallback: search by name and date – fixed TypeScript error
        const classesSnap = await db.ref("admin_classes").once("value");
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
          await db
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

    // ── CREDITS PURCHASE ───────────────────────────────────────────────────
    if (paymentType === "credits") {
      if (!uid) {
        res.status(400).send("Missing uid");
        return;
      }
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
      res.status(200).send("OK");
      return;
    }

    // ── MEMBERSHIP UPGRADE ─────────────────────────────────────────────────
    if (paymentType === "membership") {
      if (!uid) {
        res.status(400).send("Missing uid");
        return;
      }
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
      res.status(200).send("OK");
      return;
    }

    console.warn("Unknown payment type:", paymentType);
    res.status(400).send("Unknown payment type");
  },
);

// ─────────────────────────────────────────────────────────────────────────────
//  NEW: Log Personal Record (callable function)
// ─────────────────────────────────────────────────────────────────────────────
export const logPR = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
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
      if (!data[field])
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Missing ${field}`,
        );
    }

    const userSnap = await db.ref(`mk2_users/${uid}`).once("value");
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

    const newRef = await db.ref("pr_logbook").push(prData);
    return { success: true, key: newRef.key };
  },
);

// import * as functions from "firebase-functions/v2";
// import { onRequest } from "firebase-functions/v2/https";
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import * as admin from "firebase-admin";

// admin.initializeApp();
// const db = admin.database();

// // ── Helper: Write a notification record for a user ───────────────────────────
// async function writeNotification(
//   uid: string,
//   title: string,
//   body: string,
//   link?: string,
// ) {
//   await db.ref(`mk2_users/${uid}/notifications`).push({
//     title,
//     message: body,
//     timestamp: Date.now(),
//     read: false,
//     ...(link ? { link } : {}),
//   });
// }

// // ── Helper: Write notifications for multiple users ──────────────────────────
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

// // ── Helper: Get FCM token for a single user ─────────────────────────────────
// async function getUserToken(uid: string): Promise<string | null> {
//   const snap = await db.ref(`mk2_users/${uid}/fcmToken`).once("value");
//   return snap.val() as string | null;
// }

// // ── Helper: Get user notification preferences ────────────────────────────────
// async function getUserPrefs(uid: string): Promise<Record<string, boolean>> {
//   const snap = await db.ref(`mk2_users/${uid}/notificationPrefs`).once("value");
//   return snap.val() || {};
// }

// // ── Helper: Send push to a list of tokens ────────────────────────────────────
// async function sendToTokens(tokens: string[], title: string, body: string) {
//   if (tokens.length === 0) return;

//   const unique = [...new Set(tokens.filter(Boolean))];
//   if (unique.length === 0) return;

//   const message: admin.messaging.MulticastMessage = {
//     notification: { title, body },
//     tokens: unique,
//   };

//   const response = await admin.messaging().sendEachForMulticast(message);

//   // Cleanup invalid tokens
//   const cleanupPromises: Promise<any>[] = [];
//   response.responses.forEach((resp, idx) => {
//     if (
//       !resp.success &&
//       (resp.error?.code === "messaging/invalid-registration-token" ||
//         resp.error?.code === "messaging/registration-token-not-registered")
//     ) {
//       const badToken = unique[idx];
//       cleanupPromises.push(
//         db
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

// // ── Helper: Send push + in‑app to a single user ──────────────────────────────
// async function sendToUser(
//   uid: string,
//   title: string,
//   body: string,
//   link?: string,
// ) {
//   const token = await getUserToken(uid);
//   await writeNotification(uid, title, body, link);
//   if (token) {
//     await sendToTokens([token], title, body);
//   }
//   console.log(`Notification sent + written for ${uid}`);
// }

// // ── Helper: Send push + in‑app to all users (with preference filter) ─────────
// async function sendToAllUsers(
//   title: string,
//   body: string,
//   prefKey?: string,
//   link?: string,
// ) {
//   const usersSnap = await db.ref("mk2_users").once("value");
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

// // ─────────────────────────────────────────────────────────────────────────────
// //  Existing triggers (unchanged)
// // ─────────────────────────────────────────────────────────────────────────────

// export const onClassBookingCreate = functions.database.onValueCreated(
//   {
//     ref: "/class_bookings/{classDay}/{userId}",
//     instance: "gym-pro-20ee6-default-rtdb",
//     region: "europe-west1",
//   },
//   async (event: any) => {
//     const userId = event.params.userId;
//     const classDay = event.params.classDay;

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

//     const usersSnap = await db.ref("mk2_users").once("value");
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

//     const usersSnap = await db.ref("mk2_users").once("value");
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
//     const news = event.data.val() as { title?: string; content?: string };
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
//     schedule: "0 9 * * *",
//     timeZone: "Africa/Johannesburg",
//   },
//   async () => {
//     await sendToAllUsers(
//       "Check-in Reminder ✅",
//       "Don't forget to check in at the gym today! Earn points and stay consistent.",
//       "checkinStreaks",
//     );
//   },
// );

// // ─────────────────────────────────────────────────────────────────────────────
// //  UPDATED PayFast Webhook – supports class_booking, credits, membership
// // ─────────────────────────────────────────────────────────────────────────────
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

//     // ── CLASS BOOKING ──────────────────────────────────────────────────────
//     if (paymentType === "class_booking") {
//       const bookingId = uid;
//       const price = parseFloat(data.amount);

//       const bookingRef = db.ref(`mk2_bookings/${bookingId}`);
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

//       // Confirm the booking
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
//       const userSnap = await db.ref(`mk2_users/${userId}`).get();
//       const userData = userSnap.val();
//       if (!userData) throw new Error("User not found");

//       const safeKey = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, "_");
//       const classBookingKey = `${safeKey(className)}_${dateKey}`;
//       await db.ref(`class_bookings/${classBookingKey}/${userId}`).set({
//         name: userData.name,
//         email: userData.email,
//         bookedAt: Date.now(),
//         paid: true,
//         amount: price,
//       });

//       const newBooking = {
//         name: className,
//         time: time,
//         dateKey: dateKey,
//         displayDate: booking.dateDisplay,
//         category: category || "Class",
//         trainer: trainer || "Coach",
//         price: price,
//       };
//       const existingBookings = userData.bookings || [];
//       await db
//         .ref(`mk2_users/${userId}/bookings`)
//         .set([...existingBookings, newBooking]);

//       // Increment class bookedCount
//       if (classId) {
//         const classRef = db.ref(`admin_classes/${classId}`);
//         await classRef.transaction((current) => {
//           if (current) {
//             current.bookedCount = (current.bookedCount || 0) + 1;
//           }
//           return current;
//         });
//       } else {
//         // Fallback: search by name and date – fixed TypeScript error
//         const classesSnap = await db.ref("admin_classes").once("value");
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
//           await db
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

//     // ── CREDITS PURCHASE ───────────────────────────────────────────────────
//     if (paymentType === "credits") {
//       if (!uid) {
//         res.status(400).send("Missing uid");
//         return;
//       }
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
//         "classes",
//       );
//       console.log(`✓ Added ${credits} credits to ${uid}`);
//       res.status(200).send("OK");
//       return;
//     }

//     // ── MEMBERSHIP UPGRADE ─────────────────────────────────────────────────
//     if (paymentType === "membership") {
//       if (!uid) {
//         res.status(400).send("Missing uid");
//         return;
//       }
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
