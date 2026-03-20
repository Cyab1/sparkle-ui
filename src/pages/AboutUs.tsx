import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

const TEAM = [
  {
    name: "Coach Marcus",
    role: "Head CrossFit Coach",
    emoji: "🏋️",
    bio: "CrossFit Level 2 certified. 8+ years coaching competitive athletes and beginners alike.",
  },
  {
    name: "Coach Sipho",
    role: "HIIT & Cardio Specialist",
    emoji: "⚡",
    bio: "HIIT expert with a passion for high-energy training and heart-rate based coaching.",
  },
  {
    name: "Coach Busi",
    role: "Strength & Conditioning",
    emoji: "💪",
    bio: "Strength coach specialising in progressive overload and functional movement.",
  },
  {
    name: "Coach Dlamini",
    role: "Boxing & Combat Fitness",
    emoji: "🥊",
    bio: "Former competitive boxer bringing real fight conditioning to every session.",
  },
  {
    name: "Thandeka N.",
    role: "Spin & Cycling Coach",
    emoji: "🚴",
    bio: "Indoor cycling coach who turns every ride into a music-driven endurance event.",
  },
  {
    name: "Nomsa K.",
    role: "Pilates & Core Specialist",
    emoji: "🧘",
    bio: "Certified Pilates instructor focused on injury prevention and postural strength.",
  },
];

const VALUES = [
  {
    icon: "🔥",
    title: "Training with Intention",
    desc: "Every class, every rep, every session is designed with purpose. We don't just move — we move with meaning.",
  },
  {
    icon: "🤝",
    title: "Community First",
    desc: "Born from the merger of two passionate communities, we are a family united by purpose and driven by connection.",
  },
  {
    icon: "🎯",
    title: "Coaching with Purpose",
    desc: "We uphold world-class coaching standards — not for prestige, but because our community deserves the best.",
  },
  {
    icon: "🧠",
    title: "Movement, Mindset & Mentorship",
    desc: "We transform lives through three pillars: the way you move, the way you think, and the guidance you receive.",
  },
  {
    icon: "💎",
    title: "Integrity & Discipline",
    desc: "We lead with integrity, grow through discipline, and show up every single day to make a difference.",
  },
  {
    icon: "🏆",
    title: "Celebrating Every Milestone",
    desc: "From first-timers to seasoned athletes — every milestone matters and every win is celebrated.",
  },
];

export function AboutUs() {
  const { isMobile } = useBreakpoint();
  return (
    <div
      className={`max-w-[1060px] mx-auto ${
        isMobile ? "px-3 py-4" : "px-6 py-10"
      }`}
    >
      <PageTitle sub="MK Two Rivers Fitness · Ruimsig, Johannesburg">
        About <span className="text-primary">MK Two Rivers</span>
      </PageTitle>

      <div
        className="mk2-card mb-6"
        style={{
          background:
            "linear-gradient(135deg, hsl(20 100% 50% / 0.15), hsl(187 100% 40% / 0.08))",
          borderColor: "hsl(20 100% 50% / 0.3)",
        }}
      >
        <div
          className="font-display text-[10px] tracking-[0.2em] uppercase mb-2"
          style={{ color: "hsl(20 100% 50%)" }}
        >
          ★ ★ ★ &nbsp; RUIMSIG, JOHANNESBURG &nbsp; ★ ★ ★
        </div>
        <h2 className="font-display text-xl sm:text-3xl mb-3 text-foreground leading-tight">
          WE DON'T JUST BUILD BODIES —<br />
          <span style={{ color: "hsl(20 100% 50%)" }}>WE BUILD PEOPLE</span>
        </h2>
        <div className="flex gap-4 flex-wrap mt-3">
          {[
            ["100+", "Members"],
            ["8", "Classes/Day"],
            ["10+", "Coaches"],
            ["5★", "Rating"],
          ].map(([val, label]) => (
            <div key={label}>
              <div
                className="font-display text-xl sm:text-2xl"
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

      <div className="mk2-card mb-6">
        <div className="font-bold text-sm mb-4 flex items-center gap-2">
          <span
            className="material-symbols-rounded text-lg"
            style={{ color: "hsl(20 100% 50%)" }}
          >
            auto_stories
          </span>
          Who We Are
        </div>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            At{" "}
            <strong className="text-foreground">MK Two Rivers Fitness</strong>,
            we are more than a gym. We are a movement, a standard, and a family
            united by purpose. Born from the powerful merger of two passionate
            communities, our mission is clear: to create a space where ordinary
            people become extraordinary, and where strength is measured not only
            in reps or race times, but in{" "}
            <strong className="text-foreground">
              resilience, character, and connection
            </strong>
            .
          </p>
          <p>
            We believe in training with intention, in coaching with purpose, and
            in living with vision. Every class, every coach, and every member
            plays a role in raising the bar — not just in fitness, but in life.
            From first-timers to seasoned athletes, we develop individuals by
            unlocking their potential, pushing limits, and celebrating every
            milestone along the way.
          </p>
          <p>
            Our passion lies in transforming lives through{" "}
            <strong className="text-foreground">
              movement, mindset, and mentorship
            </strong>
            . We uphold world-class standards in coaching and programming — not
            for prestige, but because our community deserves the best. We lead
            with integrity, grow through discipline, and show up every single
            day to make a difference — not just in your workout, but in your
            world.
          </p>
          <div
            className="rounded-xl px-5 py-4 mt-2"
            style={{
              background: "hsl(20 100% 50% / 0.08)",
              border: "1px solid hsl(20 100% 50% / 0.25)",
            }}
          >
            <p className="text-foreground font-bold text-sm italic leading-relaxed">
              "If you're looking for more than just a gym — if you're seeking
              purpose, belonging, challenge, and change — then you've just found
              your place."
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="font-bold text-sm mb-3">What We Stand For</div>
        <div
          className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="mk2-card flex gap-3 items-start"
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">{v.icon}</div>
              <div>
                <div className="font-bold text-sm mb-1">{v.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {v.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="font-bold text-sm mb-3">Meet the Coaches</div>
        <div
          className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}
        >
          {TEAM.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="mk2-card text-center"
            >
              <div className="text-3xl mb-2">{member.emoji}</div>
              <div className="font-bold text-sm mb-0.5">{member.name}</div>
              <div
                className="text-[11px] font-bold mb-2"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                {member.role}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {member.bio}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div
        className="mk2-card"
        style={{ borderTop: "2px solid hsl(187 85% 40%)" }}
      >
        <div className="font-bold text-sm mb-2 flex items-center gap-2">
          <span
            className="material-symbols-rounded text-lg"
            style={{ color: "hsl(187 85% 40%)" }}
          >
            location_on
          </span>
          Find Us
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">MK Two Rivers Fitness</strong>
          <br />
          29 Peter Rd, Tres Jolie AH
          <br />
          Roodepoort, 1724 · Ruimsig, Johannesburg
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Hours:</strong> Mon–Thur
          05:00–19:00 · Fri 05:00–18:00  · Sat 07:00–09:00 · Sun: Closed
        </div>
      </div>
    </div>
  );
}
