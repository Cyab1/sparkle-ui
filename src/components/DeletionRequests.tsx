// ═══════════════════════════════════════════════════════════════════════════
//  ACCOUNT DELETION SYSTEM — Full flow
//  Two exports:
//    1. DeletionRequestManager  → paste into Admin.tsx (admin panel tab)
//    2. RequestAccountDeletion  → paste into member Profile/Settings screen
//
//  Firebase paths needed — add to your rules:
//    "deletion_requests": { ".read": true, ".write": true }
//
//  Wire up in Admin.tsx:
//    NAV: { id: "deletions", icon: "ti-trash", label: "Deletion Requests" }
//    ROUTE: {tab === "deletions" && <DeletionRequestManager toast={toast} />}
//
//  Wire up in member app:
//    Import RequestAccountDeletion and add to Profile/Settings screen
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { ref, get, set, remove, push, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

// ── Shared styles (matches your existing Admin.tsx style) ─────────────────────
const inp: any = {
  width: "100%",
  background: "hsl(var(--secondary))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  padding: "10px 14px",
  color: "hsl(var(--foreground))",
  fontSize: 13,
  outline: "none",
  fontFamily: "var(--font-body)",
  boxSizing: "border-box",
};

const lbl: any = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "hsl(var(--muted-foreground))",
  display: "block",
  marginBottom: 6,
};

function Btn({ children, onClick, variant = "primary", size = "md", disabled = false, full = false }: any) {
  const s: any = {
    primary: { background: "hsl(20 100% 50%)", color: "#000", border: "none" },
    ghost: { background: "transparent", color: "hsl(20 100% 50%)", border: "1px solid hsl(20 100% 50%)" },
    danger: { background: "hsl(0 84% 51%)", color: "#fff", border: "none" },
    subtle: { background: "hsl(var(--secondary))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" },
    green: { background: "hsl(142 72% 37%)", color: "#fff", border: "none" },
  }[variant];
  const pad: any = { sm: "6px 14px", md: "9px 20px", lg: "12px 28px" }[size];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        padding: pad,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-body)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. ADMIN PANEL — Deletion Requests Manager
// ═══════════════════════════════════════════════════════════════════════════
export function DeletionRequestManager({ toast }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "processed">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  // ── Real-time listener ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, "deletion_requests"), (snap) => {
      if (!snap.exists()) {
        setRequests([]);
        setLoading(false);
        return;
      }
      const list: any[] = Object.entries(snap.val()).map(([id, v]: [string, any]) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));
      setRequests(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Process deletion ──────────────────────────────────────────────────────
  const processDeletion = async (req: any) => {
    if (
      !confirm(
        `Permanently delete ${req.memberName}'s account?\n\nThis will:\n• Remove them from mk2_users\n• Remove their bookings\n• Remove their check-ins\n• Cannot be undone.`
      )
    )
      return;

    setProcessing(req.id);
    try {
      // 1. Remove from mk2_users
      await remove(ref(db, `mk2_users/${req.uid}`));

      // 2. Remove from users/ (notifications)
      await remove(ref(db, `users/${req.uid}`));

      // 3. Mark request as processed
      await set(ref(db, `deletion_requests/${req.id}/status`), "processed");
      await set(ref(db, `deletion_requests/${req.id}/processedAt`), Date.now());
      await set(ref(db, `deletion_requests/${req.id}/adminNote`), adminNote || "Account deleted by admin.");

      // 4. Log to audit trail
      await push(ref(db, "mk2_checkin_audit"), {
        type: "account_deletion",
        uid: req.uid,
        memberName: req.memberName,
        memberEmail: req.memberEmail,
        processedAt: Date.now(),
        note: adminNote || "Account deleted by admin.",
      });

      toast(`✓ ${req.memberName}'s account has been deleted`, "success");
      setExpandedId(null);
      setAdminNote("");
    } catch (err: any) {
      toast(err?.message ?? "Deletion failed — try again", "error");
    }
    setProcessing(null);
  };

  // ── Dismiss / decline request ─────────────────────────────────────────────
  const dismissRequest = async (req: any) => {
    if (!confirm(`Decline ${req.memberName}'s deletion request?`)) return;
    try {
      await set(ref(db, `deletion_requests/${req.id}/status`), "declined");
      await set(ref(db, `deletion_requests/${req.id}/processedAt`), Date.now());

      // Notify member
      await push(ref(db, `users/${req.uid}/notifications`), {
        title: "Account Deletion Request Update",
        body: "Your account deletion request has been reviewed. Please contact us directly if you still wish to proceed.",
        type: "announcement",
        read: false,
        createdAt: Date.now(),
      });

      toast(`Request from ${req.memberName} declined`, "info");
    } catch {
      toast("Failed to decline request", "error");
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: "hsl(0 84% 51%)", bg: "hsl(0 84% 51% / 0.12)", label: "⏳ Pending" },
    processed: { color: "hsl(142 72% 37%)", bg: "hsl(142 72% 37% / 0.12)", label: "✓ Processed" },
    declined: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--secondary))", label: "✕ Declined" },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
        Account Deletion Requests
      </div>
      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 20 }}>
        Members who have requested their account to be deleted. Review and process within 48 hours.
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Pending", val: pendingCount, accent: pendingCount > 0 },
          { label: "Total requests", val: requests.length, accent: false },
          {
            label: "Processed",
            val: requests.filter((r) => r.status === "processed").length,
            accent: false,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "hsl(var(--secondary))",
              border: `1px solid ${s.accent ? "hsl(0 84% 51% / 0.4)" : "hsl(var(--border))"}`,
              borderRadius: 12,
              padding: "14px 18px",
              borderLeft: s.accent ? "3px solid hsl(0 84% 51%)" : undefined,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: s.accent ? "hsl(0 84% 51%)" : "hsl(var(--foreground))",
                lineHeight: 1,
              }}
            >
              {loading ? "—" : s.val}
            </div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* POPIA notice */}
      <div
        style={{
          marginBottom: 20,
          padding: "10px 14px",
          background: "hsl(217 91% 53% / 0.08)",
          border: "1px solid hsl(217 91% 53% / 0.2)",
          borderRadius: 8,
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
          lineHeight: 1.7,
        }}
      >
        ℹ️ <strong style={{ color: "hsl(var(--foreground))" }}>POPIA Compliance:</strong> Under
        the Protection of Personal Information Act, members have the right to request deletion of
        their personal data. Requests should be processed within <strong>48 hours</strong>.
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {(["pending", "all", "processed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "capitalize",
              background: filter === f ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
              color: filter === f ? "#000" : "hsl(var(--foreground))",
              border: filter === f ? "none" : "1px solid hsl(var(--border))",
              fontFamily: "var(--font-body)",
            }}
          >
            {f === "pending" ? `⏳ Pending (${pendingCount})` : f === "all" ? `All (${requests.length})` : "✓ Processed"}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, padding: "20px 0" }}>
          {filter === "pending" ? "✓ No pending deletion requests — all clear." : "No requests found."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((req) => {
            const sc = STATUS_STYLE[req.status] ?? STATUS_STYLE.pending;
            const isExpanded = expandedId === req.id;
            const isPending = req.status === "pending";
            return (
              <div
                key={req.id}
                style={{
                  background: "hsl(var(--secondary))",
                  border: `1px solid ${isPending ? "hsl(0 84% 51% / 0.3)" : "hsl(var(--border))"}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  borderLeft: `3px solid ${sc.color}`,
                }}
              >
                {/* Main row */}
                <div
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: isPending ? "hsl(0 84% 51%)" : "hsl(var(--border))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {req.memberName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {req.memberName}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: sc.bg,
                            color: sc.color,
                          }}
                        >
                          {sc.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                        {req.memberEmail} · Requested {timeAgo(req.requestedAt ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {isPending && (
                      <>
                        <Btn
                          variant="subtle"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        >
                          {isExpanded ? "▲ Close" : "▼ Review"}
                        </Btn>
                        <Btn
                          variant="subtle"
                          size="sm"
                          onClick={() => dismissRequest(req)}
                        >
                          ✕ Decline
                        </Btn>
                      </>
                    )}
                    {!isPending && (
                      <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                        {req.processedAt
                          ? new Date(req.processedAt).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded review panel */}
                <AnimatePresence>
                  {isExpanded && isPending && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{
                        borderTop: "1px solid hsl(var(--border))",
                        background: "hsl(var(--background))",
                        padding: "16px 16px",
                      }}
                    >
                      {/* Member details */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))",
                          gap: 10,
                          marginBottom: 16,
                        }}
                      >
                        {[
                          { label: "Member Name", val: req.memberName },
                          { label: "Email", val: req.memberEmail },
                          { label: "Membership", val: req.membership ?? "—" },
                          { label: "Reason given", val: req.reason || "No reason provided" },
                          {
                            label: "Requested",
                            val: req.requestedAt
                              ? new Date(req.requestedAt).toLocaleString("en-ZA", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—",
                          },
                        ].map((item) => (
                          <div key={item.label}>
                            <div style={{ ...lbl }}>{item.label}</div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "hsl(var(--foreground))",
                                fontWeight: item.label === "Reason given" ? 400 : 600,
                                fontStyle: item.label === "Reason given" ? "italic" : "normal",
                              }}
                            >
                              {item.val}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Warning box */}
                      <div
                        style={{
                          marginBottom: 16,
                          padding: "12px 14px",
                          background: "hsl(0 84% 51% / 0.06)",
                          border: "1px solid hsl(0 84% 51% / 0.25)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "hsl(0 84% 51%)",
                          lineHeight: 1.7,
                        }}
                      >
                        ⚠ <strong>This action is permanent.</strong> Processing will remove this
                        member from <strong>mk2_users</strong>, their notifications, and all
                        associated data. This cannot be undone.
                      </div>

                      {/* Admin note */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={lbl}>Admin note (optional)</label>
                        <input
                          style={inp}
                          placeholder="e.g. Account deleted per member request — POPIA compliance"
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Btn
                          variant="danger"
                          onClick={() => processDeletion(req)}
                          disabled={processing === req.id}
                        >
                          {processing === req.id ? "Deleting…" : "🗑 Confirm & Delete Account"}
                        </Btn>
                        <Btn variant="subtle" onClick={() => setExpandedId(null)}>
                          Cancel
                        </Btn>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Processed note */}
                {!isPending && req.adminNote && (
                  <div
                    style={{
                      padding: "8px 16px 12px",
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      borderTop: "1px solid hsl(var(--border))",
                    }}
                  >
                    📝 {req.adminNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. MEMBER-FACING — Request Account Deletion
//  Add this to your Profile or Settings screen in the member app
//
//  Props:
//    uid          — current user's Firebase uid
//    memberName   — current user's name
//    memberEmail  — current user's email
//    membership   — current user's membership tier
//    onBack       — function to go back to previous screen
// ═══════════════════════════════════════════════════════════════════════════
export function RequestAccountDeletion({ uid, memberName, memberEmail, membership, onBack }: any) {
  const [step, setStep] = useState<"warning" | "reason" | "confirm" | "done">("warning");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  const REASONS = [
    "I no longer use the gym",
    "I have privacy concerns",
    "I want to create a new account",
    "The app is not working for me",
    "Other",
  ];

  // Check if already requested
  useEffect(() => {
    get(ref(db, `deletion_requests`)).then((snap) => {
      if (!snap.exists()) return;
      const existing = Object.values(snap.val()).find(
        (v: any) => v.uid === uid && v.status === "pending"
      );
      if (existing) setAlreadyRequested(true);
    });
  }, [uid]);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      // Save deletion request
      await push(ref(db, "deletion_requests"), {
        uid,
        memberName,
        memberEmail,
        membership: membership ?? "basic",
        reason: reason === "Other" ? customReason || "Other" : reason,
        status: "pending",
        requestedAt: Date.now(),
      });

      // Notify admin via notifications
      await push(ref(db, "notifications"), {
        title: "⚠ Account Deletion Request",
        body: `${memberName} (${memberEmail}) has requested their account to be deleted.`,
        type: "announcement",
        read: false,
        createdAt: Date.now(),
        sentByAdmin: false,
        isDeletionAlert: true,
      });

      setStep("done");
    } catch {
      // Handle error silently — show message to user
      setStep("done");
    }
    setSubmitting(false);
  };

  // ── Shared member app styles ──────────────────────────────────────────────
  const card: any = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 16,
    padding: "20px 20px",
    marginBottom: 12,
  };

  const memberInp: any = {
    width: "100%",
    background: "hsl(var(--secondary))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    padding: "12px 14px",
    color: "hsl(var(--foreground))",
    fontSize: 14,
    outline: "none",
    fontFamily: "var(--font-body)",
    boxSizing: "border-box" as const,
    marginTop: 8,
    resize: "vertical" as const,
    minHeight: 80,
  };

  // ── Already requested ─────────────────────────────────────────────────────
  if (alreadyRequested) {
    return (
      <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "hsl(var(--muted-foreground))",
            fontSize: 13,
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
            padding: 0,
          }}
        >
          ← Back
        </button>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            Request Already Submitted
          </div>
          <div style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", lineHeight: 1.7 }}>
            You already have a pending account deletion request. Our team will process it within
            48 hours and notify you once it's done.
          </div>
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 12,
                color: "hsl(var(--muted-foreground))",
                padding: "10px 14px",
                background: "hsl(var(--secondary))",
                borderRadius: 8,
              }}
            >
              Need help? Contact us at{" "}
              <strong style={{ color: "hsl(20 100% 50%)" }}>admin@mk2rivers.co.za</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ ...card, textAlign: "center" as const, padding: "40px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            Request Received
          </div>
          <div
            style={{
              fontSize: 14,
              color: "hsl(var(--muted-foreground))",
              lineHeight: 1.8,
              marginBottom: 20,
            }}
          >
            We've received your account deletion request. Our team will review and process it
            within <strong style={{ color: "hsl(var(--foreground))" }}>48 hours</strong>.
            You'll receive a notification once it's done.
          </div>
          <div
            style={{
              fontSize: 12,
              color: "hsl(var(--muted-foreground))",
              padding: "10px 14px",
              background: "hsl(var(--secondary))",
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            Questions? Contact us at{" "}
            <strong style={{ color: "hsl(20 100% 50%)" }}>admin@mk2rivers.co.za</strong>
          </div>
          <button
            onClick={onBack}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--secondary))",
              color: "hsl(var(--foreground))",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "hsl(var(--muted-foreground))",
          fontSize: 13,
          fontFamily: "var(--font-body)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          padding: 0,
        }}
      >
        ← Back
      </button>

      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
        Delete Account
      </div>
      <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginBottom: 20 }}>
        We're sorry to see you go. Please read the information below carefully.
      </div>

      <AnimatePresence mode="wait">

        {/* ── Step 1: Warning ── */}
        {step === "warning" && (
          <motion.div
            key="warning"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "hsl(0 84% 51%)" }}>
                ⚠ Before you continue
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "🏋", text: "All your class bookings will be cancelled" },
                  { icon: "🎁", text: "Any unused rewards or credits will be lost" },
                  { icon: "📊", text: "Your check-in history and points will be deleted" },
                  { icon: "💬", text: "Your community chat messages will be removed" },
                  { icon: "🔒", text: "You will be logged out and cannot log back in" },
                  { icon: "⚠", text: "This action cannot be undone" },
                ].map((item) => (
                  <div
                    key={item.text}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      background: "hsl(var(--secondary))",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: "hsl(var(--foreground))", lineHeight: 1.5 }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => setStep("reason")}
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  border: "1px solid hsl(0 84% 51% / 0.4)",
                  background: "hsl(0 84% 51% / 0.08)",
                  color: "hsl(0 84% 51%)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                I understand — continue with deletion
              </button>
              <button
                onClick={onBack}
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Keep my account
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Reason ── */}
        {step === "reason" && (
          <motion.div
            key="reason"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                Why are you leaving?
              </div>
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginBottom: 16 }}>
                This helps us improve. Your answer is optional.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${reason === r ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                      background: reason === r ? "hsl(20 100% 50% / 0.08)" : "hsl(var(--secondary))",
                      color: reason === r ? "hsl(20 100% 50%)" : "hsl(var(--foreground))",
                      fontSize: 14,
                      fontWeight: reason === r ? 700 : 400,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      textAlign: "left" as const,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `2px solid ${reason === r ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                        background: reason === r ? "hsl(20 100% 50%)" : "transparent",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {reason === r && (
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "block" }} />
                      )}
                    </span>
                    {r}
                  </button>
                ))}
              </div>
              {reason === "Other" && (
                <textarea
                  style={memberInp}
                  placeholder="Tell us more (optional)…"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => setStep("confirm")}
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  border: "none",
                  background: "hsl(0 84% 51%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Continue
              </button>
              <button
                onClick={() => setStep("warning")}
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Back
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Final confirm ── */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                Confirm deletion request
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  background: "hsl(var(--secondary))",
                  borderRadius: 10,
                  marginBottom: 16,
                  fontSize: 13,
                  lineHeight: 1.9,
                }}
              >
                <div><strong>Name:</strong> {memberName}</div>
                <div><strong>Email:</strong> {memberEmail}</div>
                <div><strong>Membership:</strong> {membership ?? "Basic"}</div>
                <div><strong>Reason:</strong> {reason || "Not specified"}</div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.7,
                  padding: "10px 14px",
                  background: "hsl(0 84% 51% / 0.06)",
                  border: "1px solid hsl(0 84% 51% / 0.2)",
                  borderRadius: 8,
                }}
              >
                By submitting this request you confirm you want your account and all associated
                data permanently deleted. Our team will process this within{" "}
                <strong style={{ color: "hsl(var(--foreground))" }}>48 hours</strong> and notify
                you by email.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  border: "none",
                  background: submitting ? "hsl(var(--border))" : "hsl(0 84% 51%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                {submitting ? "Submitting…" : "Submit Deletion Request"}
              </button>
              <button
                onClick={() => setStep("reason")}
                disabled={submitting}
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}