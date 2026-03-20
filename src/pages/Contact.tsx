import { useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { useAuth } from "@/context/AuthContext";
import { ref, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";

const CONTACT_INFO = [
  {
    icon: "location_on",
    color: "hsl(187 85% 40%)",
    title: "Visit Us",
    lines: [
      "29 Peter Rd, Tres Jolie AH",
      "Roodepoort, 1724",
      "Ruimsig, Johannesburg",
    ],
    action: {
      label: "Get directions →",
      href: "https://maps.google.com/?q=29+Peter+Rd+Tres+Jolie+AH+Roodepoort",
    },
  },
  {
    icon: "schedule",
    color: "hsl(20 100% 50%)",
    title: "Opening Hours",
    lines: [
      "Mon–Fri: 05:00 – 21:00",
      "Saturday: 07:00 – 14:00",
      "Sunday: 08:00 – 12:00",
    ],
  },
  {
    icon: "phone",
    color: "hsl(142 72% 37%)",
    title: "Call Us",
    lines: ["Reception available during gym hours"],
    action: { label: "Call now →", href: "tel:+27645386375" },
  },
  {
    icon: "mail",
    color: "hsl(217 91% 53%)",
    title: "Email Us",
    lines: ["info@mk2rivers.co.za"],
    action: { label: "Send email →", href: "mailto:info@mk2rivers.co.za" },
  },
  {
    icon: "language",
    color: "hsl(263 85% 58%)",
    title: "Website",
    lines: ["www.mk2rivers.co.za"],
    action: { label: "Visit website →", href: "https://www.mk2rivers.co.za" },
  },
  {
    icon: "photo_camera",
    color: "hsl(330 80% 55%)",
    title: "Instagram",
    lines: ["@mktworiversfitness"],
    action: {
      label: "Follow us →",
      href: "https://www.instagram.com/mktworiversfitness/",
    },
  },
];

const FEEDBACK_TYPES = [
  "Feature suggestion",
  "Bug / issue report",
  "Class feedback",
  "Coach feedback",
  "App improvement",
  "General comment",
];

export function Contact() {
  const { isMobile } = useBreakpoint();
  const { user, toast } = useAuth();

  const [cName, setCName] = useState(user?.name || "");
  const [cEmail, setCEmail] = useState(user?.email || "");
  const [cSubject, setCSubject] = useState("");
  const [cMessage, setCMessage] = useState("");
  const [cSending, setCsending] = useState(false);

  const [fType, setFType] = useState(FEEDBACK_TYPES[0]);
  const [fRating, setFRating] = useState(5);
  const [fMessage, setFMessage] = useState("");
  const [fSending, setFsending] = useState(false);
  const [fDone, setFDone] = useState(false);

  const sendContact = () => {
    if (!cName || !cEmail || !cMessage)
      return toast("Fill in all required fields", "error");
    setCsending(true);
    const mailto = `mailto:info@mk2rivers.co.za?subject=${encodeURIComponent(
      cSubject || "MK2 App Enquiry",
    )}&body=${encodeURIComponent(
      `Name: ${cName}\nEmail: ${cEmail}\n\n${cMessage}`,
    )}`;
    window.open(mailto);
    toast("✓ Opening your email app…", "success");
    setCSubject("");
    setCMessage("");
    setCsending(false);
  };

  const sendFeedback = async () => {
    if (!fMessage.trim())
      return toast("Please write your feedback first", "error");
    setFsending(true);
    try {
      await push(ref(db, "app_feedback"), {
        uid: user?.uid || "anonymous",
        name: user?.name || "Anonymous",
        email: user?.email || "",
        type: fType,
        rating: fRating,
        message: fMessage,
        timestamp: new Date().toISOString(),
      });
      setFDone(true);
      toast("✓ Feedback submitted — thank you!", "success");
      setFMessage("");
      setFType(FEEDBACK_TYPES[0]);
      setFRating(5);
    } catch {
      toast("Failed to submit — try again", "error");
    }
    setFsending(false);
  };

  const inp =
    "w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary/50 transition-colors font-body";
  const lbl =
    "text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div
      className={`max-w-[1060px] mx-auto ${
        isMobile ? "px-3 py-4" : "px-6 py-10"
      }`}
    >
      <PageTitle sub="We'd love to hear from you">
        Contact <span className="text-primary">& Feedback</span>
      </PageTitle>

      <div
        className={`grid gap-5 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {/* Contact form */}
        <div className="mk2-card">
          <div className="font-bold text-sm mb-4 flex items-center gap-2">
            <span
              className="material-symbols-rounded"
              style={{ fontSize: 18, color: "hsl(20 100% 50%)" }}
            >
              mail
            </span>
            Send Us a Message
          </div>
          <div
            className={`grid gap-3 mb-3 ${
              isMobile ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            <div>
              <label className={lbl}>Your Name *</label>
              <input
                className={inp}
                placeholder="Full name"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Email *</label>
              <input
                className={inp}
                type="email"
                placeholder="you@email.com"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className={lbl}>Subject</label>
            <select
              className={inp}
              value={cSubject}
              onChange={(e) => setCSubject(e.target.value)}
            >
              <option value="">Select a topic…</option>
              <option>Membership enquiry</option>
              <option>Class booking help</option>
              <option>Personal training</option>
              <option>InBody scan booking</option>
              <option>Billing / payment</option>
              <option>General enquiry</option>
            </select>
          </div>
          <div className="mb-4">
            <label className={lbl}>Message *</label>
            <textarea
              className={`${inp} resize-none`}
              rows={4}
              placeholder="How can we help you?"
              value={cMessage}
              onChange={(e) => setCMessage(e.target.value)}
            />
          </div>
          <button
            onClick={sendContact}
            disabled={cSending}
            className="w-full py-3 rounded-xl font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "hsl(20 100% 50%)" }}
          >
            {cSending ? "Opening email…" : "Send Message →"}
          </button>
        </div>

        {/* Contact info — 2‑col on mobile, 1‑col on desktop */}
        <div
          className={`grid gap-2.5 content-start ${
            isMobile ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {CONTACT_INFO.map((item) => (
            <div
              key={item.title}
              className="mk2-card flex gap-2.5 items-start"
              style={{
                borderLeft: `3px solid ${item.color}`,
                padding: "12px 14px",
              }}
            >
              <span
                className="material-symbols-rounded flex-shrink-0 mt-0.5"
                style={{ color: item.color, fontSize: 18 }}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="font-bold text-xs mb-0.5 text-foreground">
                  {item.title}
                </div>
                {item.lines.map((l) => (
                  <div
                    key={l}
                    className="text-[11px] text-muted-foreground"
                    style={{ wordBreak: "break-word" }}
                  >
                    {l}
                  </div>
                ))}
                {(item as any).action && (
                  <a
                    href={(item as any).action.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold mt-1 block hover:opacity-80 transition-opacity"
                    style={{ color: item.color }}
                  >
                    {(item as any).action.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div
          className="mk2-card"
          style={{ borderTop: "2px solid hsl(217 91% 53%)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="material-symbols-rounded text-xl"
              style={{ color: "hsl(217 91% 53%)" }}
            >
              rate_review
            </span>
            <div className="font-bold text-sm">App Feedback</div>
          </div>
          <div
            className="rounded-xl px-4 py-3.5 mb-4 text-sm text-muted-foreground leading-relaxed"
            style={{
              background: "hsl(217 91% 53% / 0.06)",
              border: "1px solid hsl(217 91% 53% / 0.2)",
            }}
          >
            Your input is essential to enhancing our app's functionality and
            user experience. We are committed to providing a seamless platform
            that meets your needs, and we know there's always room for
            improvement.
            <br />
            <br />
            Whether you have suggestions for new features, encountered any
            issues, or have general comments —{" "}
            <strong className="text-foreground">
              we want to hear from you!
            </strong>
            <br />
            <br />
            Thank you for helping us make our app better for everyone. 🙏
          </div>

          {fDone ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🎉</div>
              <div className="font-bold text-lg mb-1 text-foreground">
                Thank you for your feedback!
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Your input helps us improve MK2 Rivers for everyone.
              </div>
              <button
                onClick={() => setFDone(false)}
                className="text-xs font-bold bg-transparent border-none cursor-pointer"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                Submit more feedback →
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
            >
              <div>
                <div className="mb-3">
                  <label className={lbl}>Feedback Type</label>
                  <select
                    className={inp}
                    value={fType}
                    onChange={(e) => setFType(e.target.value)}
                  >
                    {FEEDBACK_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Overall Rating</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        onClick={() => setFRating(i)}
                        className="flex-1 min-w-[36px] px-2 py-2 rounded-lg border cursor-pointer text-sm transition-all font-body"
                        style={{
                          background:
                            fRating === i
                              ? "hsl(38 92% 44%)"
                              : "hsl(var(--secondary))",
                          borderColor:
                            fRating === i
                              ? "hsl(38 92% 44%)"
                              : "hsl(var(--border))",
                          color:
                            fRating === i ? "#000" : "hsl(var(--foreground))",
                        }}
                      >
                        {i}★
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <label className={lbl}>Your Feedback *</label>
                <textarea
                  className={`${inp} resize-none flex-1 min-h-[100px]`}
                  rows={4}
                  placeholder="Tell us what you think, what's working, what could be better, or any new features you'd love to see…"
                  value={fMessage}
                  onChange={(e) => setFMessage(e.target.value)}
                />
                <button
                  onClick={sendFeedback}
                  disabled={fSending}
                  className="mt-3 w-full py-3 rounded-xl font-body font-bold text-sm border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "hsl(217 91% 53%)", color: "#fff" }}
                >
                  {fSending ? "Submitting…" : "Submit Feedback →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
