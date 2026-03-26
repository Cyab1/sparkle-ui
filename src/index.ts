import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.database();
const fcm = admin.messaging();

// ── Helper: send to a single FCM token ───────────────────────────────────────
async function sendToUser(
  uid: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  try {
    const snap = await db.ref(`mk2_users/${uid}/fcmToken`).get();
    const token: string | null = snap.val();
    if (!token) return;

    await fcm.send({
      token,
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        },
      },
    });
  } catch (err) {
    console.error(`Failed to send to ${uid}:`, err);
  }
}

// ── Helper: send to ALL users (broadcast) ────────────────────────────────────
async function sendToAll(
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  try {
    const snap = await db.ref("mk2_users").get();
    if (!snap.exists()) return;

    const users = snap.val() as Record<string, any>;
    const tokens: string[] = [];

    Object.values(users).forEach((u) => {
      if (u.fcmToken) tokens.push(u.fcmToken);
    });

    if (tokens.length === 0) return;

    // FCM supports up to 500 tokens per multicast
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      await fcm.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: data || {},
        webpush: {
          notification: {
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
          },
        },
      });
    }
  } catch (err) {
    console.error("Broadcast failed:", err);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER 1 — Class booking confirmed
// Fires when a booking is written to mk2_users/{uid}/bookings/{bookingId}
// ════════════════════════════════════════════════════════════════════════════
export const onBookingConfirmed = functions.database
  .ref("mk2_users/{uid}/bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const { uid } = context.params;
    const booking = snap.val();

    if (!booking) return;

    const className = booking.className || "your class";
    const time = booking.time || "";

    await sendToUser(
      uid,
      "Booking Confirmed ✅",
      `You're booked for ${className}${time ? ` at ${time}` : ""}. See you there!`,
      { type: "booking", bookingId: context.params.bookingId },
    );
  });

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER 2 — New chat message in a room
// Fires when a message is written to rooms/{roomName}/messages/{msgId}
// Notifies all members of that room EXCEPT the sender
// ════════════════════════════════════════════════════════════════════════════
export const onChatMessage = functions.database
  .ref("rooms/{roomName}/messages/{msgId}")
  .onCreate(async (snap, context) => {
    const { roomName } = context.params;
    const message = snap.val();

    if (!message || !message.uid) return;

    const senderUid = message.uid;
    const senderName = message.user || "Someone";
    const text =
      message.text ||
      (message.type === "image" ? "📷 Sent an image" : "📹 Sent a video");

    // Find all users who have joined this room
    const usersSnap = await db.ref("mk2_users").get();
    if (!usersSnap.exists()) return;

    const users = usersSnap.val() as Record<string, any>;
    const notifyPromises: Promise<void>[] = [];

    Object.entries(users).forEach(([uid, userData]) => {
      // Skip sender
      if (uid === senderUid) return;

      // Only notify if user has joined this room
      const joinedRooms = userData.joinedRooms || {};
      if (!joinedRooms[roomName]) return;

      notifyPromises.push(
        sendToUser(
          uid,
          `${senderName} in ${roomName.replace(/[💬🏆🔥💼]\s*/g, "")}`,
          text.length > 80 ? text.substring(0, 80) + "…" : text,
          { type: "chat", room: roomName },
        ),
      );
    });

    await Promise.all(notifyPromises);
  });

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER 3 — Admin announcement / news post
// Fires when a new item is written to mk2_news/{newsId}
// Broadcasts to ALL users
// ════════════════════════════════════════════════════════════════════════════
export const onNewAnnouncement = functions.database
  .ref("mk2_news/{newsId}")
  .onCreate(async (snap) => {
    const news = snap.val();
    if (!news) return;

    const title = news.title || "New from MK Two Rivers";
    const preview = news.content
      ? news.content.length > 80
        ? news.content.substring(0, 80) + "…"
        : news.content
      : "Tap to read more";

    await sendToAll(`📢 ${title}`, preview, { type: "announcement" });
  });

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER 4 — Check-in reminder
// Runs every day at 7:00 AM SAST (05:00 UTC)
// Sends to users who haven't checked in today
// ════════════════════════════════════════════════════════════════════════════
export const dailyCheckinReminder = functions.pubsub
  .schedule("0 5 * * *") // 07:00 SAST daily
  .timeZone("Africa/Johannesburg")
  .onRun(async () => {
    const today = new Date().toDateString();
    const usersSnap = await db.ref("mk2_users").get();

    if (!usersSnap.exists()) return;

    const users = usersSnap.val() as Record<string, any>;
    const notifyPromises: Promise<void>[] = [];

    Object.entries(users).forEach(([uid, userData]) => {
      if (!userData.fcmToken) return;

      // Check if user has already checked in today
      const checkIns: any[] = Array.isArray(userData.checkIns)
        ? userData.checkIns
        : [];
      const checkedInToday = checkIns.some(
        (c) => new Date(c.timestamp || c.date || c).toDateString() === today,
      );

      if (!checkedInToday) {
        notifyPromises.push(
          sendToUser(
            uid,
            "Ready to train today? 💪",
            "Don't forget to check in at MK Two Rivers. Your streak is waiting!",
            { type: "checkin_reminder" },
          ),
        );
      }
    });

    await Promise.all(notifyPromises);
    console.log(`Check-in reminders sent to ${notifyPromises.length} users`);
  });
