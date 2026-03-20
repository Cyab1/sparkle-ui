import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";

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
    title: "9. Amendments",
    content: `MK Two Rivers Fitness reserves the right to amend these Terms and Conditions at any time. Members will be notified of material changes via the app or email. Continued use of the facilities or app following notice of changes constitutes acceptance of the updated terms.`,
  },
  {
    title: "10. Governing Law",
    content: `These Terms and Conditions are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the jurisdiction of the South African courts.`,
  },
];

export function Terms() {
  const { isMobile } = useBreakpoint();
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
