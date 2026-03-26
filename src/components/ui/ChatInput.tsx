import { Send } from "lucide-react";
import { useRef } from "react";

export default function ChatInput({
  text,
  setText,
  sendMessage,
  createPoll,
  replyTo,
  setReplyTo,
  onFileSelect
}: any) {

  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onFileSelect) {
      onFileSelect(file);
    }

    // ✅ reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="p-3 border-t border-gray-800">

      {/* ✅ REPLY PREVIEW */}
      {replyTo && (
        <div className="bg-zinc-800 border-l-4 border-orange-500 p-2 rounded mb-2 text-sm flex justify-between items-center">
          <div className="overflow-hidden">
            <p className="text-gray-400 text-xs">
              Replying to {replyTo.user}
            </p>
            <p className="truncate text-xs">
              {replyTo.text}
            </p>
          </div>

          <button
            onClick={() => setReplyTo(null)}
            className="ml-2 text-xs"
          >
            ✖
          </button>
        </div>
      )}

      {/* INPUT ROW */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-zinc-900 p-2 rounded"
          placeholder="Type message..."
        />

        {/* ✅ FILE INPUT */}
        <input
          type="file"
          ref={fileRef}
          hidden
          accept="image/*,video/*"
          onChange={handleFileChange}
        />

        {/* 📎 Upload Button */}
        <button onClick={() => fileRef.current?.click()}>
          📎
        </button>

        <button onClick={createPoll}>📊</button>

        <button onClick={sendMessage}>
          <Send />
        </button>
      </div>
    </div>
  );
}