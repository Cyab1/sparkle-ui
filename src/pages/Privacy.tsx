import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";

const SECTIONS = [
  { title: "1. Who We Are", content: `MK Two Rivers Fitness ("we", "us", "our") is a fitness facility located at 29 Peter Rd, Tres Jolie AH, Roodepoort, Johannesburg. We are committed to protecting your personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA) and applicable South African law.` },
  { title: "2. Information We Collect", content: `We collect the following personal information: full name, email address, fitness goals and fitness level, body composition data (InBody scans, weight, BMR), workout and class booking history, check-in records, app feedback and ratings, and payment information (processed securely via PayFast — we do not store card details). We also collect anonymised usage data from the app to improve our services.` },
  { title: "3. How We Use Your Information", content: `Your information is used to: manage your membership and bookings, provide personalised AI coaching and analysis, process payments, send relevant notifications about classes and gym updates, review app feedback to improve our services, and comply with legal obligations. We do not sell, rent, or share your personal information with third parties for marketing purposes.` },
  { title: "4. Data Storage & Security", content: `Your data is stored securely in Google Firebase (Realtime Database), hosted in the europe-west1 region. Firebase employs industry-standard encryption in transit and at rest. Access to your personal data is restricted to authorised gym staff and the systems necessary to provide our services. We implement appropriate technical and organisational measures to protect your data.` },
  { title: "5. Payments", content: `Payment processing is handled by PayFast (Pty) Ltd, a registered Payment Service Provider in South Africa. MK Two Rivers Fitness does not store, process, or transmit credit card or banking information. All payment data is handled exclusively by PayFast in accordance with their privacy policy and PCI DSS standards.` },
  { title: "6. AI & Third-Party Services", content: `Our app uses Claude AI (Anthropic) to provide personalised workout, nutrition, and body composition analysis. Data submitted to AI features may be processed by Anthropic's servers to generate responses. We do not share personally identifiable information with Anthropic beyond what is necessary to provide the service.` },
  { title: "7. Your Rights (POPIA)", content: `Under POPIA, you have the right to: access your personal information held by us, request correction of inaccurate information, request deletion of your data (subject to legal obligations), object to the processing of your information, and lodge a complaint with the Information Regulator of South Africa. To exercise any of these rights, contact us at info@mk2rivers.co.za.` },
  { title: "8. Data Retention", content: `We retain your personal information for as long as your membership is active and for a period of 5 years thereafter, unless a longer retention period is required by law. Upon request, we will delete your account and associated personal data within 30 days, subject to any legal obligations to retain certain records.` },
  { title: "9. Cookies & Analytics", content: `The MK Two Rivers app uses Firebase Analytics to collect anonymised usage data such as screen views and feature interactions. This data is used solely to improve the app experience and is not linked to personally identifiable information. No third-party advertising cookies are used.` },
  { title: "10. Contact & Complaints", content: `For privacy-related queries or to exercise your rights, contact: MK Two Rivers Fitness, 29 Peter Rd, Tres Jolie AH, Roodepoort, 1724. Email: info@mk2rivers.co.za. If you are unsatisfied with our response, you may contact the Information Regulator of South Africa at inforeg.org.za.` },
];

export function Privacy() {
  const { isMobile } = useBreakpoint();
  return (
    <div className={`max-w-[860px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub="Last updated: March 2026 · POPIA compliant">
        Privacy <span className="text-primary">Policy</span>
      </PageTitle>
      <div className="mk2-card mb-5" style={{ borderColor: "hsl(217 91% 53% / 0.3)", background: "hsl(217 91% 53% / 0.04)" }}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your privacy matters to us. This policy explains how MK Two Rivers Fitness collects, uses,
          and protects your personal information in accordance with the{" "}
          <strong className="text-foreground">Protection of Personal Information Act (POPIA)</strong>.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="mk2-card">
            <div className="font-bold text-sm mb-2" style={{ color: "hsl(217 91% 53%)" }}>{s.title}</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-xs text-muted-foreground">
        MK Two Rivers Fitness · 29 Peter Rd, Tres Jolie AH, Roodepoort · info@mk2rivers.co.za
      </div>
    </div>
  );
}