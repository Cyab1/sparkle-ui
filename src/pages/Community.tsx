import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

export function Community() {
  const { user, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [posts, setPosts] = useState([
    { id: 1, author: "Coach Sipho", color: "hsl(20 100% 50%)", text: "Tuesday HIIT was FIRE 🔥 Proud of everyone who pushed through the last round. See you Thursday!", likes: 12, date: "2 days ago" },
    { id: 2, author: "Nomsa K.", color: "hsl(263 85% 58%)", text: "Just hit my personal best on bench press — 60kg! 6 months ago I couldn't lift 40kg. MK2 family made this possible 💪", likes: 28, date: "3 days ago" },
    { id: 3, author: "MK2 Admin", color: "hsl(217 91% 53%)", text: "🎉 30-Day Challenge starting next month! Track workouts, earn double points, win prizes. Sign up at reception.", likes: 45, date: "5 days ago" },
  ]);
  const [text, setText] = useState("");

  if (!user) return null;

  const post = () => {
    if (!text.trim()) return toast("Write something first", "error");
    logEvent("community_post");
    setPosts([{ id: Date.now(), author: user.name, color: user.color, text: text.trim(), likes: 0, date: "Just now" }, ...posts]);
    setText("");
    toast("Posted! 🙌", "success");
  };

  return (
    <div className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub="Share wins, ask questions, motivate each other">Community</PageTitle>

      <div className="mk2-card mb-4">
        <label className="mk2-label">Share with MK2 Community</label>
        <textarea className="mk2-textarea mb-3" placeholder="Share a win, ask a question, motivate someone…" value={text} onChange={(e) => setText(e.target.value)} />
        <Btn variant="primary" onClick={post}>Post to Community</Btn>
      </div>

      <div className="flex flex-col gap-3.5">
        {posts.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="mk2-card"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-display text-[15px] text-primary-foreground shrink-0"
                style={{ background: p.color }}
              >
                {p.author[0]}
              </div>
              <div>
                <div className="font-bold text-sm">{p.author}</div>
                <div className="text-[11px] text-muted-foreground">{p.date}</div>
              </div>
            </div>
            <div className="text-sm leading-relaxed mb-3 text-foreground/80">{p.text}</div>
            <button
              onClick={() => setPosts(posts.map((x) => (x.id === p.id ? { ...x, likes: x.likes + 1 } : x)))}
              className="bg-transparent border border-border rounded-full px-3.5 py-1 text-muted-foreground text-xs cursor-pointer font-body font-semibold hover:border-primary/40 hover:text-primary transition-colors"
            >
              ❤️ {p.likes}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
