import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent, db, storage } from "@/lib/firebase";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";
import {
  ref,
  push,
  onValue,
  remove,
  set,
  update,
  get,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import imageCompression from "browser-image-compression";
import { requestNotificationPermission } from "@/lib/firebase-messaging";

import ChatHeader from "@/components/ui/ChatHeader";
import ChatInput from "@/components/ui/ChatInput";
import RoomCard from "@/components/ui/RoomCard";
import MessageBubble from "@/components/ui/MessageBubble";
import PollMessage from "@/components/ui/PollMessage";
import MessageMenu from "@/components/ui/MessageMenu";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  text: string;
  user: string;
  uid: string;
  createdAt: number;
  reactions?: { [key: string]: string[] };
  edited?: boolean;
}

interface FeedPost {
  id: number;
  author: string;
  color: string;
  text: string;
  likes: number;
  date: string;
}

interface Room {
  name: string;
  desc: string;
}

// ── Fallback rooms (used when community_rooms hasn't been written to Firebase yet) ──

const FALLBACK_ROOMS: Room[] = [
  { name: "💬 MK2R General", desc: "News, updates & schedules." },
  { name: "🏆 MK2R Competitive Group", desc: "Competition prep & strategy" },
  { name: "🔥 MK2R Hyrox", desc: "HYROX training & performance talk" },
  {
    name: "💼 MK2R Business Hub",
    desc: "Business, partnerships & growth discussions",
  },
];

// ── Seed feed posts (local only — shown until real feed is implemented) ────────

const SEED_POSTS: FeedPost[] = [
  {
    id: 1,
    author: "Coach Sipho",
    color: "hsl(20 100% 50%)",
    text: "Tuesday HIIT was FIRE 🔥 Proud of everyone who pushed through the last round. See you Thursday!",
    likes: 12,
    date: "2 days ago",
  },
  {
    id: 2,
    author: "Nomsa K.",
    color: "hsl(263 85% 58%)",
    text: "Just hit my personal best on bench press — 60kg! 6 months ago I couldn't lift 40kg. MK2 family made this possible 💪",
    likes: 28,
    date: "3 days ago",
  },
  {
    id: 3,
    author: "MK2 Admin",
    color: "hsl(217 91% 53%)",
    text: "🎉 30-Day Challenge starting next month! Track workouts, earn double points, win prizes. Sign up at reception.",
    likes: 45,
    date: "5 days ago",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Community() {
  const { user, toast } = useAuth();
  const { isMobile } = useBreakpoint();

  if (!user) return null;

  const uid = user.uid;
  const username =
    user.name?.split(" ")[0] || user.email?.split("@")[0] || "Member";
  const canChat = user.membership === "gold";

  const [tab, setTab] = useState<"feed" | "chat">("feed");

  // ── Feed state ──────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<FeedPost[]>(SEED_POSTS);
  const [feedText, setFeedText] = useState("");

  const postToFeed = () => {
    if (!feedText.trim()) return toast("Write something first", "error");
    logEvent("community_post");
    setPosts([
      {
        id: Date.now(),
        author: user.name,
        color: user.color,
        text: feedText.trim(),
        likes: 0,
        date: "Just now",
      },
      ...posts,
    ]);
    setFeedText("");
    toast("Posted! 🙌", "success");
  };

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [isChatMobile, setIsChatMobile] = useState(window.innerWidth < 768);
  const [rooms, setRooms] = useState<Room[]>([]); // ← replaces hardcoded ROOMS
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [room, setRoom] = useState<string | null>(null);
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const [menuMsg, setMenuMsg] = useState<any | null>(null);
  const [replyTo, setReplyTo] = useState<any | null>(null);

  // Unread badges & local clear
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, number>>({});
  const [roomMessageCounts, setRoomMessageCounts] = useState<
    Record<string, { latestTs: number; count: number }>
  >({});
  const [clearedBeforeMap, setClearedBeforeMap] = useState<
    Record<string, number>
  >({});

  // Poll form
  const [showPollForm, setShowPollForm] = useState(false);
  const [editingPoll, setEditingPoll] = useState<any | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollHours, setPollHours] = useState(0);
  const [pollMinutes, setPollMinutes] = useState(0);
  const [pollSeconds, setPollSeconds] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pressTimer = useRef<any>(null);

  const encodeRoom = (r: string) => encodeURIComponent(r).replace(/\./g, "%2E");

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Resize handler
  useEffect(() => {
    const onResize = () => setIsChatMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const onClick = (e: any) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuMsg(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Notification permission (Community-scoped)
  useEffect(() => {
    if (!uid || uid === "guest") return;
    const prefRef = ref(db, `mk2_users/${uid}/notificationPrefs/community`);
    get(prefRef).then((snap) => {
      if (snap.val() === true) {
        requestNotificationPermission(uid);
      }
    });
  }, [uid]);

  // ── CHANGED: sync rooms from Firebase community_rooms (live subscription) ──
  useEffect(() => {
    const roomsRef = ref(db, "community_rooms");
    return onValue(roomsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        // Admin stores as { room_0: {name, desc}, room_1: {name, desc}, ... }
        const list = (Object.values(data) as any[])
          .filter((r) => r?.name) // guard malformed entries
          .map((r) => ({
            name: r.name as string,
            desc: (r.desc ?? "") as string,
          }));
        setRooms(list);
      } else {
        // Fallback: admin hasn't written community_rooms to Firebase yet
        setRooms(FALLBACK_ROOMS);
      }
    });
  }, []);

  // Joined rooms
  useEffect(() => {
    if (!canChat) return;
    return onValue(ref(db, `mk2_users/${uid}/joinedRooms`), (snap) => {
      setJoinedRooms(Object.keys(snap.val() || {}));
    });
  }, [uid, canChat]);

  // Load lastSeen timestamps
  useEffect(() => {
    if (!canChat) return;
    return onValue(ref(db, `mk2_users/${uid}/roomLastSeen`), (snap) => {
      setLastSeenMap(snap.val() || {});
    });
  }, [uid, canChat]);

  // Load clearedBefore
  useEffect(() => {
    if (!canChat) return;
    return onValue(ref(db, `mk2_users/${uid}/clearedBefore`), (snap) => {
      setClearedBeforeMap(snap.val() || {});
    });
  }, [uid, canChat]);

  // Track unread counts for all joined rooms
  useEffect(() => {
    if (!canChat || joinedRooms.length === 0) return;
    const unsubs: (() => void)[] = [];
    joinedRooms.forEach((roomName) => {
      const unsub = onValue(ref(db, `rooms/${roomName}/messages`), (snap) => {
        const data = snap.val();
        if (!data) {
          setRoomMessageCounts((prev) => ({
            ...prev,
            [roomName]: { latestTs: 0, count: 0 },
          }));
          return;
        }
        const msgs = Object.values(data) as any[];
        const latestTs = Math.max(...msgs.map((m) => m.createdAt || 0));
        const key = encodeRoom(roomName);
        const lastSeen = lastSeenMap[key] || 0;
        const clearedBefore = clearedBeforeMap[key] || 0;
        const count = msgs.filter(
          (m) =>
            m.createdAt > lastSeen &&
            m.uid !== uid &&
            m.createdAt > clearedBefore,
        ).length;
        setRoomMessageCounts((prev) => ({
          ...prev,
          [roomName]: { latestTs, count },
        }));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [joinedRooms, lastSeenMap, clearedBeforeMap, uid, canChat]);

  // Mark room as seen when opened
  useEffect(() => {
    if (!room || !joinedRooms.includes(room)) return;
    const key = encodeRoom(room);
    const now = Date.now();
    set(ref(db, `mk2_users/${uid}/roomLastSeen/${key}`), now);
    setLastSeenMap((prev) => ({ ...prev, [key]: now }));
  }, [room, joinedRooms, uid]);

  // Messages — with clearedBefore filtering
  useEffect(() => {
    setMessages([]);
    if (!room || !joinedRooms.includes(room)) return;
    return onValue(ref(db, `rooms/${room}/messages`), (snap) => {
      const data = snap.val();
      if (!data) return setMessages([]);
      const key = encodeRoom(room);
      const clearedBefore = clearedBeforeMap[key] || 0;
      const formatted: Message[] = Object.entries(data)
        .map(([id, v]: any) => ({ id, ...v }))
        .filter((msg: any) => {
          if (msg.expiresAt && Date.now() > msg.expiresAt) {
            remove(ref(db, `rooms/${room}/messages/${msg.id}`));
            return false;
          }
          return msg.createdAt > clearedBefore;
        });
      formatted.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(formatted);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    });
  }, [room, joinedRooms, clearedBeforeMap]);

  // Polls — with clearedBefore filtering
  useEffect(() => {
    if (!room || !joinedRooms.includes(room)) return;
    return onValue(ref(db, `rooms/${room}/polls`), (snap) => {
      const key = encodeRoom(room);
      const clearedBefore = clearedBeforeMap[key] || 0;
      const formatted = Object.entries(snap.val() || {})
        .map(([id, val]: any) => ({ id, ...val, type: "poll" }))
        .filter((p: any) => p.createdAt > clearedBefore)
        .sort((a, b) => a.createdAt - b.createdAt);
      setPolls(formatted);
    });
  }, [room, joinedRooms, clearedBeforeMap]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const compressVideo = (file: File, targetBytes: number): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size <= targetBytes) {
        resolve(file);
        return;
      }
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.onloadedmetadata = () => {
        const scale = Math.min(1, Math.sqrt(targetBytes / file.size));
        canvas.width = Math.floor(video.videoWidth * scale);
        canvas.height = Math.floor(video.videoHeight * scale);
        const stream = canvas.captureStream(24);
        const recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8",
          videoBitsPerSecond: 800_000,
        });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webm"),
            { type: "video/webm" },
          );
          URL.revokeObjectURL(url);
          resolve(compressed);
        };
        video.play();
        recorder.start();
        video.ontimeupdate = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        };
        video.onended = () => recorder.stop();
      };
    });
  };

  // ── Chat actions ──────────────────────────────────────────────────────────────

  const joinRoom = async () => {
    if (room) await set(ref(db, `mk2_users/${uid}/joinedRooms/${room}`), true);
  };

  const leaveRoom = async () => {
    if (!room || !confirm("Leave this room?")) return;
    await remove(ref(db, `mk2_users/${uid}/joinedRooms/${room}`));
    setRoom(null);
  };

  const clearRoomLocally = async () => {
    if (
      !room ||
      !confirm(
        "Clear this room from your view? Other members won't be affected.",
      )
    )
      return;
    const key = encodeRoom(room);
    const now = Date.now();
    await set(ref(db, `mk2_users/${uid}/clearedBefore/${key}`), now);
    setClearedBeforeMap((prev) => ({ ...prev, [key]: now }));
  };

  const sendMessage = async () => {
    if (!chatText.trim() || !room || !joinedRooms.includes(room)) return;
    await push(ref(db, `rooms/${room}/messages`), {
      text: chatText,
      user: username,
      uid,
      createdAt: Date.now(),
      ...(replyTo && { replyTo: { text: replyTo.text, user: replyTo.user } }),
    });
    setChatText("");
    setReplyTo(null);
  };

  const deleteMessage = async (msg: any) => {
    if (!confirm("Delete message?")) return;
    if (msg.type === "poll") {
      await remove(ref(db, `rooms/${room}/polls/${msg.id}`));
    } else {
      await remove(ref(db, `rooms/${room}/messages/${msg.id}`));
    }
    setMenuMsg(null);
  };

  const editMessage = async (msg: Message) => {
    if (Date.now() - msg.createdAt > 15 * 60 * 1000) {
      alert("Edit window expired (15 min)");
      return;
    }
    const newText = prompt("Edit message", msg.text);
    if (!newText) return;
    await update(ref(db, `rooms/${room}/messages/${msg.id}`), {
      text: newText,
      edited: true,
    });
    setMenuMsg(null);
  };

  const toggleReaction = async (msg: Message, emoji: string) => {
    const reactions = msg.reactions || {};
    const next: any = {};
    Object.keys(reactions).forEach((e) => {
      next[e] = reactions[e].filter((id: string) => id !== uid);
    });
    if (!reactions[emoji]?.includes(uid))
      next[emoji] = [...(next[emoji] || []), uid];
    await update(ref(db, `rooms/${room}/messages/${msg.id}`), {
      reactions: next,
    });
  };

  const startPress = (msg: any) => {
    pressTimer.current = setTimeout(() => setMenuMsg(msg), 500);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleFileSelect = async (file: File) => {
    try {
      if (!file || !room || !joinedRooms.includes(room)) return;
      const fileType = file.type.startsWith("image")
        ? "image"
        : file.type.startsWith("video")
          ? "video"
          : null;
      if (!fileType) {
        alert("Only images and videos allowed");
        return;
      }
      if (fileType === "image") {
        file = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        if (file.size > 2 * 1024 * 1024) {
          alert("Image still too large after compression (max 2 MB)");
          return;
        }
      }
      if (fileType === "video") {
        file = await compressVideo(file, 10 * 1024 * 1024);
        if (file.size > 10 * 1024 * 1024) {
          alert("Video still too large after compression (max 10 MB)");
          return;
        }
      }
      const path = `chatFiles/${uid}/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await push(ref(db, `rooms/${room}/messages`), {
        type: fileType,
        fileUrl: url,
        user: username,
        uid,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        ...(replyTo && { replyTo: { text: replyTo.text, user: replyTo.user } }),
      });
      setReplyTo(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed — please try again");
    }
  };

  const createPoll = () => {
    if (!room || !joinedRooms.includes(room)) return;
    setEditingPoll(null);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollHours(0);
    setPollMinutes(0);
    setPollSeconds(0);
    setShowPollForm(true);
  };

  const savePoll = async () => {
    if (!pollQuestion.trim()) return alert("Enter a question");
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) return alert("At least 2 options required");
    if (editingPoll && Object.values(editingPoll.votes || {}).flat().length > 0)
      return alert("Cannot edit a poll that already has votes");
    const totalMs =
      pollHours * 3600000 + pollMinutes * 60000 + pollSeconds * 1000;
    if (totalMs <= 0) return alert("Set a poll duration");
    const pollData = {
      type: "poll",
      question: pollQuestion,
      options: cleanOptions,
      votes: editingPoll?.votes || {},
      uid,
      user: username,
      createdAt: editingPoll?.createdAt || Date.now(),
      expiresAt: Date.now() + totalMs,
      edited: !!editingPoll,
    };
    if (editingPoll)
      await update(ref(db, `rooms/${room}/polls/${editingPoll.id}`), pollData);
    else await push(ref(db, `rooms/${room}/polls`), pollData);
    setShowPollForm(false);
  };

  const formatDate = (time: number) => {
    const d = new Date(time),
      today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const y = new Date();
    y.setDate(today.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  const totalUnread = joinedRooms.reduce(
    (sum, r) => sum + (roomMessageCounts[r]?.count || 0),
    0,
  );
  const isJoined = !!(room && joinedRooms.includes(room));
  let lastDateRef = { value: "" };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={
        tab === "chat"
          ? "h-screen flex flex-col overflow-hidden bg-background text-foreground transition-colors duration-200"
          : ""
      }
    >
      {/* Feed header */}
      {tab === "feed" && (
        <div
          className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 pt-5" : "px-6 pt-10"}`}
        >
          <PageTitle sub="Share wins, ask questions, motivate each other">
            Community <span className="text-primary">Chat</span>
          </PageTitle>
        </div>
      )}

      {/* Tab switcher */}
      <div
        className={`${
          tab === "chat"
            ? "px-4 pt-3 pb-2"
            : `max-w-[760px] mx-auto ${isMobile ? "px-3.5" : "px-6"}`
        } mb-3`}
      >
        <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab("feed")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "feed"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📣 Feed
          </button>
          <button
            onClick={() => {
              if (!canChat) {
                toast("Upgrade to Gold to unlock Chat Rooms 🔒", "error");
                return;
              }
              setTab("chat");
            }}
            className={`relative px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "chat"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            💬 Chat Rooms {!canChat && "🔒"}
            {canChat && totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── FEED TAB ──────────────────────────────────────────────────────────── */}
      {tab === "feed" && (
        <div
          className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 pb-5" : "px-6 pb-10"}`}
        >
          <div className="mk2-card mb-4">
            <label className="mk2-label">Share with the MK2 Community</label>
            <textarea
              className="mk2-textarea mb-3"
              placeholder="Share a win, ask a question, motivate someone…"
              value={feedText}
              onChange={(e) => setFeedText(e.target.value)}
            />
            <Btn variant="primary" onClick={postToFeed}>
              Post to Community
            </Btn>
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
                    <div className="text-[11px] text-muted-foreground">
                      {p.date}
                    </div>
                  </div>
                </div>
                <div className="text-sm leading-relaxed mb-3 text-foreground/80">
                  {p.text}
                </div>
                <button
                  onClick={() =>
                    setPosts(
                      posts.map((x) =>
                        x.id === p.id ? { ...x, likes: x.likes + 1 } : x,
                      ),
                    )
                  }
                  className="bg-transparent border border-border rounded-full px-3.5 py-1 text-muted-foreground text-xs cursor-pointer font-body font-semibold hover:border-primary/40 hover:text-primary transition-colors"
                >
                  ❤️ {p.likes}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHAT TAB ──────────────────────────────────────────────────────────── */}
      {tab === "chat" && canChat && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          {(!isChatMobile || !room) && (
            <div className="flex flex-col w-full md:w-[300px] border-r border-border bg-card p-4 overflow-y-auto transition-colors duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-xl">
                  💬
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Chat Rooms
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Logged in as {username}
                  </p>
                </div>
              </div>

              {/* My Rooms — joined rooms that still exist in Firebase */}
              {rooms.filter((r) => joinedRooms.includes(r.name)).length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                    My Rooms
                  </p>
                  {rooms
                    .filter((r) => joinedRooms.includes(r.name))
                    .map((r) => (
                      <RoomCard
                        key={r.name}
                        room={r}
                        active={room === r.name}
                        unreadCount={roomMessageCounts[r.name]?.count || 0}
                        onClick={() => setRoom(r.name)}
                      />
                    ))}
                </>
              )}

              {/* Discover — rooms not yet joined */}
              {rooms.filter((r) => !joinedRooms.includes(r.name)).length >
                0 && (
                <>
                  <p className="text-xs text-muted-foreground mt-4 mb-2 uppercase tracking-wider">
                    Discover
                  </p>
                  {rooms
                    .filter((r) => !joinedRooms.includes(r.name))
                    .map((r) => (
                      <RoomCard
                        key={r.name}
                        room={r}
                        active={false}
                        unreadCount={0}
                        onClick={() => setRoom(r.name)}
                      />
                    ))}
                </>
              )}

              {/* Empty state while rooms are loading */}
              {rooms.length === 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  Loading rooms…
                </p>
              )}
            </div>
          )}

          {/* Chat panel */}
          {(!isChatMobile || room) && (
            <div className="flex-1 flex flex-col min-h-0 bg-background transition-colors duration-200">
              {room ? (
                <>
                  <ChatHeader
                    room={room}
                    isJoined={isJoined}
                    onBack={() => setRoom(null)}
                    onLeave={leaveRoom}
                    onClear={clearRoomLocally}
                  />

                  {!isJoined ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4">
                      <p className="text-muted-foreground">
                        Join this room to chat
                      </p>
                      <button
                        onClick={joinRoom}
                        className="bg-primary px-8 py-3 rounded-xl text-primary-foreground font-bold"
                      >
                        Join Room
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-background transition-colors duration-200">
                        {[...messages, ...polls]
                          .sort((a, b) => a.createdAt - b.createdAt)
                          .map((item: any) => {
                            const isPoll = item.type === "poll";
                            const date = formatDate(item.createdAt);
                            const showDate = date !== lastDateRef.value;
                            lastDateRef.value = date;
                            return (
                              <div key={item.id}>
                                {showDate && (
                                  <div className="text-center text-xs text-muted-foreground my-3">
                                    {date}
                                  </div>
                                )}
                                {isPoll ? (
                                  <PollMessage
                                    poll={item}
                                    uid={uid}
                                    room={room}
                                    openMenu={setMenuMsg}
                                    currentUsername={username}
                                  />
                                ) : (
                                  <MessageBubble
                                    message={item}
                                    uid={uid}
                                    onReact={toggleReaction}
                                    onMenu={setMenuMsg}
                                    startPress={startPress}
                                    cancelPress={cancelPress}
                                    onReply={setReplyTo}
                                  />
                                )}
                              </div>
                            );
                          })}
                        <div ref={bottomRef} />
                      </div>

                      <ChatInput
                        text={chatText}
                        setText={setChatText}
                        sendMessage={sendMessage}
                        createPoll={null}
                        replyTo={replyTo}
                        setReplyTo={setReplyTo}
                        onFileSelect={handleFileSelect}
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                  <div className="text-5xl mb-4">💬</div>
                  <p>Select a room to start chatting</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Context menu — only for own messages */}
      {menuMsg && menuMsg.uid === uid && (
        <MessageMenu
          ref={menuRef}
          onEdit={() => {
            if (menuMsg.type === "poll") {
              const totalVotes = Object.values(menuMsg.votes || {}).flat()
                .length;
              if (totalVotes > 0 || Date.now() > menuMsg.expiresAt) {
                alert("Cannot edit this poll");
                return;
              }
              setEditingPoll(menuMsg);
              setPollQuestion(menuMsg.question);
              setPollOptions(menuMsg.options);
              const rem = menuMsg.expiresAt - Date.now();
              setPollHours(Math.max(0, Math.floor(rem / 3600000)));
              setPollMinutes(Math.max(0, Math.floor((rem % 3600000) / 60000)));
              setPollSeconds(Math.max(0, Math.floor((rem % 60000) / 1000)));
              setShowPollForm(true);
            } else {
              editMessage(menuMsg);
            }
            setMenuMsg(null);
          }}
          onDelete={() => deleteMessage(menuMsg)}
          onClose={() => setMenuMsg(null)}
        />
      )}

      {/* Poll modal */}
      {showPollForm && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card text-foreground p-6 rounded-2xl w-full max-w-md shadow-xl border border-border transition-colors duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingPoll ? "Edit Poll" : "Create Poll"}
              </h2>
              <button
                onClick={() => setShowPollForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✖
              </button>
            </div>

            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              className="w-full mb-3 p-3 rounded-lg bg-background text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-200"
            />
            <input
              placeholder="Option 1, Option 2, Option 3"
              defaultValue={pollOptions.join(", ")}
              onChange={(e) => setPollOptions(e.target.value.split(","))}
              className="w-full mb-3 p-3 rounded-lg bg-background text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-200"
            />

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Poll duration
              </p>
              <div className="flex gap-3">
                {[
                  { label: "hrs", value: pollHours, setter: setPollHours },
                  {
                    label: "min",
                    value: pollMinutes,
                    setter: setPollMinutes,
                  },
                  {
                    label: "sec",
                    value: pollSeconds,
                    setter: setPollSeconds,
                  },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="flex-1 text-center">
                    <input
                      type="number"
                      min={0}
                      value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                      className="w-full p-3 rounded-lg bg-background text-foreground border border-border text-center placeholder:text-muted-foreground transition-colors duration-200"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={savePoll}
              className="w-full bg-primary py-3 rounded-xl text-primary-foreground font-bold hover:opacity-90 transition-opacity"
            >
              {editingPoll ? "Save Changes" : "Create Poll"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// import { useEffect, useState, useRef } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent, db, storage } from "@/lib/firebase";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";
// import {
//   ref,
//   push,
//   onValue,
//   remove,
//   set,
//   update,
//   get,
// } from "firebase/database";
// import {
//   ref as storageRef,
//   uploadBytes,
//   getDownloadURL,
// } from "firebase/storage";
// import imageCompression from "browser-image-compression";
// import { requestNotificationPermission } from "@/lib/firebase-messaging";

// import ChatHeader from "@/components/ui/ChatHeader";
// import ChatInput from "@/components/ui/ChatInput";
// import RoomCard from "@/components/ui/RoomCard";
// import MessageBubble from "@/components/ui/MessageBubble";
// import PollMessage from "@/components/ui/PollMessage";
// import MessageMenu from "@/components/ui/MessageMenu";

// interface Message {
//   id: string;
//   text: string;
//   user: string;
//   uid: string;
//   createdAt: number;
//   reactions?: { [key: string]: string[] };
//   edited?: boolean;
// }

// interface FeedPost {
//   id: number;
//   author: string;
//   color: string;
//   text: string;
//   likes: number;
//   date: string;
// }

// const ROOMS = [
//   { name: "💬 MK2R General", desc: "News, updates & schedules." },
//   { name: "🏆 MK2R Competitive Group", desc: "Competition prep & strategy" },
//   { name: "🔥 MK2R Hyrox", desc: "HYROX training & performance talk" },
//   {
//     name: "💼 MK2R Business Hub",
//     desc: "Business, partnerships & growth discussions",
//   },
// ];

// const SEED_POSTS: FeedPost[] = [
//   {
//     id: 1,
//     author: "Coach Sipho",
//     color: "hsl(20 100% 50%)",
//     text: "Tuesday HIIT was FIRE 🔥 Proud of everyone who pushed through the last round. See you Thursday!",
//     likes: 12,
//     date: "2 days ago",
//   },
//   {
//     id: 2,
//     author: "Nomsa K.",
//     color: "hsl(263 85% 58%)",
//     text: "Just hit my personal best on bench press — 60kg! 6 months ago I couldn't lift 40kg. MK2 family made this possible 💪",
//     likes: 28,
//     date: "3 days ago",
//   },
//   {
//     id: 3,
//     author: "MK2 Admin",
//     color: "hsl(217 91% 53%)",
//     text: "🎉 30-Day Challenge starting next month! Track workouts, earn double points, win prizes. Sign up at reception.",
//     likes: 45,
//     date: "5 days ago",
//   },
// ];

// export function Community() {
//   const { user, toast } = useAuth();
//   const { isMobile } = useBreakpoint();

//   if (!user) return null;

//   const uid = user.uid;
//   const username =
//     user.name?.split(" ")[0] || user.email?.split("@")[0] || "Member";
//   const canChat = user.membership === "gold";

//   const [tab, setTab] = useState<"feed" | "chat">("feed");

//   // Feed state
//   const [posts, setPosts] = useState<FeedPost[]>(SEED_POSTS);
//   const [feedText, setFeedText] = useState("");

//   const postToFeed = () => {
//     if (!feedText.trim()) return toast("Write something first", "error");
//     logEvent("community_post");
//     setPosts([
//       {
//         id: Date.now(),
//         author: user.name,
//         color: user.color,
//         text: feedText.trim(),
//         likes: 0,
//         date: "Just now",
//       },
//       ...posts,
//     ]);
//     setFeedText("");
//     toast("Posted! 🙌", "success");
//   };

//   // Chat state
//   const [isChatMobile, setIsChatMobile] = useState(window.innerWidth < 768);
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [polls, setPolls] = useState<any[]>([]);
//   const [chatText, setChatText] = useState("");
//   const [room, setRoom] = useState<string | null>(null);
//   const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
//   const [menuMsg, setMenuMsg] = useState<any | null>(null);
//   const [replyTo, setReplyTo] = useState<any | null>(null);

//   // Unread badges & local clear
//   const [lastSeenMap, setLastSeenMap] = useState<Record<string, number>>({});
//   const [roomMessageCounts, setRoomMessageCounts] = useState<
//     Record<string, { latestTs: number; count: number }>
//   >({});
//   const [clearedBeforeMap, setClearedBeforeMap] = useState<
//     Record<string, number>
//   >({});

//   // Poll form
//   const [showPollForm, setShowPollForm] = useState(false);
//   const [editingPoll, setEditingPoll] = useState<any | null>(null);
//   const [pollQuestion, setPollQuestion] = useState("");
//   const [pollOptions, setPollOptions] = useState(["", ""]);
//   const [pollHours, setPollHours] = useState(0);
//   const [pollMinutes, setPollMinutes] = useState(0);
//   const [pollSeconds, setPollSeconds] = useState(0);

//   const bottomRef = useRef<HTMLDivElement | null>(null);
//   const menuRef = useRef<HTMLDivElement | null>(null);
//   const pressTimer = useRef<any>(null);

//   const encodeRoom = (r: string) => encodeURIComponent(r).replace(/\./g, "%2E");

//   // Resize handler
//   useEffect(() => {
//     const onResize = () => setIsChatMobile(window.innerWidth < 768);
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);

//   // Close menu on outside click
//   useEffect(() => {
//     const onClick = (e: any) => {
//       if (menuRef.current && !menuRef.current.contains(e.target))
//         setMenuMsg(null);
//     };
//     document.addEventListener("mousedown", onClick);
//     return () => document.removeEventListener("mousedown", onClick);
//   }, []);

//   // Notification permission (Community‑scoped) – uses mk2_users path
//   useEffect(() => {
//     if (!uid || uid === "guest") return;
//     const prefRef = ref(db, `mk2_users/${uid}/notificationPrefs/community`);
//     get(prefRef).then((snap) => {
//       if (snap.val() === true) {
//         requestNotificationPermission(uid);
//       }
//     });
//   }, [uid]);

//   // Joined rooms – keep mk2_users path
//   useEffect(() => {
//     if (!canChat) return;
//     return onValue(ref(db, `mk2_users/${uid}/joinedRooms`), (snap) => {
//       setJoinedRooms(Object.keys(snap.val() || {}));
//     });
//   }, [uid, canChat]);

//   // Load lastSeen timestamps – mk2_users
//   useEffect(() => {
//     if (!canChat) return;
//     return onValue(ref(db, `mk2_users/${uid}/roomLastSeen`), (snap) => {
//       setLastSeenMap(snap.val() || {});
//     });
//   }, [uid, canChat]);

//   // Load clearedBefore – mk2_users
//   useEffect(() => {
//     if (!canChat) return;
//     return onValue(ref(db, `mk2_users/${uid}/clearedBefore`), (snap) => {
//       setClearedBeforeMap(snap.val() || {});
//     });
//   }, [uid, canChat]);

//   // Track unread counts for all joined rooms
//   useEffect(() => {
//     if (!canChat || joinedRooms.length === 0) return;
//     const unsubs: (() => void)[] = [];
//     joinedRooms.forEach((roomName) => {
//       const unsub = onValue(ref(db, `rooms/${roomName}/messages`), (snap) => {
//         const data = snap.val();
//         if (!data) {
//           setRoomMessageCounts((prev) => ({
//             ...prev,
//             [roomName]: { latestTs: 0, count: 0 },
//           }));
//           return;
//         }
//         const msgs = Object.values(data) as any[];
//         const latestTs = Math.max(...msgs.map((m) => m.createdAt || 0));
//         const key = encodeRoom(roomName);
//         const lastSeen = lastSeenMap[key] || 0;
//         const clearedBefore = clearedBeforeMap[key] || 0;
//         const count = msgs.filter(
//           (m) =>
//             m.createdAt > lastSeen &&
//             m.uid !== uid &&
//             m.createdAt > clearedBefore,
//         ).length;
//         setRoomMessageCounts((prev) => ({
//           ...prev,
//           [roomName]: { latestTs, count },
//         }));
//       });
//       unsubs.push(unsub);
//     });
//     return () => unsubs.forEach((u) => u());
//   }, [joinedRooms, lastSeenMap, clearedBeforeMap, uid, canChat]);

//   // Mark room as seen when opened – mk2_users
//   useEffect(() => {
//     if (!room || !joinedRooms.includes(room)) return;
//     const key = encodeRoom(room);
//     const now = Date.now();
//     set(ref(db, `mk2_users/${uid}/roomLastSeen/${key}`), now);
//     setLastSeenMap((prev) => ({ ...prev, [key]: now }));
//   }, [room, joinedRooms, uid]);

//   // Messages – with clearedBefore filtering
//   useEffect(() => {
//     setMessages([]);
//     if (!room || !joinedRooms.includes(room)) return;
//     return onValue(ref(db, `rooms/${room}/messages`), (snap) => {
//       const data = snap.val();
//       if (!data) return setMessages([]);
//       const key = encodeRoom(room);
//       const clearedBefore = clearedBeforeMap[key] || 0;
//       const formatted: Message[] = Object.entries(data)
//         .map(([id, v]: any) => ({ id, ...v }))
//         .filter((msg: any) => {
//           if (msg.expiresAt && Date.now() > msg.expiresAt) {
//             remove(ref(db, `rooms/${room}/messages/${msg.id}`));
//             return false;
//           }
//           return msg.createdAt > clearedBefore;
//         });
//       formatted.sort((a, b) => a.createdAt - b.createdAt);
//       setMessages(formatted);
//       setTimeout(
//         () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
//         100,
//       );
//     });
//   }, [room, joinedRooms, clearedBeforeMap]);

//   // Polls – with clearedBefore filtering
//   useEffect(() => {
//     if (!room || !joinedRooms.includes(room)) return;
//     return onValue(ref(db, `rooms/${room}/polls`), (snap) => {
//       const key = encodeRoom(room);
//       const clearedBefore = clearedBeforeMap[key] || 0;
//       const formatted = Object.entries(snap.val() || {})
//         .map(([id, val]: any) => ({ id, ...val, type: "poll" }))
//         .filter((p: any) => p.createdAt > clearedBefore)
//         .sort((a, b) => a.createdAt - b.createdAt);
//       setPolls(formatted);
//     });
//   }, [room, joinedRooms, clearedBeforeMap]);

//   // Video compression (same as teammate’s)
//   const compressVideo = (file: File, targetBytes: number): Promise<File> => {
//     return new Promise((resolve) => {
//       if (file.size <= targetBytes) {
//         resolve(file);
//         return;
//       }
//       const video = document.createElement("video");
//       const canvas = document.createElement("canvas");
//       const ctx = canvas.getContext("2d")!;
//       const url = URL.createObjectURL(file);
//       video.src = url;
//       video.muted = true;
//       video.onloadedmetadata = () => {
//         const scale = Math.min(1, Math.sqrt(targetBytes / file.size));
//         canvas.width = Math.floor(video.videoWidth * scale);
//         canvas.height = Math.floor(video.videoHeight * scale);
//         const stream = canvas.captureStream(24);
//         const recorder = new MediaRecorder(stream, {
//           mimeType: "video/webm;codecs=vp8",
//           videoBitsPerSecond: 800_000,
//         });
//         const chunks: BlobPart[] = [];
//         recorder.ondataavailable = (e) => chunks.push(e.data);
//         recorder.onstop = () => {
//           const blob = new Blob(chunks, { type: "video/webm" });
//           const compressed = new File(
//             [blob],
//             file.name.replace(/\.[^.]+$/, ".webm"),
//             { type: "video/webm" },
//           );
//           URL.revokeObjectURL(url);
//           resolve(compressed);
//         };
//         video.play();
//         recorder.start();
//         video.ontimeupdate = () => {
//           ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//         };
//         video.onended = () => recorder.stop();
//       };
//     });
//   };

//   // ── Chat actions ──────────────────────────────────────────────────────────
//   const joinRoom = async () => {
//     if (room) await set(ref(db, `mk2_users/${uid}/joinedRooms/${room}`), true);
//   };

//   const leaveRoom = async () => {
//     if (!room || !confirm("Leave this room?")) return;
//     await remove(ref(db, `mk2_users/${uid}/joinedRooms/${room}`));
//     setRoom(null);
//   };

//   // Local clear – mk2_users
//   const clearRoomLocally = async () => {
//     if (
//       !room ||
//       !confirm(
//         "Clear this room from your view? Other members won't be affected.",
//       )
//     )
//       return;
//     const key = encodeRoom(room);
//     const now = Date.now();
//     await set(ref(db, `mk2_users/${uid}/clearedBefore/${key}`), now);
//     setClearedBeforeMap((prev) => ({ ...prev, [key]: now }));
//   };

//   const sendMessage = async () => {
//     if (!chatText.trim() || !room || !joinedRooms.includes(room)) return;
//     await push(ref(db, `rooms/${room}/messages`), {
//       text: chatText,
//       user: username,
//       uid,
//       createdAt: Date.now(),
//       ...(replyTo && { replyTo: { text: replyTo.text, user: replyTo.user } }),
//     });
//     setChatText("");
//     setReplyTo(null);
//   };

//   const deleteMessage = async (msg: any) => {
//     if (!confirm("Delete message?")) return;
//     if (msg.type === "poll") {
//       await remove(ref(db, `rooms/${room}/polls/${msg.id}`));
//     } else {
//       await remove(ref(db, `rooms/${room}/messages/${msg.id}`));
//     }
//     setMenuMsg(null);
//   };

//   const editMessage = async (msg: Message) => {
//     if (Date.now() - msg.createdAt > 15 * 60 * 1000) {
//       alert("Edit window expired (15 min)");
//       return;
//     }
//     const newText = prompt("Edit message", msg.text);
//     if (!newText) return;
//     await update(ref(db, `rooms/${room}/messages/${msg.id}`), {
//       text: newText,
//       edited: true,
//     });
//     setMenuMsg(null);
//   };

//   const toggleReaction = async (msg: Message, emoji: string) => {
//     const reactions = msg.reactions || {};
//     const next: any = {};
//     Object.keys(reactions).forEach((e) => {
//       next[e] = reactions[e].filter((id: string) => id !== uid);
//     });
//     if (!reactions[emoji]?.includes(uid))
//       next[emoji] = [...(next[emoji] || []), uid];
//     await update(ref(db, `rooms/${room}/messages/${msg.id}`), {
//       reactions: next,
//     });
//   };

//   const startPress = (msg: any) => {
//     pressTimer.current = setTimeout(() => setMenuMsg(msg), 500);
//   };
//   const cancelPress = () => {
//     if (pressTimer.current) clearTimeout(pressTimer.current);
//   };

//   const handleFileSelect = async (file: File) => {
//     try {
//       if (!file || !room || !joinedRooms.includes(room)) return;
//       const fileType = file.type.startsWith("image")
//         ? "image"
//         : file.type.startsWith("video")
//           ? "video"
//           : null;
//       if (!fileType) {
//         alert("Only images and videos allowed");
//         return;
//       }
//       if (fileType === "image") {
//         file = await imageCompression(file, {
//           maxSizeMB: 1,
//           maxWidthOrHeight: 1024,
//           useWebWorker: true,
//         });
//         if (file.size > 2 * 1024 * 1024) {
//           alert("Image still too large after compression (max 2 MB)");
//           return;
//         }
//       }
//       if (fileType === "video") {
//         file = await compressVideo(file, 10 * 1024 * 1024);
//         if (file.size > 10 * 1024 * 1024) {
//           alert("Video still too large after compression (max 10 MB)");
//           return;
//         }
//       }
//       const path = `chatFiles/${uid}/${Date.now()}_${file.name}`;
//       const fileRef = storageRef(storage, path);
//       await uploadBytes(fileRef, file);
//       const url = await getDownloadURL(fileRef);
//       await push(ref(db, `rooms/${room}/messages`), {
//         type: fileType,
//         fileUrl: url,
//         user: username,
//         uid,
//         createdAt: Date.now(),
//         expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
//         ...(replyTo && { replyTo: { text: replyTo.text, user: replyTo.user } }),
//       });
//       setReplyTo(null);
//     } catch (err) {
//       console.error(err);
//       alert("Upload failed — please try again");
//     }
//   };

//   const createPoll = () => {
//     if (!room || !joinedRooms.includes(room)) return;
//     setEditingPoll(null);
//     setPollQuestion("");
//     setPollOptions(["", ""]);
//     setPollHours(0);
//     setPollMinutes(0);
//     setPollSeconds(0);
//     setShowPollForm(true);
//   };

//   const savePoll = async () => {
//     if (!pollQuestion.trim()) return alert("Enter a question");
//     const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
//     if (cleanOptions.length < 2) return alert("At least 2 options required");
//     if (editingPoll && Object.values(editingPoll.votes || {}).flat().length > 0)
//       return alert("Cannot edit a poll that already has votes");
//     const totalMs =
//       pollHours * 3600000 + pollMinutes * 60000 + pollSeconds * 1000;
//     if (totalMs <= 0) return alert("Set a poll duration");
//     const pollData = {
//       type: "poll",
//       question: pollQuestion,
//       options: cleanOptions,
//       votes: editingPoll?.votes || {},
//       uid,
//       user: username,
//       createdAt: editingPoll?.createdAt || Date.now(),
//       expiresAt: Date.now() + totalMs,
//       edited: !!editingPoll,
//     };
//     if (editingPoll)
//       await update(ref(db, `rooms/${room}/polls/${editingPoll.id}`), pollData);
//     else await push(ref(db, `rooms/${room}/polls`), pollData);
//     setShowPollForm(false);
//   };

//   const formatDate = (time: number) => {
//     const d = new Date(time),
//       today = new Date();
//     if (d.toDateString() === today.toDateString()) return "Today";
//     const y = new Date();
//     y.setDate(today.getDate() - 1);
//     if (d.toDateString() === y.toDateString()) return "Yesterday";
//     return d.toLocaleDateString();
//   };

//   const totalUnread = joinedRooms.reduce(
//     (sum, r) => sum + (roomMessageCounts[r]?.count || 0),
//     0,
//   );
//   const isJoined = !!(room && joinedRooms.includes(room));
//   let lastDateRef = { value: "" };

//   return (
//     <div
//       className={
//         tab === "chat"
//           ? "h-screen flex flex-col overflow-hidden bg-background text-foreground transition-colors duration-200"
//           : ""
//       }
//     >
//       {/* Feed header */}
//       {tab === "feed" && (
//         <div
//           className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 pt-5" : "px-6 pt-10"}`}
//         >
//           {/* ✅ UPDATED: Page title with "Chat" highlighted */}
//           <PageTitle sub="Share wins, ask questions, motivate each other">
//             Community <span className="text-primary">Chat</span>
//           </PageTitle>
//         </div>
//       )}

//       {/* Tab switcher */}
//       <div
//         className={`${
//           tab === "chat"
//             ? "px-4 pt-3 pb-2"
//             : `max-w-[760px] mx-auto ${isMobile ? "px-3.5" : "px-6"}`
//         } mb-3`}
//       >
//         <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
//           <button
//             onClick={() => setTab("feed")}
//             className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
//               tab === "feed"
//                 ? "bg-primary text-primary-foreground"
//                 : "text-muted-foreground hover:text-foreground"
//             }`}
//           >
//             📣 Feed
//           </button>
//           <button
//             onClick={() => {
//               if (!canChat) {
//                 toast("Upgrade to Gold to unlock Chat Rooms 🔒", "error");
//                 return;
//               }
//               setTab("chat");
//             }}
//             className={`relative px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
//               tab === "chat"
//                 ? "bg-primary text-primary-foreground"
//                 : "text-muted-foreground hover:text-foreground"
//             }`}
//           >
//             💬 Chat Rooms {!canChat && "🔒"}
//             {canChat && totalUnread > 0 && (
//               <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
//                 {totalUnread > 99 ? "99+" : totalUnread}
//               </span>
//             )}
//           </button>
//         </div>
//       </div>

//       {/* FEED TAB */}
//       {tab === "feed" && (
//         <div
//           className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 pb-5" : "px-6 pb-10"}`}
//         >
//           <div className="mk2-card mb-4">
//             <label className="mk2-label">Share with the MK2 Community</label>
//             <textarea
//               className="mk2-textarea mb-3"
//               placeholder="Share a win, ask a question, motivate someone…"
//               value={feedText}
//               onChange={(e) => setFeedText(e.target.value)}
//             />
//             <Btn variant="primary" onClick={postToFeed}>
//               Post to Community
//             </Btn>
//           </div>

//           <div className="flex flex-col gap-3.5">
//             {posts.map((p, i) => (
//               <motion.div
//                 key={p.id}
//                 initial={{ opacity: 0, y: 8 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: i * 0.06 }}
//                 className="mk2-card"
//               >
//                 <div className="flex items-center gap-2.5 mb-2.5">
//                   <div
//                     className="w-9 h-9 rounded-full flex items-center justify-center font-display text-[15px] text-primary-foreground shrink-0"
//                     style={{ background: p.color }}
//                   >
//                     {p.author[0]}
//                   </div>
//                   <div>
//                     <div className="font-bold text-sm">{p.author}</div>
//                     <div className="text-[11px] text-muted-foreground">
//                       {p.date}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="text-sm leading-relaxed mb-3 text-foreground/80">
//                   {p.text}
//                 </div>
//                 <button
//                   onClick={() =>
//                     setPosts(
//                       posts.map((x) =>
//                         x.id === p.id ? { ...x, likes: x.likes + 1 } : x,
//                       ),
//                     )
//                   }
//                   className="bg-transparent border border-border rounded-full px-3.5 py-1 text-muted-foreground text-xs cursor-pointer font-body font-semibold hover:border-primary/40 hover:text-primary transition-colors"
//                 >
//                   ❤️ {p.likes}
//                 </button>
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* CHAT TAB */}
//       {tab === "chat" && canChat && (
//         <div className="flex flex-1 min-h-0 overflow-hidden">
//           {/* Sidebar */}
//           {(!isChatMobile || !room) && (
//             <div className="flex flex-col w-full md:w-[300px] border-r border-border bg-card p-4 overflow-y-auto transition-colors duration-200">
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-xl">
//                   💬
//                 </div>
//                 <div>
//                   <h2 className="text-lg font-bold text-foreground">
//                     Chat Rooms
//                   </h2>
//                   <p className="text-xs text-muted-foreground">
//                     Logged in as {username}
//                   </p>
//                 </div>
//               </div>

//               {joinedRooms.length > 0 && (
//                 <>
//                   <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
//                     My Rooms
//                   </p>
//                   {ROOMS.filter((r) => joinedRooms.includes(r.name)).map(
//                     (r) => (
//                       <RoomCard
//                         key={r.name}
//                         room={r}
//                         active={room === r.name}
//                         unreadCount={roomMessageCounts[r.name]?.count || 0}
//                         onClick={() => setRoom(r.name)}
//                       />
//                     ),
//                   )}
//                 </>
//               )}

//               <p className="text-xs text-muted-foreground mt-4 mb-2 uppercase tracking-wider">
//                 Discover
//               </p>
//               {ROOMS.filter((r) => !joinedRooms.includes(r.name)).map((r) => (
//                 <RoomCard
//                   key={r.name}
//                   room={r}
//                   active={false}
//                   unreadCount={0}
//                   onClick={() => setRoom(r.name)}
//                 />
//               ))}
//             </div>
//           )}

//           {/* Chat panel */}
//           {(!isChatMobile || room) && (
//             <div className="flex-1 flex flex-col min-h-0 bg-background transition-colors duration-200">
//               {room ? (
//                 <>
//                   <ChatHeader
//                     room={room}
//                     isJoined={isJoined}
//                     onBack={() => setRoom(null)}
//                     onLeave={leaveRoom}
//                     onClear={clearRoomLocally}
//                   />

//                   {!isJoined ? (
//                     <div className="flex flex-col items-center justify-center flex-1 gap-4">
//                       <p className="text-muted-foreground">
//                         Join this room to chat
//                       </p>
//                       <button
//                         onClick={joinRoom}
//                         className="bg-primary px-8 py-3 rounded-xl text-primary-foreground font-bold"
//                       >
//                         Join Room
//                       </button>
//                     </div>
//                   ) : (
//                     <>
//                       <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-background transition-colors duration-200">
//                         {[...messages, ...polls]
//                           .sort((a, b) => a.createdAt - b.createdAt)
//                           .map((item: any) => {
//                             const isPoll = item.type === "poll";
//                             const date = formatDate(item.createdAt);
//                             const showDate = date !== lastDateRef.value;
//                             lastDateRef.value = date;
//                             return (
//                               <div key={item.id}>
//                                 {showDate && (
//                                   <div className="text-center text-xs text-muted-foreground my-3">
//                                     {date}
//                                   </div>
//                                 )}
//                                 {isPoll ? (
//                                   <PollMessage
//                                     poll={item}
//                                     uid={uid}
//                                     room={room}
//                                     openMenu={setMenuMsg}
//                                     currentUsername={username}
//                                   />
//                                 ) : (
//                                   <MessageBubble
//                                     message={item}
//                                     uid={uid}
//                                     onReact={toggleReaction}
//                                     onMenu={setMenuMsg}
//                                     startPress={startPress}
//                                     cancelPress={cancelPress}
//                                     onReply={setReplyTo}
//                                   />
//                                 )}
//                               </div>
//                             );
//                           })}
//                         <div ref={bottomRef} />
//                       </div>

//                       {/* ✅ UPDATED: Poll creation disabled for members */}
//                       <ChatInput
//                         text={chatText}
//                         setText={setChatText}
//                         sendMessage={sendMessage}
//                         createPoll={null} // ← Poll button hidden/disabled
//                         replyTo={replyTo}
//                         setReplyTo={setReplyTo}
//                         onFileSelect={handleFileSelect}
//                       />
//                     </>
//                   )}
//                 </>
//               ) : (
//                 <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
//                   <div className="text-5xl mb-4">💬</div>
//                   <p>Select a room to start chatting</p>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}

//       {/* Context menu – only for own messages */}
//       {menuMsg && menuMsg.uid === uid && (
//         <MessageMenu
//           ref={menuRef}
//           onEdit={() => {
//             if (menuMsg.type === "poll") {
//               const totalVotes = Object.values(menuMsg.votes || {}).flat()
//                 .length;
//               if (totalVotes > 0 || Date.now() > menuMsg.expiresAt) {
//                 alert("Cannot edit this poll");
//                 return;
//               }
//               setEditingPoll(menuMsg);
//               setPollQuestion(menuMsg.question);
//               setPollOptions(menuMsg.options);
//               const rem = menuMsg.expiresAt - Date.now();
//               setPollHours(Math.max(0, Math.floor(rem / 3600000)));
//               setPollMinutes(Math.max(0, Math.floor((rem % 3600000) / 60000)));
//               setPollSeconds(Math.max(0, Math.floor((rem % 60000) / 1000)));
//               setShowPollForm(true);
//             } else {
//               editMessage(menuMsg);
//             }
//             setMenuMsg(null);
//           }}
//           onDelete={() => deleteMessage(menuMsg)}
//           onClose={() => setMenuMsg(null)}
//         />
//       )}

//       {/* Poll modal */}
//       {showPollForm && (
//         <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50 p-4">
//           <div className="bg-card text-foreground p-6 rounded-2xl w-full max-w-md shadow-xl border border-border transition-colors duration-200">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold text-foreground">
//                 {editingPoll ? "Edit Poll" : "Create Poll"}
//               </h2>
//               <button
//                 onClick={() => setShowPollForm(false)}
//                 className="text-muted-foreground hover:text-foreground transition-colors"
//               >
//                 ✖
//               </button>
//             </div>

//             <input
//               value={pollQuestion}
//               onChange={(e) => setPollQuestion(e.target.value)}
//               placeholder="What do you want to ask?"
//               className="w-full mb-3 p-3 rounded-lg bg-background text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-200"
//             />
//             <input
//               placeholder="Option 1, Option 2, Option 3"
//               defaultValue={pollOptions.join(", ")}
//               onChange={(e) => setPollOptions(e.target.value.split(","))}
//               className="w-full mb-3 p-3 rounded-lg bg-background text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-200"
//             />

//             <div className="mb-4">
//               <p className="text-sm text-muted-foreground mb-2">
//                 Poll duration
//               </p>
//               <div className="flex gap-3">
//                 {[
//                   { label: "hrs", value: pollHours, setter: setPollHours },
//                   { label: "min", value: pollMinutes, setter: setPollMinutes },
//                   { label: "sec", value: pollSeconds, setter: setPollSeconds },
//                 ].map(({ label, value, setter }) => (
//                   <div key={label} className="flex-1 text-center">
//                     <input
//                       type="number"
//                       min={0}
//                       value={value}
//                       onChange={(e) => setter(Number(e.target.value))}
//                       className="w-full p-3 rounded-lg bg-background text-foreground border border-border text-center placeholder:text-muted-foreground transition-colors duration-200"
//                     />
//                     <p className="text-xs text-muted-foreground mt-1">
//                       {label}
//                     </p>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <button
//               onClick={savePoll}
//               className="w-full bg-primary py-3 rounded-xl text-primary-foreground font-bold hover:opacity-90 transition-opacity"
//             >
//               {editingPoll ? "Save Changes" : "Create Poll"}
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
