export default function MessageBubble({
  message,
  uid,
  onReact,
  onMenu,
  startPress,
  cancelPress,
  onReply,
}: any) {
  if (!message) return null;

  const isMine = message.uid === uid;

  const timeStr = new Date(message.createdAt).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const EMOJIS = ["👍", "❤️", "😂", "😮", "🙏", "🔥"];

  return (
    <div
      className={`flex mb-1 px-2 ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex gap-2 max-w-[80%] ${isMine ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar — only for others */}
        {!isMine && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0 self-end mb-1"
            style={{ background: "hsl(20 100% 50%)" }}
          >
            {message.user?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}

        <div
          className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
        >
          {/* Sender name — only for others */}
          {!isMine && (
            <span
              className="text-[11px] font-bold mb-0.5 ml-1"
              style={{ color: "hsl(20 100% 50%)" }}
            >
              {message.user}
            </span>
          )}

          {/* Bubble */}
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              onMenu?.(message);
            }}
            onTouchStart={() => startPress?.(message)}
            onTouchEnd={cancelPress}
            onMouseDown={() => startPress?.(message)}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            className="relative group cursor-pointer select-none"
            style={{
              background: isMine ? "hsl(20 100% 50%)" : "hsl(var(--card))",
              border: isMine ? "none" : "1px solid hsl(var(--border))",
              borderRadius: isMine
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px",
              padding: "8px 12px",
              minWidth: 60,
              maxWidth: "100%",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
          >
            {/* Reply preview */}
            {message.replyTo && (
              <div
                className="mb-2 px-2 py-1.5 rounded-lg text-xs"
                style={{
                  background: isMine
                    ? "rgba(0,0,0,0.15)"
                    : "hsl(var(--secondary))",
                  borderLeft: "3px solid hsl(20 100% 50%)",
                }}
              >
                <div
                  className="font-bold mb-0.5"
                  style={{ color: isMine ? "#000" : "hsl(20 100% 50%)" }}
                >
                  {message.replyTo.user}
                </div>
                <div
                  className="truncate"
                  style={{
                    color: isMine
                      ? "rgba(0,0,0,0.7)"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {message.replyTo.text}
                </div>
              </div>
            )}

            {/* Text */}
            {message.text && (
              <p
                className="text-sm leading-snug break-words"
                style={{ color: isMine ? "#000" : "hsl(var(--foreground))" }}
              >
                {message.text}
              </p>
            )}

            {/* Image */}
            {message.type === "image" && (
              <div className="mt-1">
                <img
                  src={message.fileUrl}
                  alt="img"
                  className="rounded-xl cursor-pointer object-cover"
                  style={{ maxWidth: 220, maxHeight: 260, display: "block" }}
                  onClick={() => window.open(message.fileUrl, "_blank")}
                />
                <a
                  href={message.fileUrl}
                  download
                  className="text-[10px] mt-1 block"
                  style={{
                    color: isMine ? "rgba(0,0,0,0.6)" : "hsl(20 100% 50%)",
                  }}
                >
                  ⬇ Download
                </a>
              </div>
            )}

            {/* Video */}
            {message.type === "video" && (
              <video
                src={message.fileUrl}
                controls
                className="mt-1 rounded-xl"
                style={{ maxWidth: 220, maxHeight: 200 }}
              />
            )}

            {/* Timestamp + edited + ticks row */}
            <div
              className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}
            >
              {message.edited && (
                <span
                  className="text-[10px] italic"
                  style={{
                    color: isMine
                      ? "rgba(0,0,0,0.5)"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  edited
                </span>
              )}
              <span
                className="text-[10px]"
                style={{
                  color: isMine
                    ? "rgba(0,0,0,0.55)"
                    : "hsl(var(--muted-foreground))",
                }}
              >
                {timeStr}
              </span>
              {/* WhatsApp-style double tick for own messages */}
              {isMine && (
                <span
                  className="text-[10px]"
                  style={{ color: "rgba(0,0,0,0.55)" }}
                >
                  ✓✓
                </span>
              )}
            </div>

            {/* Hover quick-react + reply — shown on hover */}
            <div
              className={`absolute -top-8 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                isMine ? "right-0" : "left-0"
              }`}
            >
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => onReact?.(message, e)}
                  className="text-sm w-7 h-7 flex items-center justify-center rounded-full cursor-pointer border-none transition-transform hover:scale-110"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {e}
                </button>
              ))}
              <button
                onClick={() => onReply?.(message)}
                className="text-sm w-7 h-7 flex items-center justify-center rounded-full cursor-pointer border-none transition-transform hover:scale-110"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
                title="Reply"
              >
                ↩
              </button>
            </div>
          </div>

          {/* Reactions below bubble */}
          {message.reactions &&
            Object.entries(message.reactions).some(
              ([, users]: any) => users.length > 0,
            ) && (
              <div
                className={`flex gap-1 flex-wrap mt-1 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {Object.entries(message.reactions)
                  .filter(([, users]: any) => users.length > 0)
                  .map(([emoji, users]: any) => (
                    <button
                      key={emoji}
                      onClick={() => onReact?.(message, emoji)}
                      className="text-xs px-2 py-0.5 rounded-full border-none cursor-pointer transition-all hover:scale-105"
                      style={{
                        background: users.includes(uid)
                          ? "hsl(20 100% 50% / 0.15)"
                          : "hsl(var(--secondary))",
                        border: users.includes(uid)
                          ? "1px solid hsl(20 100% 50% / 0.4)"
                          : "1px solid hsl(var(--border))",
                        color: users.includes(uid)
                          ? "hsl(20 100% 50%)"
                          : "hsl(var(--foreground))",
                      }}
                    >
                      {emoji} {users.length}
                    </button>
                  ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// import { Trash2 } from "lucide-react";

// export default function MessageBubble({
//   message,
//   uid,
//   onReact,
//   onMenu,
//   startPress,
//   cancelPress,
//   onReply // ✅ FIX: add this
// }: any) {

//   if (!message) return null;

//   const isMine = message.uid === uid;

//   const totalReactions =
//     message.reactions
//       ? Object.values(message.reactions as Record<string, string[]>)
//           .reduce((a, b) => a + b.length, 0)
//       : 0;

//   return (
//     <div className="mb-3 group">

//       <div
//         onContextMenu={(e) => {
//           e.preventDefault();
//           onMenu && onMenu(message);
//         }}
//         onTouchStart={() => startPress && startPress(message)}
//         onTouchEnd={cancelPress}
//         className={`flex gap-2 ${isMine ? "justify-end" : ""}`}

//         onMouseDown={() => startPress && startPress(message)}
// onMouseUp={cancelPress}
// onMouseLeave={cancelPress}
//       >

//         {!isMine && (
//           <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs">
//             {message.user[0]}
//           </div>
//         )}

//         <div className="max-w-[70%]">
//           <div className={`p-3 rounded-xl ${isMine ? "bg-orange-500 text-black" : "bg-zinc-900"}`}>

//             {/* ✅ REPLY PREVIEW (FIXED POSITION) */}
//             {message.replyTo && (
//               <div className="bg-zinc-800 border-l-4 border-orange-500 p-2 rounded mb-2 text-xs">
//                 <p className="text-gray-400">{message.replyTo.user}</p>
//                 <p className="truncate">{message.replyTo.text}</p>
//               </div>
//             )}

//             <p className="text-xs opacity-70">
//               {message.user} • {new Date(message.createdAt).toLocaleTimeString()}
//             </p>

// {/* TEXT */}
// {message.text && <p>{message.text}</p>}

// {/* IMAGE */}
// {message.type === "image" && (
//   <div className="mt-2">
//     <img
//       src={message.fileUrl}
//       alt="img"
//       className="rounded-lg max-w-[250px] cursor-pointer"
//       onClick={() => window.open(message.fileUrl, "_blank")}
//     />

//     {/* DOWNLOAD BUTTON */}
//     <a
//       href={message.fileUrl}
//       download
//       className="text-xs text-orange-400 mt-1 block"
//     >
//       Download
//     </a>
//   </div>
// )}

// {/* VIDEO */}
// {message.type === "video" && (
//   <video
//     src={message.fileUrl}
//     controls
//     className="mt-2 rounded-lg max-h-60"
//   />
// )}
//             {message.edited && (
//               <span className="text-xs">(edited)</span>
//             )}
//           </div>
// {message.reactions && (
//   <div className={`mt-1 flex gap-2 flex-wrap ${isMine ? "justify-end" : ""}`}>
//     {Object.entries(message.reactions)
//       .filter(([_, users]: any) => users.length > 0)
//       .map(([emoji, users]: any) => (
//         <span
//           key={emoji}
//           className="text-xs bg-zinc-800 px-2 py-1 rounded-full"
//         >
//           {emoji} {users.length}
//         </span>
//       ))}
//   </div>
// )}
//         </div>

//         {isMine && (
//           <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs">
//             {message.user[0]}
//           </div>
//         )}

//       </div>

//       {/* ACTIONS */}
//       <div className={`hidden group-hover:flex gap-2 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>

//         {["👍","❤️","😂"].map(e => (
//           <button
//             key={e}
//             onClick={() => onReact && onReact(message, e)}
//             className="text-xs bg-zinc-800 px-2 rounded-full"
//           >
//             {e}
//           </button>
//         ))}

//         {/* ✅ REPLY BUTTON */}
//         <button
//           onClick={() => onReply && onReply(message)}
//           className="text-xs bg-zinc-800 px-2 rounded-full"
//         >
//           ↩️
//         </button>

//       </div>

//     </div>
//   );
// }
