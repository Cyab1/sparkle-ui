import { Send } from "lucide-react";
import { useRef } from "react";

export default function ChatInput({
  text,
  setText,
  sendMessage,
  createPoll,
  replyTo,
  setReplyTo,
  onFileSelect,
}: any) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onFileSelect) onFileSelect(file);
    e.target.value = "";
  };

  return (
    <div className="p-3 border-t border-border bg-card transition-colors duration-200">
      {replyTo && (
        <div className="border-l-4 border-primary p-2 rounded mb-2 text-sm flex justify-between items-center bg-secondary">
          <div className="overflow-hidden">
            <p className="text-xs text-muted-foreground">
              Replying to {replyTo.user}
            </p>
            <p className="truncate text-xs text-foreground">{replyTo.text}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ✖
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
          className="flex-1 p-2 rounded bg-background text-foreground placeholder:text-muted-foreground border border-border outline-none transition-colors duration-200"
        />
        <input
          type="file"
          ref={fileRef}
          hidden
          accept="image/*,video/*"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          📎
        </button>
        <button
          onClick={createPoll}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          📊
        </button>
        <button
          onClick={sendMessage}
          className="text-primary hover:opacity-80 transition-opacity"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
