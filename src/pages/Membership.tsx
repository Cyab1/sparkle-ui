import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

const PLANS = [
  { id: "basic", name: "Basic", price: 299, color: "hsl(217 91% 53%)", popular: false, features: ["Gym floor access", "Locker room", "2 group classes/month", "Mobile app access"] },
  { id: "standard", name: "Standard", price: 499, color: "hsl(20 100% 50%)", popular: true, features: ["Everything in Basic", "Unlimited group classes", "1 PT session/month", "Nutrition tips", "Guest pass x1/month"] },
  { id: "premium", name: "Premium", price: 799, color: "hsl(38 92% 44%)", popular: false, features: ["Everything in Standard", "4 PT sessions/month", "Recovery zone access", "Priority booking", "Unlimited guest passes", "Personalised AI plans"] },
];

export function Membership() {
  const { user, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [sel, setSel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const tier = user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const discount = tier === "Gold" ? 0.8 : tier === "Silver" ? 0.9 : 1;

  const pay = (plan: typeof PLANS[0]) => {
    setLoading(true);
    setSel(plan.id);
    const finalPrice = (plan.price * discount).toFixed(2);
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://sandbox.payfast.co.za/eng/process";
    const fields: Record<string, string> = {
      merchant_id: "10000100",
      merchant_key: "46f0cd694581a",
      return_url: window.location.href,
      cancel_url: window.location.href,
      notify_url: "https://yourdomain.com/api/payfast-notify",
      name_first: user.name.split(" ")[0],
      name_last: user.name.split(" ")[1] || "",
      email_address: user.email,
      m_payment_id: `MK2-${user.uid.slice(-6)}-${Date.now()}`,
      amount: finalPrice,
      item_name: `MK2 Rivers ${plan.name} Membership`,
      custom_str1: user.uid,
      custom_str2: plan.id,
    };
    Object.entries(fields).forEach(([k, v]) => {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = k;
      i.value = v;
      form.appendChild(i);
    });
    document.body.appendChild(form);
    logEvent("begin_checkout", { plan: plan.id, value: parseFloat(finalPrice), currency: "ZAR" });
    toast(`Redirecting to PayFast — R${finalPrice}/mo…`, "info");
    setTimeout(() => {
      form.submit();
      setLoading(false);
    }, 1200);
  };

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub={`Choose your plan · Secure payment via PayFast${discount < 1 ? ` · ${tier} discount applied!` : ""}`}>
        Membership <span className="text-primary">Plans</span>
      </PageTitle>

      <div className={`grid gap-4 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
        {PLANS.map((plan, i) => {
          const fp = (plan.price * discount).toFixed(0);
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`mk2-card relative ${sel === plan.id ? "ring-2" : ""}`}
              style={{ borderTop: `3px solid ${plan.color}`, outlineColor: sel === plan.id ? plan.color : undefined }}
            >
              {plan.popular && (
                <div className="absolute -top-px right-4 text-[9px] font-bold px-2.5 py-0.5 rounded-b-md tracking-[0.08em] text-primary-foreground" style={{ background: plan.color }}>
                  POPULAR
                </div>
              )}
              <div className="font-display text-2xl mb-1">{plan.name}</div>
              <div className="mb-1">
                <span className="font-display text-[40px]" style={{ color: plan.color }}>R{fp}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              {discount < 1 && <div className="text-[11px] text-muted-foreground mb-2.5 line-through">R{plan.price}/mo</div>}
              <div className="mk2-divider" />
              {plan.features.map((f, fi) => (
                <div key={fi} className="flex gap-2 mb-2 text-xs text-foreground/75">
                  <span style={{ color: plan.color }}>✓</span>{f}
                </div>
              ))}
              <div className="mt-4">
                <Btn variant="primary" full onClick={() => pay(plan)} disabled={loading && sel === plan.id} accentColor={plan.color}>
                  {loading && sel === plan.id ? "Redirecting…" : "Pay via PayFast"}
                </Btn>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mk2-card border-mk2-green/20" style={{ background: "hsl(142 40% 4%)", borderColor: "hsl(142 72% 37% / 0.2)" }}>
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-xl">🔒</span>
          <div className="font-bold text-sm">Secured by PayFast + Firebase</div>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Payments processed by <strong className="text-foreground">PayFast</strong> — SA's leading payment gateway. Accepts credit/debit cards, EFT, Instant EFT, SnapScan & Mobicred.<br />
          Member data stored securely in <strong className="text-foreground">Firebase Firestore</strong> (Google Cloud, europe-west1).<br />
          <strong className="text-mk2-green">To go live:</strong> Replace sandbox merchant ID with your PayFast production credentials.
        </div>
      </div>
    </div>
  );
}
