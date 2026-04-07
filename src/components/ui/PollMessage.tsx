import { useState, useEffect } from "react";
import { update, ref } from "firebase/database";
import { db } from "@/lib/firebase";

export default function PollMessage({
  poll,
  uid,
  room,
  openMenu,
  currentUsername,
}: any) {
  const [showVotes, setShowVotes] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const isExpired = Date.now() > poll.expiresAt;
  const isMine = poll.uid === uid;

  // COUNTDOWN TIMER
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = poll.expiresAt - Date.now();
      if (diff <= 0) {
        setTimeLeft("Closed");
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [poll.expiresAt]);

  const getUserVote = () => {
    for (let opt of poll.options) {
      const voters = poll.votes?.[opt] || [];
      if (voters.some((v: any) => v.uid === uid)) return opt;
    }
    return null;
  };

  const userVote = getUserVote();
  const totalVotes = Object.values(poll.votes || {}).flat().length;

  const vote = async (option: string) => {
    if (isExpired) return;
    let newVotes: any = {};
    poll.options.forEach((opt: string) => {
      const voters = poll.votes?.[opt] || [];
      newVotes[opt] = voters.filter((v: any) => v.uid !== uid);
    });
    if (userVote !== option) {
      newVotes[option] = [
        ...(newVotes[option] || []),
        { uid, name: currentUsername || "User" },
      ];
    }
    await update(ref(db, `rooms/${room}/polls/${poll.id}`), {
      votes: newVotes,
    });
  };

  const canEdit = totalVotes === 0 && !isExpired;

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        openMenu && openMenu(poll);
      }}
      className={`flex gap-2 mb-3 items-end ${isMine ? "justify-end" : "justify-start"}`}
    >
      {/* LEFT AVATAR */}
      {!isMine && (
        <div className="w-8 h-8 bg-secondary text-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
          {poll.user?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}

      {/* BUBBLE */}
      <div className="bg-card text-foreground border border-border p-3 rounded-xl max-w-[75%] w-full transition-colors duration-200">
        {/* HEADER */}
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <span className="font-medium">{poll.user}</span>
          <span>•</span>
          <span>
            {new Date(poll.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {poll.edited && <span>(edited)</span>}
        </p>

        {/* QUESTION */}
        <p className="font-semibold mb-2">{poll.question}</p>

        {/* OPTIONS */}
        {poll.options.map((opt: string) => {
          const voters = poll.votes?.[opt] || [];
          const count = voters.length;
          const voted = voters.some((v: any) => v.uid === uid);

          return (
            <button
              key={opt}
              disabled={isExpired}
              onClick={() => vote(opt)}
              className={`w-full text-left px-3 py-2 mb-2 rounded-lg transition-all
                ${
                  voted
                    ? "bg-primary text-primary-foreground font-semibold"
                    : userVote
                      ? "bg-secondary opacity-60"
                      : "bg-secondary hover:bg-secondary/80"
                }`}
            >
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  {opt}
                  {voted && <span>✔</span>}
                </span>
                {count > 0 && <span>{count}</span>}
              </div>
            </button>
          );
        })}

        {/* FOOTER */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <button
            onClick={() => setShowVotes(!showVotes)}
            className="hover:underline"
          >
            View votes
          </button>
          <span>{isExpired ? "Closed" : timeLeft}</span>
        </div>

        {/* VIEW VOTES */}
        {showVotes && (
          <div className="mt-2 bg-background border border-border text-foreground p-2 rounded text-xs transition-colors duration-200">
            {poll.options.map((opt: string) => {
              const voters = poll.votes?.[opt] || [];
              if (voters.length === 0) return null;
              return (
                <div key={opt} className="mb-1">
                  <b>{opt}</b>
                  <div className="ml-2 text-muted-foreground">
                    {voters.map((v: any) => (
                      <div key={v.uid}>{v.uid === uid ? "You" : v.name}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* EXPIRED NOTE */}
        {!canEdit && totalVotes === 0 && isExpired && (
          <p className="text-xs mt-1 text-muted-foreground">Poll expired</p>
        )}
      </div>

      {/* RIGHT AVATAR */}
      {isMine && (
        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
          {poll.user?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}
    </div>
  );
}
