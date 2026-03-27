import * as functions from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.database();

// ── Helper: Send notification to a single user ────────────────────────────────
async function sendToUser(uid: string, title: string, body: string) {
  const tokenSnap = await db.ref(`mk2_users/${uid}/fcmToken`).once("value");
  const token = tokenSnap.val() as string | null;
  if (!token) return;

  const payload: admin.messaging.Message = {
    notification: { title, body },
    token,
  };

  try {
    await admin.messaging().send(payload);
    console.log(`Notification sent to ${uid}`);
  } catch (err) {
    console.error(`Failed to send to ${uid}:`, err);
  }
}

// ── Helper: Send notification to all users ────────────────────────────────────
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
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(
      `Sent to ${response.successCount}, failed: ${response.failureCount}`,
    );
  } catch (err) {
    console.error("Multicast failed:", err);
  }
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
    await sendToUser(
      userId,
      "Class Booking Confirmed",
      `You are booked for the class on ${classDay}. See you there!`,
    );
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
    const message = event.data.val() as { senderId: string; text?: string };
    if (!message) return;

    const membersSnap = await db.ref(`rooms/${roomId}/members`).once("value");
    const members = membersSnap.val() as Record<string, boolean> | null;
    if (!members) return;

    for (const uid of Object.keys(members)) {
      if (uid !== message.senderId) {
        await sendToUser(
          uid,
          `New message in room ${roomId}`,
          message.text || "Check the chat",
        );
      }
    }
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
      news.title || "News Update",
      news.content || "Read the latest news from MK Two Rivers.",
    );
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
      "Check-in Reminder",
      "Don't forget to check in at the gym today! Earn points and stay consistent.",
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

    // ── Validate with PayFast ─────────────────────────────────────────────
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

    // ── Only process completed payments ───────────────────────────────────
    if (data.payment_status !== "COMPLETE") {
      res.status(200).send("Not complete, ignoring");
      return;
    }

    // ── Extract our custom fields ─────────────────────────────────────────
    const uid = data.custom_str1;
    const refId = data.custom_str2;
    const credits = parseInt(data.custom_str3 ?? "0");
    const paymentType = data.custom_str4;

    if (!uid) {
      res.status(400).send("Missing uid");
      return;
    }

    // ── Update Firebase ───────────────────────────────────────────────────
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
      );

      console.log(`✓ Upgraded ${uid} to ${refId}`);
    }

    res.status(200).send("OK");
  },
);
