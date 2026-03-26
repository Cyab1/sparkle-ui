import * as functions from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.database();

// ---------- Helper: Send notification to a user ----------
async function sendToUser(uid: string, title: string, body: string) {
  const tokenSnap = await db.ref(`mk2_users/${uid}/fcmToken`).once("value");
  const token = tokenSnap.val() as string | null;
  if (!token) return;

  const payload: admin.messaging.Message = {
    notification: { title, body },
    token: token,
  };

  try {
    await admin.messaging().send(payload);
    console.log(`Notification sent to ${uid}`);
  } catch (err) {
    console.error(`Failed to send to ${uid}:`, err);
  }
}

// ---------- Helper: Send notification to all users ----------
async function sendToAllUsers(title: string, body: string) {
  const usersSnap = await db.ref("mk2_users").once("value");
  const users = usersSnap.val() as Record<string, { fcmToken?: string }> | null;
  if (!users) return;

  const tokens: string[] = [];
  for (const uid in users) {
    const token = users[uid]?.fcmToken;
    if (token) tokens.push(token);
  }

  if (tokens.length === 0) return;

  const payload: admin.messaging.MulticastMessage = {
    notification: { title, body },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(
      `Sent to ${response.successCount} users, failed: ${response.failureCount}`,
    );
  } catch (err) {
    console.error("Failed to send multicast:", err);
  }
}

// ---------- Trigger: New class booking ----------
export const onClassBookingCreate = functions.database.onValueCreated(
  "/class_bookings/{classDay}/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const classDay = event.params.classDay;

    const title = "Class Booking Confirmed";
    const body = `You are booked for the class on ${classDay}. See you there!`;

    await sendToUser(userId, title, body);
  },
);

// ---------- Trigger: New chat message ----------
export const onMessageCreate = functions.database.onValueCreated(
  "/rooms/{roomId}/messages/{messageId}",
  async (event) => {
    const roomId = event.params.roomId;
    const message = event.data.val() as { senderId: string; text?: string };
    if (!message) return;

    const senderId = message.senderId;

    // Get all members of this room (assuming room has a 'members' list)
    const membersSnap = await db.ref(`rooms/${roomId}/members`).once("value");
    const members = membersSnap.val() as Record<string, boolean> | null;
    if (!members) return;

    const memberIds = Object.keys(members);
    for (const uid of memberIds) {
      if (uid !== senderId) {
        await sendToUser(
          uid,
          `New message in room ${roomId}`,
          message.text || "Check the chat",
        );
      }
    }
  },
);

// ---------- Trigger: Admin news post ----------
export const onNewsPostCreate = functions.database.onValueCreated(
  "/admin_news/{newsId}",
  async (event) => {
    const news = event.data.val() as { title?: string; content?: string };
    const title = news.title || "News Update";
    const body = news.content || "Read the latest news from MK Two Rivers.";
    await sendToAllUsers(title, body);
  },
);

// ---------- Scheduled: Daily check‑in reminder (runs at 9 AM) ----------
export const checkinReminder = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Africa/Johannesburg",
  },
  async () => {
    await sendToAllUsers(
      "Check‑in Reminder",
      "Don’t forget to check in at the gym today! Earn points and stay consistent.",
    );
  },
);
