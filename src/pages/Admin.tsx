import { useState, useEffect } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import {
  fetchCollection,
  addToCollection,
  updateInCollection,
  deleteFromCollection,
} from "@/lib/firebase";
// STEP 1: Import Realtime Database for members management
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase"; // make sure db is exported from firebase.ts

import { motion, AnimatePresence } from "framer-motion";

const ADMIN_PASSWORD = "MK2Admin2026";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const CATS = [
  "Cardio",
  "Strength",
  "Flexibility",
  "Core",
  "Combat",
  "CrossFit",
  "Recovery",
  "Spin",
  "Yoga",
];
const INTENSITIES = [
  "Low",
  "Low–Medium",
  "Medium",
  "Medium–High",
  "High",
  "Very High",
];
const NEWS_TYPES = ["News", "Event", "Announcement"];
const GAL_CATS = [
  "Classes",
  "Facilities",
  "Members",
  "Events",
  "Transformation",
];

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

function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  full = false,
}: any) {
  const s: any = {
    primary: { background: "hsl(20 100% 50%)", color: "#000", border: "none" },
    ghost: {
      background: "transparent",
      color: "hsl(20 100% 50%)",
      border: "1px solid hsl(20 100% 50%)",
    },
    danger: { background: "hsl(0 84% 51%)", color: "#fff", border: "none" },
    subtle: {
      background: "hsl(var(--secondary))",
      color: "hsl(var(--foreground))",
      border: "1px solid hsl(var(--border))",
    },
  }[variant];
  const pad = { sm: "6px 14px", md: "9px 20px", lg: "12px 28px" }[size];
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

function MToast({ msg, type, onDone }: any) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg: any =
    {
      success: "hsl(142 72% 37%)",
      error: "hsl(0 84% 51%)",
      info: "hsl(20 100% 50%)",
    }[type] || "hsl(20 100% 50%)";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color: type === "error" ? "#fff" : "#000",
        borderRadius: 10,
        padding: "12px 20px",
        fontWeight: 700,
        fontSize: 13,
        fontFamily: "var(--font-body)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
      }}
    >
      {msg}
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const check = () =>
    pw === ADMIN_PASSWORD
      ? onLogin()
      : (setErr("Incorrect password"), setPw(""));
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(var(--background))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 16,
          padding: "36px 32px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            letterSpacing: "0.15em",
            color: "hsl(20 100% 50%)",
            marginBottom: 4,
          }}
        >
          MK2 ADMIN
        </div>
        <div
          style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            marginBottom: 24,
          }}
        >
          Management Portal — Authorised Access Only
        </div>
        <label style={lbl}>Admin Password</label>
        <input
          type="password"
          style={{ ...inp, marginBottom: 8 }}
          placeholder="Enter password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        {err && (
          <div
            style={{ fontSize: 12, color: "hsl(0 84% 51%)", marginBottom: 10 }}
          >
            {err}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Btn variant="primary" size="lg" onClick={check} full>
            Enter Admin Panel →
          </Btn>
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
          }}
        >
          Change password in{" "}
          <code style={{ color: "hsl(20 100% 50%)" }}>src/pages/Admin.tsx</code>{" "}
          line 7
        </div>
      </div>
    </div>
  );
}

function ClassesManager({ toast }: any) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const blank = {
    name: "",
    time: "",
    trainer: "",
    day: "Monday",
    spots: "12",
    duration: "45 min",
    intensity: "Medium",
    category: "Cardio",
    subtitle: "",
    details: "",
  };
  const [form, setForm] = useState(blank);

  const load = async () => {
    setLoading(true);
    setClasses(await fetchCollection("admin_classes"));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name || !form.time || !form.trainer)
      return toast("Fill in Name, Time and Trainer", "error");
    const data = {
      ...form,
      spots: parseInt(form.spots),
      details: form.details.split("\n").filter(Boolean),
    };
    if (editing) {
      await updateInCollection("admin_classes", editing.id, data);
      toast("Updated ✓", "success");
    } else {
      await addToCollection("admin_classes", data);
      toast("Class added ✓", "success");
    }
    setShowForm(false);
    setEditing(null);
    setForm(blank);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    await deleteFromCollection("admin_classes", id);
    toast("Deleted", "info");
    load();
  };
  const startEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name,
      time: c.time,
      trainer: c.trainer,
      day: c.day,
      spots: String(c.spots),
      duration: c.duration,
      intensity: c.intensity,
      category: c.category,
      subtitle: c.subtitle || "",
      details: (c.details || []).join("\n"),
    });
    setShowForm(true);
  };
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Classes ({classes.length})
        </div>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm(blank);
          }}
        >
          {showForm ? "✕ Cancel" : "+ Add Class"}
        </Btn>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              {editing ? "Edit Class" : "New Class"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              {(
                [
                  ["name", "Class Name", "e.g. HIIT Blast"],
                  ["time", "Time", "06:00"],
                  ["trainer", "Trainer", "Coach Sipho"],
                  ["spots", "Max Spots", "12"],
                  ["duration", "Duration", "45 min"],
                  ["subtitle", "Subtitle", "Short description"],
                ] as any[]
              ).map(([k, l, p]: any) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <input
                    style={inp}
                    placeholder={p}
                    value={(form as any)[k]}
                    onChange={f(k)}
                  />
                </div>
              ))}
              {(
                [
                  ["day", "Day", DAYS],
                  ["category", "Category", CATS],
                  ["intensity", "Intensity", INTENSITIES],
                ] as any[]
              ).map(([k, l, opts]: any) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <select style={inp} value={(form as any)[k]} onChange={f(k)}>
                    {opts.map((o: string) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>What's Included (one item per line)</label>
              <textarea
                style={{ ...inp, minHeight: 80, resize: "vertical" }}
                placeholder={
                  "10 rounds Tabata\nKettlebell swings\nBurns 400–600 kcal"
                }
                value={form.details}
                onChange={f("details")}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                {editing ? "Save Changes" : "Add Class"}
              </Btn>
              <Btn
                variant="subtle"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : classes.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No classes yet. Add your first class above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {classes.map((cls) => (
            <div
              key={cls.id}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{cls.name}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 2,
                  }}
                >
                  {cls.day} · {cls.time} · {cls.trainer} · {cls.spots} spots
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="subtle" size="sm" onClick={() => startEdit(cls)}>
                  Edit
                </Btn>
                <Btn variant="danger" size="sm" onClick={() => del(cls.id)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryManager({ toast }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const blank = {
    label: "",
    category: "Classes",
    emoji: "🔥",
    desc: "",
    imageUrl: "",
  };
  const [form, setForm] = useState(blank);
  const EMOJIS = [
    "🔥",
    "🏋️",
    "🧘",
    "💪",
    "🥊",
    "🚴",
    "🎉",
    "⚡",
    "🛁",
    "🏆",
    "📸",
    "🤸",
  ];

  const load = async () => {
    setLoading(true);
    setItems(await fetchCollection("admin_gallery"));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (!form.label) return toast("Enter a label", "error");
    await addToCollection("admin_gallery", form);
    toast("Added ✓", "success");
    setShowForm(false);
    setForm(blank);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await deleteFromCollection("admin_gallery", id);
    toast("Deleted", "info");
    load();
  };
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Gallery ({items.length})
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Item"}
        </Btn>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={lbl}>Label</label>
                <input
                  style={inp}
                  placeholder="e.g. HIIT Session"
                  value={form.label}
                  onChange={f("label")}
                />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select
                  style={inp}
                  value={form.category}
                  onChange={f("category")}
                >
                  {GAL_CATS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Emoji</label>
                <select style={inp} value={form.emoji} onChange={f("emoji")}>
                  {EMOJIS.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Image URL (optional)</label>
                <input
                  style={inp}
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={f("imageUrl")}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <textarea
                style={{ ...inp, minHeight: 60, resize: "vertical" }}
                placeholder="Describe this item…"
                value={form.desc}
                onChange={f("desc")}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                marginBottom: 14,
              }}
            >
              💡 Once Instagram API is approved, posts auto-sync here.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                Add to Gallery
              </Btn>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No items yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 10,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 90,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  background: "hsl(var(--background))",
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  item.emoji
                )}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 2,
                  }}
                >
                  {item.category}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
                    Delete
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsManager({ toast }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const blank = { title: "", type: "News", date: "", desc: "", emoji: "📢" };
  const [form, setForm] = useState(blank);
  const EMOJIS = [
    "📢",
    "🏆",
    "🚴",
    "🏃",
    "🥊",
    "🛁",
    "🎉",
    "⚡",
    "🌟",
    "📅",
    "💪",
    "🎯",
  ];

  const load = async () => {
    setLoading(true);
    setItems(await fetchCollection("admin_news"));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (!form.title || !form.date)
      return toast("Fill in Title and Date", "error");
    await addToCollection("admin_news", form);
    toast("Published ✓", "success");
    setShowForm(false);
    setForm(blank);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await deleteFromCollection("admin_news", id);
    toast("Deleted", "info");
    load();
  };
  const f = (k: string) => (e: any) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          News & Events ({items.length})
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Post"}
        </Btn>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Title</label>
                <input
                  style={inp}
                  placeholder="e.g. 30-Day Challenge!"
                  value={form.title}
                  onChange={f("title")}
                />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select style={inp} value={form.type} onChange={f("type")}>
                  {NEWS_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input
                  style={inp}
                  placeholder="e.g. 1 Apr 2026"
                  value={form.date}
                  onChange={f("date")}
                />
              </div>
              <div>
                <label style={lbl}>Emoji</label>
                <select style={inp} value={form.emoji} onChange={f("emoji")}>
                  {EMOJIS.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <textarea
                style={{ ...inp, minHeight: 80, resize: "vertical" }}
                placeholder="Describe the news or event…"
                value={form.desc}
                onChange={f("desc")}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                Publish
              </Btn>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No posts yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "hsl(20 100% 50% / 0.15)",
                      color: "hsl(20 100% 50%)",
                    }}
                  >
                    {item.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                    marginTop: 3,
                  }}
                >
                  {item.date}
                </div>
              </div>
              <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
                Delete
              </Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// STEP 2: MembersManager component (inserted here)
function MembersManager({ toast }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const TIER_CONFIG = {
    basic: { color: "#9ca3af", label: "Basic" },
    silver: { color: "#e2e8f0", label: "Silver" },
    gold: { color: "hsl(38 92% 50%)", label: "Gold" },
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([uid, val]: [string, any]) => ({
          uid,
          ...val,
          membership: val.membership ?? "basic",
        }));
        setMembers(list.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch (e) {
      toast("Failed to load members", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const setTier = async (uid: string, tier: string) => {
    setSaving(uid);
    try {
      await set(ref(db, `mk2_users/${uid}/membership`), tier);
      setMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, membership: tier } : m)),
      );
      toast(`Tier updated to ${tier} ✓`, "success");
    } catch {
      toast("Update failed", "error");
    }
    setSaving(null);
  };

  const filtered = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Members ({members.length})
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ ...inp, width: 200 }}
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Btn variant="subtle" size="sm" onClick={loadMembers}>
            ↻ Refresh
          </Btn>
        </div>
      </div>

      {/* Tier summary */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        {(["basic", "silver", "gold"] as const).map((t) => {
          const count = members.filter(
            (m) => (m.membership ?? "basic") === t,
          ).length;
          const cfg = TIER_CONFIG[t];
          return (
            <div
              key={t}
              style={{
                background: `${cfg.color}15`,
                border: `1px solid ${cfg.color}40`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: cfg.color,
              }}
            >
              {cfg.label}: {count}
            </div>
          );
        })}
      </div>

      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading members…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          No members found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((m) => {
            const cfg =
              TIER_CONFIG[
                (m.membership ?? "basic") as keyof typeof TIER_CONFIG
              ];
            return (
              <div
                key={m.uid}
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {m.name || "Unnamed"}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: `${cfg.color}20`,
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "hsl(var(--muted-foreground))",
                      marginTop: 2,
                    }}
                  >
                    {m.email} · {m.points ?? 0} pts · {m.checkIns?.length ?? 0}{" "}
                    check-ins
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select
                    value={m.membership ?? "basic"}
                    onChange={(e) => setTier(m.uid, e.target.value)}
                    disabled={saving === m.uid}
                    style={{
                      ...inp,
                      width: "auto",
                      padding: "6px 10px",
                      fontSize: 12,
                      borderColor: cfg.color,
                      color: cfg.color,
                    }}
                  >
                    <option value="basic">Basic (Free)</option>
                    <option value="silver">Silver (R19/mo)</option>
                    <option value="gold">Gold (R49/mo)</option>
                  </select>
                  {saving === m.uid && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      Saving…
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InstagramSetup() {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
        Instagram Auto-Sync Setup
      </div>
      <div
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(20 100% 50% / 0.3)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: "hsl(20 100% 50%)",
            marginBottom: 8,
          }}
        >
          Status: Pending Meta Approval
        </div>
        <div
          style={{
            fontSize: 13,
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.8,
          }}
        >
          Once approved, new posts on the gym's Instagram will automatically
          appear in the Gallery section.
        </div>
      </div>
      {[
        [
          "1",
          "Go to developers.facebook.com",
          "Log in with the Facebook account linked to the gym's Instagram. Click 'My Apps' → 'Create App'.",
        ],
        [
          "2",
          "Create a Consumer App",
          "Select 'Consumer' as app type. Name it 'MK2 Rivers Gallery'. Fill in your contact email.",
        ],
        [
          "3",
          "Add Instagram Basic Display",
          "In the dashboard click 'Add Product' → 'Instagram Basic Display' → 'Set Up'.",
        ],
        [
          "4",
          "Add the gym's Instagram account",
          "Under User Token Generator, add the gym's Instagram as a test user.",
        ],
        [
          "5",
          "Submit for App Review",
          "Go to App Review → request 'instagram_graph_user_media'. Explain you want to show your own gym posts on your website.",
        ],
        [
          "6",
          "Share the Access Token",
          "Once approved (1–5 days, free), generate a long-lived token and share with your developer.",
        ],
      ].map(([step, title, desc]) => (
        <div key={step} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "hsl(20 100% 50%)",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {step}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
              {title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "hsl(var(--muted-foreground))",
                lineHeight: 1.6,
              }}
            >
              {desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// STEP 3: Updated TABS array with "members" as the first item
const TABS = [
  { id: "members", label: "👥 Members", desc: "Manage user tiers" },
  { id: "classes", label: "📅 Classes", desc: "Manage schedule & coaches" },
  { id: "gallery", label: "📸 Gallery", desc: "Add & remove gallery items" },
  { id: "news", label: "📢 News & Events", desc: "Post updates and events" },
  { id: "instagram", label: "📱 Instagram", desc: "Auto-sync Instagram posts" },
];

export function Admin() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem("mk2admin") === "true",
  );
  const [tab, setTab] = useState("members"); // default to members now
  const [toastQ, setToastQ] = useState<any>(null);
  const { isMobile } = useBreakpoint();
  const toast = (msg: string, type: string) => setToastQ({ msg, type });
  const login = () => {
    sessionStorage.setItem("mk2admin", "true");
    setAuthed(true);
  };
  const logout = () => {
    sessionStorage.removeItem("mk2admin");
    setAuthed(false);
  };

  if (!authed) return <AdminLogin onLogin={login} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "var(--font-body)",
        paddingBottom: 40,
      }}
    >
      <nav
        style={{
          background: "hsl(0 0% 4%)",
          borderBottom: "1px solid hsl(var(--border))",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            letterSpacing: "0.15em",
            color: "hsl(20 100% 50%)",
          }}
        >
          MK2 ADMIN
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            Management Portal
          </span>
          <Btn variant="subtle" size="sm" onClick={logout}>
            Sign Out
          </Btn>
        </div>
      </nav>
      <div
        style={{
          maxWidth: 1060,
          margin: "0 auto",
          padding: isMobile ? "20px 14px" : "32px 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background:
                  tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--card))",
                color: tab === t.id ? "#000" : "hsl(var(--foreground))",
                border: `1px solid ${tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                borderRadius: 10,
                padding: "14px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>
                {t.desc}
              </div>
            </button>
          ))}
        </div>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 14,
            padding: isMobile ? 16 : 24,
          }}
        >
          {/* STEP 4: Render the new MembersManager */}
          {tab === "members" && <MembersManager toast={toast} />}
          {tab === "classes" && <ClassesManager toast={toast} />}
          {tab === "gallery" && <GalleryManager toast={toast} />}
          {tab === "news" && <NewsManager toast={toast} />}
          {tab === "instagram" && <InstagramSetup />}
        </motion.div>
      </div>
      {toastQ && <MToast {...toastQ} onDone={() => setToastQ(null)} />}
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import {
//   fetchCollection,
//   addToCollection,
//   updateInCollection,
//   deleteFromCollection,
// } from "@/lib/firebase";

// import { motion, AnimatePresence } from "framer-motion";

// const ADMIN_PASSWORD = "MK2Admin2026";

// const DAYS = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
//   "Sunday",
// ];
// const CATS = [
//   "Cardio",
//   "Strength",
//   "Flexibility",
//   "Core",
//   "Combat",
//   "CrossFit",
//   "Recovery",
//   "Spin",
//   "Yoga",
// ];
// const INTENSITIES = [
//   "Low",
//   "Low–Medium",
//   "Medium",
//   "Medium–High",
//   "High",
//   "Very High",
// ];
// const NEWS_TYPES = ["News", "Event", "Announcement"];
// const GAL_CATS = [
//   "Classes",
//   "Facilities",
//   "Members",
//   "Events",
//   "Transformation",
// ];

// const inp: any = {
//   width: "100%",
//   background: "hsl(var(--secondary))",
//   border: "1px solid hsl(var(--border))",
//   borderRadius: 8,
//   padding: "10px 14px",
//   color: "hsl(var(--foreground))",
//   fontSize: 13,
//   outline: "none",
//   fontFamily: "var(--font-body)",
//   boxSizing: "border-box",
// };
// const lbl: any = {
//   fontSize: 10,
//   fontWeight: 700,
//   textTransform: "uppercase",
//   letterSpacing: "0.1em",
//   color: "hsl(var(--muted-foreground))",
//   display: "block",
//   marginBottom: 6,
// };

// function Btn({
//   children,
//   onClick,
//   variant = "primary",
//   size = "md",
//   disabled = false,
//   full = false,
// }: any) {
//   const s: any = {
//     primary: { background: "hsl(20 100% 50%)", color: "#000", border: "none" },
//     ghost: {
//       background: "transparent",
//       color: "hsl(20 100% 50%)",
//       border: "1px solid hsl(20 100% 50%)",
//     },
//     danger: { background: "hsl(0 84% 51%)", color: "#fff", border: "none" },
//     subtle: {
//       background: "hsl(var(--secondary))",
//       color: "hsl(var(--foreground))",
//       border: "1px solid hsl(var(--border))",
//     },
//   }[variant];
//   const pad = { sm: "6px 14px", md: "9px 20px", lg: "12px 28px" }[size];
//   return (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       style={{
//         ...s,
//         padding: pad,
//         fontSize: 11,
//         fontWeight: 700,
//         fontFamily: "var(--font-body)",
//         letterSpacing: "0.05em",
//         textTransform: "uppercase",
//         borderRadius: 8,
//         cursor: disabled ? "not-allowed" : "pointer",
//         opacity: disabled ? 0.5 : 1,
//         width: full ? "100%" : "auto",
//         display: "inline-flex",
//         alignItems: "center",
//         gap: 6,
//       }}
//     >
//       {children}
//     </button>
//   );
// }

// function MToast({ msg, type, onDone }: any) {
//   useEffect(() => {
//     const t = setTimeout(onDone, 3000);
//     return () => clearTimeout(t);
//   }, [onDone]);
//   const bg: any =
//     {
//       success: "hsl(142 72% 37%)",
//       error: "hsl(0 84% 51%)",
//       info: "hsl(20 100% 50%)",
//     }[type] || "hsl(20 100% 50%)";
//   return (
//     <div
//       style={{
//         position: "fixed",
//         bottom: 24,
//         right: 24,
//         zIndex: 9999,
//         background: bg,
//         color: type === "error" ? "#fff" : "#000",
//         borderRadius: 10,
//         padding: "12px 20px",
//         fontWeight: 700,
//         fontSize: 13,
//         fontFamily: "var(--font-body)",
//         boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
//       }}
//     >
//       {msg}
//     </div>
//   );
// }

// function AdminLogin({ onLogin }: { onLogin: () => void }) {
//   const [pw, setPw] = useState("");
//   const [err, setErr] = useState("");
//   const check = () =>
//     pw === ADMIN_PASSWORD
//       ? onLogin()
//       : (setErr("Incorrect password"), setPw(""));
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "hsl(var(--background))",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: 20,
//       }}
//     >
//       <div
//         style={{
//           width: "100%",
//           maxWidth: 380,
//           background: "hsl(var(--card))",
//           border: "1px solid hsl(var(--border))",
//           borderRadius: 16,
//           padding: "36px 32px",
//         }}
//       >
//         <div
//           style={{
//             fontFamily: "var(--font-display)",
//             fontSize: 26,
//             letterSpacing: "0.15em",
//             color: "hsl(20 100% 50%)",
//             marginBottom: 4,
//           }}
//         >
//           MK2 ADMIN
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 24,
//           }}
//         >
//           Management Portal — Authorised Access Only
//         </div>
//         <label style={lbl}>Admin Password</label>
//         <input
//           type="password"
//           style={{ ...inp, marginBottom: 8 }}
//           placeholder="Enter password"
//           value={pw}
//           onChange={(e) => setPw(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && check()}
//         />
//         {err && (
//           <div
//             style={{ fontSize: 12, color: "hsl(0 84% 51%)", marginBottom: 10 }}
//           >
//             {err}
//           </div>
//         )}
//         <div style={{ marginTop: 14 }}>
//           <Btn variant="primary" size="lg" onClick={check} full>
//             Enter Admin Panel →
//           </Btn>
//         </div>
//         <div
//           style={{
//             marginTop: 14,
//             fontSize: 11,
//             color: "hsl(var(--muted-foreground))",
//           }}
//         >
//           Change password in{" "}
//           <code style={{ color: "hsl(20 100% 50%)" }}>src/pages/Admin.tsx</code>{" "}
//           line 7
//         </div>
//       </div>
//     </div>
//   );
// }

// function ClassesManager({ toast }: any) {
//   const [classes, setClasses] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [editing, setEditing] = useState<any>(null);
//   const blank = {
//     name: "",
//     time: "",
//     trainer: "",
//     day: "Monday",
//     spots: "12",
//     duration: "45 min",
//     intensity: "Medium",
//     category: "Cardio",
//     subtitle: "",
//     details: "",
//   };
//   const [form, setForm] = useState(blank);

//   const load = async () => {
//     setLoading(true);
//     setClasses(await fetchCollection("admin_classes"));
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);

//   const save = async () => {
//     if (!form.name || !form.time || !form.trainer)
//       return toast("Fill in Name, Time and Trainer", "error");
//     const data = {
//       ...form,
//       spots: parseInt(form.spots),
//       details: form.details.split("\n").filter(Boolean),
//     };
//     if (editing) {
//       await updateInCollection("admin_classes", editing.id, data);
//       toast("Updated ✓", "success");
//     } else {
//       await addToCollection("admin_classes", data);
//       toast("Class added ✓", "success");
//     }
//     setShowForm(false);
//     setEditing(null);
//     setForm(blank);
//     load();
//   };

//   const del = async (id: string) => {
//     if (!confirm("Delete this class?")) return;
//     await deleteFromCollection("admin_classes", id);
//     toast("Deleted", "info");
//     load();
//   };
//   const startEdit = (c: any) => {
//     setEditing(c);
//     setForm({
//       name: c.name,
//       time: c.time,
//       trainer: c.trainer,
//       day: c.day,
//       spots: String(c.spots),
//       duration: c.duration,
//       intensity: c.intensity,
//       category: c.category,
//       subtitle: c.subtitle || "",
//       details: (c.details || []).join("\n"),
//     });
//     setShowForm(true);
//   };
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Classes ({classes.length})
//         </div>
//         <Btn
//           variant="primary"
//           size="sm"
//           onClick={() => {
//             setShowForm(!showForm);
//             setEditing(null);
//             setForm(blank);
//           }}
//         >
//           {showForm ? "✕ Cancel" : "+ Add Class"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               {editing ? "Edit Class" : "New Class"}
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               {(
//                 [
//                   ["name", "Class Name", "e.g. HIIT Blast"],
//                   ["time", "Time", "06:00"],
//                   ["trainer", "Trainer", "Coach Sipho"],
//                   ["spots", "Max Spots", "12"],
//                   ["duration", "Duration", "45 min"],
//                   ["subtitle", "Subtitle", "Short description"],
//                 ] as any[]
//               ).map(([k, l, p]: any) => (
//                 <div key={k}>
//                   <label style={lbl}>{l}</label>
//                   <input
//                     style={inp}
//                     placeholder={p}
//                     value={(form as any)[k]}
//                     onChange={f(k)}
//                   />
//                 </div>
//               ))}
//               {(
//                 [
//                   ["day", "Day", DAYS],
//                   ["category", "Category", CATS],
//                   ["intensity", "Intensity", INTENSITIES],
//                 ] as any[]
//               ).map(([k, l, opts]: any) => (
//                 <div key={k}>
//                   <label style={lbl}>{l}</label>
//                   <select style={inp} value={(form as any)[k]} onChange={f(k)}>
//                     {opts.map((o: string) => (
//                       <option key={o}>{o}</option>
//                     ))}
//                   </select>
//                 </div>
//               ))}
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>What's Included (one item per line)</label>
//               <textarea
//                 style={{ ...inp, minHeight: 80, resize: "vertical" }}
//                 placeholder={
//                   "10 rounds Tabata\nKettlebell swings\nBurns 400–600 kcal"
//                 }
//                 value={form.details}
//                 onChange={f("details")}
//               />
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 {editing ? "Save Changes" : "Add Class"}
//               </Btn>
//               <Btn
//                 variant="subtle"
//                 onClick={() => {
//                   setShowForm(false);
//                   setEditing(null);
//                 }}
//               >
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : classes.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No classes yet. Add your first class above.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {classes.map((cls) => (
//             <div
//               key={cls.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//                 gap: 10,
//               }}
//             >
//               <div>
//                 <div style={{ fontWeight: 700, fontSize: 14 }}>{cls.name}</div>
//                 <div
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                   }}
//                 >
//                   {cls.day} · {cls.time} · {cls.trainer} · {cls.spots} spots
//                 </div>
//               </div>
//               <div style={{ display: "flex", gap: 8 }}>
//                 <Btn variant="subtle" size="sm" onClick={() => startEdit(cls)}>
//                   Edit
//                 </Btn>
//                 <Btn variant="danger" size="sm" onClick={() => del(cls.id)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function GalleryManager({ toast }: any) {
//   const [items, setItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const blank = {
//     label: "",
//     category: "Classes",
//     emoji: "🔥",
//     desc: "",
//     imageUrl: "",
//   };
//   const [form, setForm] = useState(blank);
//   const EMOJIS = [
//     "🔥",
//     "🏋️",
//     "🧘",
//     "💪",
//     "🥊",
//     "🚴",
//     "🎉",
//     "⚡",
//     "🛁",
//     "🏆",
//     "📸",
//     "🤸",
//   ];

//   const load = async () => {
//     setLoading(true);
//     setItems(await fetchCollection("admin_gallery"));
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const save = async () => {
//     if (!form.label) return toast("Enter a label", "error");
//     await addToCollection("admin_gallery", form);
//     toast("Added ✓", "success");
//     setShowForm(false);
//     setForm(blank);
//     load();
//   };
//   const del = async (id: string) => {
//     if (!confirm("Delete?")) return;
//     await deleteFromCollection("admin_gallery", id);
//     toast("Deleted", "info");
//     load();
//   };
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Gallery ({items.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
//           {showForm ? "✕ Cancel" : "+ Add Item"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div>
//                 <label style={lbl}>Label</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. HIIT Session"
//                   value={form.label}
//                   onChange={f("label")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Category</label>
//                 <select
//                   style={inp}
//                   value={form.category}
//                   onChange={f("category")}
//                 >
//                   {GAL_CATS.map((c) => (
//                     <option key={c}>{c}</option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Emoji</label>
//                 <select style={inp} value={form.emoji} onChange={f("emoji")}>
//                   {EMOJIS.map((e) => (
//                     <option key={e}>{e}</option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Image URL (optional)</label>
//                 <input
//                   style={inp}
//                   placeholder="https://..."
//                   value={form.imageUrl}
//                   onChange={f("imageUrl")}
//                 />
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <textarea
//                 style={{ ...inp, minHeight: 60, resize: "vertical" }}
//                 placeholder="Describe this item…"
//                 value={form.desc}
//                 onChange={f("desc")}
//               />
//             </div>
//             <div
//               style={{
//                 fontSize: 11,
//                 color: "hsl(var(--muted-foreground))",
//                 marginBottom: 14,
//               }}
//             >
//               💡 Once Instagram API is approved, posts auto-sync here.
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 Add to Gallery
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : items.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No items yet.
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
//             gap: 10,
//           }}
//         >
//           {items.map((item) => (
//             <div
//               key={item.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 overflow: "hidden",
//               }}
//             >
//               <div
//                 style={{
//                   height: 90,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   fontSize: 44,
//                   background: "hsl(var(--background))",
//                 }}
//               >
//                 {item.imageUrl ? (
//                   <img
//                     src={item.imageUrl}
//                     alt={item.label}
//                     style={{
//                       width: "100%",
//                       height: "100%",
//                       objectFit: "cover",
//                     }}
//                   />
//                 ) : (
//                   item.emoji
//                 )}
//               </div>
//               <div style={{ padding: "10px 12px" }}>
//                 <div style={{ fontWeight: 700, fontSize: 13 }}>
//                   {item.label}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 2,
//                   }}
//                 >
//                   {item.category}
//                 </div>
//                 <div style={{ marginTop: 8 }}>
//                   <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
//                     Delete
//                   </Btn>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function NewsManager({ toast }: any) {
//   const [items, setItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const blank = { title: "", type: "News", date: "", desc: "", emoji: "📢" };
//   const [form, setForm] = useState(blank);
//   const EMOJIS = [
//     "📢",
//     "🏆",
//     "🚴",
//     "🏃",
//     "🥊",
//     "🛁",
//     "🎉",
//     "⚡",
//     "🌟",
//     "📅",
//     "💪",
//     "🎯",
//   ];

//   const load = async () => {
//     setLoading(true);
//     setItems(await fetchCollection("admin_news"));
//     setLoading(false);
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const save = async () => {
//     if (!form.title || !form.date)
//       return toast("Fill in Title and Date", "error");
//     await addToCollection("admin_news", form);
//     toast("Published ✓", "success");
//     setShowForm(false);
//     setForm(blank);
//     load();
//   };
//   const del = async (id: string) => {
//     if (!confirm("Delete?")) return;
//     await deleteFromCollection("admin_news", id);
//     toast("Deleted", "info");
//     load();
//   };
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 16,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           News & Events ({items.length})
//         </div>
//         <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
//           {showForm ? "✕ Cancel" : "+ Add Post"}
//         </Btn>
//       </div>
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div style={{ gridColumn: "1/-1" }}>
//                 <label style={lbl}>Title</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 30-Day Challenge!"
//                   value={form.title}
//                   onChange={f("title")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Type</label>
//                 <select style={inp} value={form.type} onChange={f("type")}>
//                   {NEWS_TYPES.map((t) => (
//                     <option key={t}>{t}</option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <label style={lbl}>Date</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 1 Apr 2026"
//                   value={form.date}
//                   onChange={f("date")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Emoji</label>
//                 <select style={inp} value={form.emoji} onChange={f("emoji")}>
//                   {EMOJIS.map((e) => (
//                     <option key={e}>{e}</option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <textarea
//                 style={{ ...inp, minHeight: 80, resize: "vertical" }}
//                 placeholder="Describe the news or event…"
//                 value={form.desc}
//                 onChange={f("desc")}
//               />
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 Publish
//               </Btn>
//               <Btn variant="subtle" onClick={() => setShowForm(false)}>
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : items.length === 0 ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           No posts yet.
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {items.map((item) => (
//             <div
//               key={item.id}
//               style={{
//                 background: "hsl(var(--secondary))",
//                 border: "1px solid hsl(var(--border))",
//                 borderRadius: 10,
//                 padding: "12px 16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 flexWrap: "wrap",
//                 gap: 10,
//               }}
//             >
//               <div>
//                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                   <span style={{ fontSize: 20 }}>{item.emoji}</span>
//                   <span style={{ fontWeight: 700, fontSize: 14 }}>
//                     {item.title}
//                   </span>
//                   <span
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 700,
//                       padding: "2px 8px",
//                       borderRadius: 20,
//                       background: "hsl(20 100% 50% / 0.15)",
//                       color: "hsl(20 100% 50%)",
//                     }}
//                   >
//                     {item.type}
//                   </span>
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                     marginTop: 3,
//                   }}
//                 >
//                   {item.date}
//                 </div>
//               </div>
//               <Btn variant="danger" size="sm" onClick={() => del(item.id)}>
//                 Delete
//               </Btn>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function InstagramSetup() {
//   return (
//     <div>
//       <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
//         Instagram Auto-Sync Setup
//       </div>
//       <div
//         style={{
//           background: "hsl(var(--secondary))",
//           border: "1px solid hsl(20 100% 50% / 0.3)",
//           borderRadius: 12,
//           padding: 20,
//           marginBottom: 20,
//         }}
//       >
//         <div
//           style={{
//             fontWeight: 700,
//             color: "hsl(20 100% 50%)",
//             marginBottom: 8,
//           }}
//         >
//           Status: Pending Meta Approval
//         </div>
//         <div
//           style={{
//             fontSize: 13,
//             color: "hsl(var(--muted-foreground))",
//             lineHeight: 1.8,
//           }}
//         >
//           Once approved, new posts on the gym's Instagram will automatically
//           appear in the Gallery section.
//         </div>
//       </div>
//       {[
//         [
//           "1",
//           "Go to developers.facebook.com",
//           "Log in with the Facebook account linked to the gym's Instagram. Click 'My Apps' → 'Create App'.",
//         ],
//         [
//           "2",
//           "Create a Consumer App",
//           "Select 'Consumer' as app type. Name it 'MK2 Rivers Gallery'. Fill in your contact email.",
//         ],
//         [
//           "3",
//           "Add Instagram Basic Display",
//           "In the dashboard click 'Add Product' → 'Instagram Basic Display' → 'Set Up'.",
//         ],
//         [
//           "4",
//           "Add the gym's Instagram account",
//           "Under User Token Generator, add the gym's Instagram as a test user.",
//         ],
//         [
//           "5",
//           "Submit for App Review",
//           "Go to App Review → request 'instagram_graph_user_media'. Explain you want to show your own gym posts on your website.",
//         ],
//         [
//           "6",
//           "Share the Access Token",
//           "Once approved (1–5 days, free), generate a long-lived token and share with your developer.",
//         ],
//       ].map(([step, title, desc]) => (
//         <div key={step} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
//           <div
//             style={{
//               width: 28,
//               height: 28,
//               borderRadius: "50%",
//               background: "hsl(20 100% 50%)",
//               color: "#000",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               fontWeight: 900,
//               fontSize: 13,
//               flexShrink: 0,
//             }}
//           >
//             {step}
//           </div>
//           <div>
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
//               {title}
//             </div>
//             <div
//               style={{
//                 fontSize: 12,
//                 color: "hsl(var(--muted-foreground))",
//                 lineHeight: 1.6,
//               }}
//             >
//               {desc}
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// const TABS = [
//   { id: "classes", label: "📅 Classes", desc: "Manage schedule & coaches" },
//   { id: "gallery", label: "📸 Gallery", desc: "Add & remove gallery items" },
//   { id: "news", label: "📢 News & Events", desc: "Post updates and events" },
//   { id: "instagram", label: "📱 Instagram", desc: "Auto-sync Instagram posts" },
// ];

// export function Admin() {
//   const [authed, setAuthed] = useState(
//     () => sessionStorage.getItem("mk2admin") === "true",
//   );
//   const [tab, setTab] = useState("classes");
//   const [toastQ, setToastQ] = useState<any>(null);
//   const { isMobile } = useBreakpoint();
//   const toast = (msg: string, type: string) => setToastQ({ msg, type });
//   const login = () => {
//     sessionStorage.setItem("mk2admin", "true");
//     setAuthed(true);
//   };
//   const logout = () => {
//     sessionStorage.removeItem("mk2admin");
//     setAuthed(false);
//   };

//   if (!authed) return <AdminLogin onLogin={login} />;

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "hsl(var(--background))",
//         color: "hsl(var(--foreground))",
//         fontFamily: "var(--font-body)",
//         paddingBottom: 40,
//       }}
//     >
//       <nav
//         style={{
//           background: "hsl(0 0% 4%)",
//           borderBottom: "1px solid hsl(var(--border))",
//           padding: "0 24px",
//           height: 56,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           position: "sticky",
//           top: 0,
//           zIndex: 100,
//         }}
//       >
//         <div
//           style={{
//             fontFamily: "var(--font-display)",
//             fontSize: 20,
//             letterSpacing: "0.15em",
//             color: "hsl(20 100% 50%)",
//           }}
//         >
//           MK2 ADMIN
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
//             Management Portal
//           </span>
//           <Btn variant="subtle" size="sm" onClick={logout}>
//             Sign Out
//           </Btn>
//         </div>
//       </nav>
//       <div
//         style={{
//           maxWidth: 1060,
//           margin: "0 auto",
//           padding: isMobile ? "20px 14px" : "32px 24px",
//         }}
//       >
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
//             gap: 10,
//             marginBottom: 28,
//           }}
//         >
//           {TABS.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => setTab(t.id)}
//               style={{
//                 background:
//                   tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--card))",
//                 color: tab === t.id ? "#000" : "hsl(var(--foreground))",
//                 border: `1px solid ${tab === t.id ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                 borderRadius: 10,
//                 padding: "14px 16px",
//                 textAlign: "left",
//                 cursor: "pointer",
//                 fontFamily: "var(--font-body)",
//                 transition: "all 0.15s",
//               }}
//             >
//               <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
//               <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>
//                 {t.desc}
//               </div>
//             </button>
//           ))}
//         </div>
//         <motion.div
//           key={tab}
//           initial={{ opacity: 0, y: 6 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.2 }}
//           style={{
//             background: "hsl(var(--card))",
//             border: "1px solid hsl(var(--border))",
//             borderRadius: 14,
//             padding: isMobile ? 16 : 24,
//           }}
//         >
//           {tab === "classes" && <ClassesManager toast={toast} />}
//           {tab === "gallery" && <GalleryManager toast={toast} />}
//           {tab === "news" && <NewsManager toast={toast} />}
//           {tab === "instagram" && <InstagramSetup />}
//         </motion.div>
//       </div>
//       {toastQ && <MToast {...toastQ} onDone={() => setToastQ(null)} />}
//     </div>
//   );
// }
