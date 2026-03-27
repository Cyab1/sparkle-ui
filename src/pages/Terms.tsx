import { useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { Btn } from "@/components/shared/Btn";
import { motion } from "framer-motion";

const SECTIONS = [
  {
    title: "1. Membership & Access",
    content: `Membership to MK Two Rivers Fitness ("the Gym") grants access to facilities and services as defined by your membership tier (Basic, Silver, or Gold). Membership is personal and non-transferable. The Gym reserves the right to refuse or revoke membership at its discretion. Members must present valid identification upon request.`,
  },
  {
    title: "2. Payment & Billing",
    content: `Monthly and annual memberships are billed in advance. Payments are processed via PayFast, South Africa's leading payment gateway. All fees are quoted in South African Rand (ZAR). The Gym reserves the right to amend membership fees with 30 days' written notice. Failed payments may result in suspension of access.`,
  },
  {
    title: "3. Cancellation Policy",
    content: `Monthly memberships may be cancelled with 30 days' written notice. Annual memberships are non-refundable except in cases of medical incapacity supported by a doctor's certificate. To cancel, contact reception at 29 Peter Rd, Ruimsig or email info@mk2rivers.co.za.`,
  },
  {
    title: "4. Code of Conduct",
    content: `Members must treat staff and fellow members with respect at all times. Aggressive, abusive, or discriminatory behaviour will result in immediate membership termination without refund. Members must wear appropriate gym attire and closed-toe shoes on the gym floor at all times. Clean and rerack all equipment after use.`,
  },
  {
    title: "5. Health & Safety",
    content: `Members participate in all activities at their own risk. The Gym strongly recommends that members obtain medical clearance before commencing any exercise programme. Members must disclose any known medical conditions, injuries, or physical limitations to coaching staff. The Gym accepts no liability for injury, illness, loss, or damage arising from use of the facilities, except where caused by the Gym's negligence.`,
  },
  {
    title: "6. Class Bookings",
    content: `Class bookings are subject to availability. Members should cancel bookings at least 2 hours before the class start time to release the spot for others. Repeated no-shows may result in temporary restriction of booking privileges. The Gym reserves the right to change class schedules, coaches, or formats at any time.`,
  },
  {
    title: "7. Facilities & Equipment",
    content: `Members must use all equipment safely and as intended. Any damage caused by misuse may be charged to the member. Report faulty equipment to staff immediately. The Gym is not responsible for loss or theft of personal belongings. Lockers are provided as a courtesy and are not guaranteed to be secure.`,
  },
  {
    title: "8. App & Digital Services",
    content: `The MK Two Rivers Fitness app is provided as a supplementary service. AI-generated workout and nutrition plans are for informational purposes only and do not constitute medical advice. The Gym makes no warranty regarding the accuracy or completeness of AI-generated content. Digital services may be updated, changed, or discontinued at any time.`,
  },
  {
    title: "9. Liability Waiver",
    content: `By accepting these Terms and Conditions, you acknowledge that physical exercise carries inherent risks including but not limited to muscular injury, cardiovascular events, and accidental injury. You voluntarily assume all such risks and release MK Two Rivers Fitness, its owners, employees, and coaches from any and all claims, damages, or liability arising from your participation in any gym activity, class, or use of equipment.`,
  },
  {
    title: "10. Photography & Media",
    content: `The Gym may photograph or film activities within the facility for marketing purposes. By accepting these terms, you consent to the use of your likeness in such media unless you have submitted a written objection to management. You may withdraw consent at any time by notifying us at info@mk2rivers.co.za.`,
  },
  {
    title: "11. Amendments",
    content: `MK Two Rivers Fitness reserves the right to amend these Terms and Conditions at any time. Members will be notified of material changes via the app or email. Continued use of the facilities or app following notice of changes constitutes acceptance of the updated terms.`,
  },
  {
    title: "12. Governing Law",
    content: `These Terms and Conditions are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the jurisdiction of the South African courts. These terms constitute the entire agreement between the member and MK Two Rivers Fitness and supersede any prior agreements or representations.`,
  },
];

interface TermsProps {
  // Gate mode: shown during registration, requires accept/decline
  gateMode?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  // Normal mode: just viewing from menu
  setPage?: (p: string) => void;
}

export function Terms({
  gateMode = false,
  onAccept,
  onDecline,
  setPage,
}: TermsProps) {
  const { isMobile } = useBreakpoint();
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (atBottom) setScrolled(true);
  };

  // ── Gate mode (shown during registration) ─────────────────────────────────
  if (gateMode) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "hsl(var(--background))",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              letterSpacing: "0.15em",
              color: "hsl(20 100% 50%)",
              marginBottom: 4,
            }}
          >
            MK TWO RIVERS FITNESS
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Terms & Conditions
          </div>
          <div
            style={{
              fontSize: 11,
              color: "hsl(var(--muted-foreground))",
              marginTop: 3,
            }}
          >
            Please read and accept before continuing
          </div>
        </div>

        {/* Scrollable content */}
        <div
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "16px 14px" : "20px 24px",
          }}
        >
          {/* Intro */}
          <div
            style={{
              background: "hsl(20 100% 50% / 0.06)",
              border: "1px solid hsl(20 100% 50% / 0.3)",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 16,
              fontSize: 13,
              color: "hsl(var(--muted-foreground))",
              lineHeight: 1.7,
            }}
          >
            By joining MK Two Rivers Fitness, you agree to the following terms.
            These terms protect both you and the gym and comply with South
            African law. Questions? Email{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              info@mk2rivers.co.za
            </strong>
          </div>

          {/* Sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SECTIONS.map((s) => (
              <div
                key={s.title}
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: "hsl(20 100% 50%)",
                    marginBottom: 6,
                  }}
                >
                  {s.title}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {s.content}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              color: "hsl(var(--muted-foreground))",
              textAlign: "center",
            }}
          >
            MK Two Rivers Fitness · 29 Peter Rd, Tres Jolie AH, Roodepoort ·
            info@mk2rivers.co.za
          </div>
        </div>

        {/* Accept footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
        >
          {!scrolled && (
            <div
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              ↓ Scroll to the bottom to enable acceptance
            </div>
          )}

          {/* Checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 14,
              cursor: scrolled ? "pointer" : "not-allowed",
              opacity: scrolled ? 1 : 0.4,
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={!scrolled}
              onChange={(e) => setChecked(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, lineHeight: 1.6 }}>
              I have read and agree to the{" "}
              <strong style={{ color: "hsl(20 100% 50%)" }}>
                Terms & Conditions
              </strong>{" "}
              and{" "}
              <strong style={{ color: "hsl(20 100% 50%)" }}>
                Privacy Policy
              </strong>{" "}
              of MK Two Rivers Fitness. I understand that physical exercise
              carries inherent risks and I accept full responsibility for my
              participation.
            </span>
          </label>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onDecline}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: "transparent",
                color: "hsl(var(--muted-foreground))",
                border: "1px solid hsl(var(--border))",
                fontFamily: "var(--font-body)",
              }}
            >
              Decline
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => checked && onAccept?.()}
              disabled={!checked}
              style={{
                flex: 2,
                padding: "12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: checked ? "pointer" : "not-allowed",
                background: checked
                  ? "hsl(20 100% 50%)"
                  : "hsl(var(--secondary))",
                color: checked ? "#000" : "hsl(var(--muted-foreground))",
                border: "none",
                fontFamily: "var(--font-body)",
                transition: "all 0.2s",
              }}
            >
              ✓ I Accept & Continue
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal view mode (from menu) ──────────────────────────────────────────
  return (
    <div
      className={`max-w-[860px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Last updated: March 2026">
        Terms & <span className="text-primary">Conditions</span>
      </PageTitle>
      <div
        className="mk2-card mb-5"
        style={{
          borderColor: "hsl(20 100% 50% / 0.3)",
          background: "hsl(20 100% 50% / 0.04)",
        }}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Please read these Terms and Conditions carefully before using the MK
          Two Rivers Fitness app or facilities. By registering as a member or
          using our services, you agree to be bound by these terms. Questions?
          Contact us at{" "}
          <strong className="text-foreground">info@mk2rivers.co.za</strong>.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="mk2-card">
            <div
              className="font-bold text-sm mb-2"
              style={{ color: "hsl(20 100% 50%)" }}
            >
              {s.title}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {s.content}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-xs text-muted-foreground">
        MK Two Rivers Fitness · 29 Peter Rd, Tres Jolie AH, Roodepoort ·
        info@mk2rivers.co.za
      </div>
    </div>
  );
}
