import { Trash2 } from "lucide-react";

export default function MessageBubble({
  message,
  uid,
  onReact,
  onMenu,
  startPress,
  cancelPress,
  onReply // ✅ FIX: add this
}: any) {

  if (!message) return null;

  const isMine = message.uid === uid;

  const totalReactions =
    message.reactions
      ? Object.values(message.reactions as Record<string, string[]>)
          .reduce((a, b) => a + b.length, 0)
      : 0;

  return (
    <div className="mb-3 group">

      <div
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu && onMenu(message);
        }}
        onTouchStart={() => startPress && startPress(message)}
        onTouchEnd={cancelPress}
        className={`flex gap-2 ${isMine ? "justify-end" : ""}`}

        onMouseDown={() => startPress && startPress(message)}
onMouseUp={cancelPress}
onMouseLeave={cancelPress}
      >

        {!isMine && (
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs">
            {message.user[0]}
          </div>
        )}

        <div className="max-w-[70%]">
          <div className={`p-3 rounded-xl ${isMine ? "bg-orange-500 text-black" : "bg-zinc-900"}`}>

            {/* ✅ REPLY PREVIEW (FIXED POSITION) */}
            {message.replyTo && (
              <div className="bg-zinc-800 border-l-4 border-orange-500 p-2 rounded mb-2 text-xs">
                <p className="text-gray-400">{message.replyTo.user}</p>
                <p className="truncate">{message.replyTo.text}</p>
              </div>
            )}

            <p className="text-xs opacity-70">
              {message.user} • {new Date(message.createdAt).toLocaleTimeString()}
            </p>

{/* TEXT */}
{message.text && <p>{message.text}</p>}

{/* IMAGE */}
{message.type === "image" && (
  <div className="mt-2">
    <img
      src={message.fileUrl}
      alt="img"
      className="rounded-lg max-w-[250px] cursor-pointer"
      onClick={() => window.open(message.fileUrl, "_blank")}
    />

    {/* DOWNLOAD BUTTON */}
    <a
      href={message.fileUrl}
      download
      className="text-xs text-orange-400 mt-1 block"
    >
      Download
    </a>
  </div>
)}

{/* VIDEO */}
{message.type === "video" && (
  <video
    src={message.fileUrl}
    controls
    className="mt-2 rounded-lg max-h-60"
  />
)}
            {message.edited && (
              <span className="text-xs">(edited)</span>
            )}
          </div>
{message.reactions && (
  <div className={`mt-1 flex gap-2 flex-wrap ${isMine ? "justify-end" : ""}`}>
    {Object.entries(message.reactions)
      .filter(([_, users]: any) => users.length > 0)
      .map(([emoji, users]: any) => (
        <span
          key={emoji}
          className="text-xs bg-zinc-800 px-2 py-1 rounded-full"
        >
          {emoji} {users.length}
        </span>
      ))}
  </div>
)}
        </div>

        {isMine && (
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs">
            {message.user[0]}
          </div>
        )}

      </div>

      {/* ACTIONS */}
      <div className={`hidden group-hover:flex gap-2 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>

        {["👍","❤️","😂"].map(e => (
          <button
            key={e}
            onClick={() => onReact && onReact(message, e)}
            className="text-xs bg-zinc-800 px-2 rounded-full"
          >
            {e}
          </button>
        ))}

        {/* ✅ REPLY BUTTON */}
        <button
          onClick={() => onReply && onReply(message)}
          className="text-xs bg-zinc-800 px-2 rounded-full"
        >
          ↩️
        </button>

      </div>

    </div>
  );
}