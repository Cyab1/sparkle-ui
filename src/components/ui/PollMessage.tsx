import { useState, useEffect } from "react";
import { update, ref } from "firebase/database";
import { db } from "@/lib/firebase";

export default function PollMessage({
  poll,
  uid,
  room,
  openMenu,
  currentUsername
}: any) {
  const [showVotes, setShowVotes] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const isExpired = Date.now() > poll.expiresAt;
  const isMine = poll.uid === uid;

  // ✅ COUNTDOWN TIMER
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

  // ✅ GET USER VOTE
  const getUserVote = () => {
    for (let opt of poll.options) {
      const voters = poll.votes?.[opt] || [];

      if (voters.some((v: any) => v.uid === uid)) {
        return opt;
      }
    }
    return null;
  };

  const userVote = getUserVote();

  const totalVotes = Object.values(poll.votes || {}).flat().length;

  // ✅ VOTE
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
        {
          uid,
          name: currentUsername || "User"
        }
      ];
    }

    await update(ref(db, `rooms/${room}/polls/${poll.id}`), {
      votes: newVotes
    });
  };

  const canEdit = totalVotes === 0 && !isExpired;

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        openMenu && openMenu(poll);
      }}
      className={`flex gap-2 mb-3 items-end ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      {/* LEFT AVATAR (OTHERS) */}
      {!isMine && (
        <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold">
          {poll.user?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}

      {/* MESSAGE BUBBLE */}
      <div className="bg-zinc-900 p-3 rounded-xl max-w-[75%] w-full">
        {/* HEADER */}
        <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
          <span className="font-medium">{poll.user}</span>
          <span>•</span>
          <span>
            {new Date(poll.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
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
              className={`
                w-full text-left px-3 py-2 mb-2 rounded-lg transition-all
                ${
                  voted
                    ? "bg-orange-500 text-black font-semibold border border-orange-500"
                    : userVote
                    ? "bg-zinc-800 opacity-60"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }
              `}
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
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <button onClick={() => setShowVotes(!showVotes)}>
            View votes
          </button>

          <span>{isExpired ? "Closed" : timeLeft}</span>
        </div>

        {/* VIEW VOTES */}
        {showVotes && (
          <div className="mt-2 bg-black p-2 rounded text-xs">
            {poll.options.map((opt: string) => {
              const voters = poll.votes?.[opt] || [];

              if (voters.length === 0) return null;

              return (
                <div key={opt} className="mb-1">
                  <b>{opt}</b>
                  <div className="ml-2 text-gray-300">
                    {voters.map((v: any) => (
                      <div key={v.uid}>
                        {v.uid === uid ? "You" : v.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* EDIT INFO */}
        {!canEdit && totalVotes === 0 && isExpired && (
          <p className="text-xs text-gray-500 mt-1">
            Poll expired
          </p>
        )}
      </div>

      {/* RIGHT AVATAR (YOU) */}
      {isMine && (
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold">
          {poll.user?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}
    </div>
  );
}