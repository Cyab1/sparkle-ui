import { useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { useAuth } from "@/context/AuthContext";
import { ref, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";

const AD_PACKAGES = [
  {
    name: "Starter",
    price: "R299/mo",
    color: "hsl(217 91% 53%)",
    icon: "🚀",
    features: [
      "Banner in News & Events feed",
      "Logo + short description",
      "Link to your website or social",
      "Reach 100+ active gym members",
    ],
  },
  {
    name: "Growth",
    price: "R599/mo",
    color: "hsl(20 100% 50%)",
    icon: "⚡",
    popular: true,
    features: [
      "Everything in Starter",
      "Featured spot on Dashboard",
      "Push notification to all Silver+ members",
      "Monthly promotion in app",
      "Analytics report on views & clicks",
    ],
  },
  {
    name: "Premium",
    price: "R999/mo",
    color: "hsl(38 92% 50%)",
    icon: "👑",
    features: [
      "Everything in Growth",
      "Full-screen splash ad (once/month)",
      "Dedicated sponsor card on Community page",
      "Exclusive deal for gym members",
      "Priority placement across all sections",
      "Dedicated account manager",
    ],
  },
];

const AD_CATEGORIES = [
  "Health & Wellness",
  "Nutrition & Supplements",
  "Sports Apparel",
  "Physiotherapy / Recovery",
  "Food & Beverage",
  "Financial Services",
  "Beauty & Grooming",
  "Technology",
  "Real Estate",
  "Other",
];

export function Advertise() {
  const { isMobile } = useBreakpoint();
  const { user, toast } = useAuth();

  const [bizName, setBizName] = useState("");
  const [contactName, setContactName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(AD_CATEGORIES[0]);
  const [selectedPkg, setSelectedPkg] = useState("Growth");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!bizName || !contactName || !email)
      return toast("Fill in business name, contact name and email", "error");
    setSending(true);
    try {
      await push(ref(db, "ad_enquiries"), {
        bizName,
        contactName,
        email,
        phone,
        category,
        package: selectedPkg,
        message,
        uid: user?.uid || "guest",
        timestamp: new Date().toISOString(),
        status: "new",
      });
      setDone(true);
      toast("✓ Enquiry submitted! We'll be in touch soon.", "success");
    } catch {
      toast("Submission failed — please try again", "error");
    }
    setSending(false);
  };

  const inp =
    "w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary/50 transition-colors font-body";
  const lbl =
    "text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3 py-4" : "px-6 py-10"}`}
    >
      <PageTitle sub="Reach 100+ active, health-conscious members in Ruimsig">
        Advertise <span className="text-primary">With Us</span>
      </PageTitle>

      {/* Why advertise banner */}
      <div
        className="mk2-card mb-6"
        style={{
          background:
            "linear-gradient(135deg, hsl(20 100% 50% / 0.12), hsl(38 92% 50% / 0.08))",
          borderColor: "hsl(20 100% 50% / 0.3)",
        }}
      >
        <div
          className="font-display text-[10px] tracking-[0.25em] uppercase mb-2"
          style={{ color: "hsl(20 100% 50%)" }}
        >
          WHY ADVERTISE WITH MK TWO RIVERS
        </div>
        <h2 className="font-display text-xl sm:text-2xl mb-3 text-foreground leading-tight">
          CONNECT WITH AN ENGAGED,
          <br className="sm:hidden" /> HEALTH-FOCUSED AUDIENCE
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Our members are active, motivated, and loyal. They visit the gym
          multiple times per week, engage with our app daily, and are highly
          receptive to products and services that align with their active
          lifestyle. Advertising with MK Two Rivers puts your brand in front of
          exactly the right people — right here in the Ruimsig community.
        </p>
        <div className="flex gap-4 sm:gap-6 flex-wrap">
          {[
            ["100+", "Active Members"],
            ["Daily", "App Engagement"],
            ["Local", "Ruimsig"],
            ["3 Tiers", "Packages"],
          ].map(([val, label]) => (
            <div key={label}>
              <div
                className="font-display text-lg sm:text-xl"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                {val}
              </div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Packages — 1 col mobile, 3 col desktop */}
      <div className="mb-6">
        <div className="font-bold text-sm mb-3 text-foreground">
          Advertising Packages
        </div>
        <div
          className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
        >
          {AD_PACKAGES.map((pkg, i) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelectedPkg(pkg.name)}
              className="mk2-card cursor-pointer relative transition-all"
              style={{
                borderTop: `3px solid ${pkg.color}`,
                outline:
                  selectedPkg === pkg.name ? `2px solid ${pkg.color}` : "none",
                outlineOffset: 2,
              }}
            >
              {(pkg as any).popular && (
                <div
                  className="absolute -top-px right-4 text-[9px] font-bold px-2.5 py-0.5 rounded-b-md"
                  style={{ background: pkg.color, color: "#000" }}
                >
                  POPULAR
                </div>
              )}
              {selectedPkg === pkg.name && (
                <div
                  className="absolute -top-px left-4 text-[9px] font-bold px-2.5 py-0.5 rounded-b-md"
                  style={{ background: pkg.color, color: "#000" }}
                >
                  SELECTED
                </div>
              )}
              <div className="text-2xl mb-2">{pkg.icon}</div>
              <div
                className="font-display text-xl mb-1"
                style={{ color: pkg.color }}
              >
                {pkg.name}
              </div>
              <div
                className="font-display text-2xl sm:text-3xl mb-3"
                style={{ color: pkg.color }}
              >
                {pkg.price}
              </div>
              <div className="mk2-divider" />
              {pkg.features.map((f) => (
                <div key={f} className="flex gap-2 mb-2 text-xs">
                  <span style={{ color: pkg.color, flexShrink: 0 }}>✓</span>
                  <span className="text-muted-foreground">{f}</span>
                </div>
              ))}
            </motion.div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-3 text-center">
          Tap a package to select it · All prices exclude VAT · Custom packages
          available on request
        </div>
      </div>

      {/* Enquiry form */}
      <div
        className="mk2-card"
        style={{ borderTop: "2px solid hsl(20 100% 50%)" }}
      >
        <div className="font-bold text-sm mb-1 flex items-center gap-2">
          <span
            className="material-symbols-rounded text-lg"
            style={{ color: "hsl(20 100% 50%)" }}
          >
            campaign
          </span>
          Submit Advertising Enquiry
        </div>
        <div className="text-xs text-muted-foreground mb-5">
          Fill in your details and we'll get back to you within 24 hours.
        </div>

        {done ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🎉</div>
            <div
              className="font-display text-xl sm:text-2xl mb-2"
              style={{ color: "hsl(20 100% 50%)" }}
            >
              ENQUIRY RECEIVED!
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              Thank you, <strong className="text-foreground">{bizName}</strong>!
              We'll be in touch within 24 hours.
            </div>
            <div className="text-xs text-muted-foreground mb-6">
              Selected package:{" "}
              <strong className="text-foreground">{selectedPkg}</strong>
            </div>
            <button
              onClick={() => {
                setDone(false);
                setBizName("");
                setPhone("");
                setMessage("");
              }}
              className="text-xs font-bold bg-transparent border-none cursor-pointer"
              style={{ color: "hsl(20 100% 50%)" }}
            >
              Submit another enquiry →
            </button>
          </div>
        ) : (
          <>
            <div
              className={`grid gap-4 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
            >
              <div>
                <label className={lbl}>Business Name *</label>
                <input
                  className={inp}
                  placeholder="e.g. Ruimsig Pharmacy"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Business Category</label>
                <select
                  className={inp}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {AD_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Contact Person *</label>
                <input
                  className={inp}
                  placeholder="Your full name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Email Address *</label>
                <input
                  className={inp}
                  type="email"
                  placeholder="business@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Phone Number</label>
                <input
                  className={inp}
                  placeholder="e.g. 071 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Selected Package</label>
                <select
                  className={inp}
                  value={selectedPkg}
                  onChange={(e) => setSelectedPkg(e.target.value)}
                >
                  {AD_PACKAGES.map((p) => (
                    <option key={p.name}>
                      {p.name} — {p.price}
                    </option>
                  ))}
                  <option value="Custom">Custom package</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={lbl}>
                Tell us about your business & goals (optional)
              </label>
              <textarea
                className={`${inp} resize-none`}
                rows={3}
                placeholder="What products or services do you offer? What would you like to achieve with this ad?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <button
              onClick={submit}
              disabled={sending}
              className="w-full py-3.5 rounded-xl font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "hsl(20 100% 50%)" }}
            >
              {sending ? "Submitting…" : "Submit Advertising Enquiry →"}
            </button>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              We'll contact you within 24 hours · No commitment required
            </div>
          </>
        )}
      </div>
    </div>
  );
}
