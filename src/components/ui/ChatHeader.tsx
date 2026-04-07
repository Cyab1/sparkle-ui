import { Trash2, LogOut } from "lucide-react";

export default function ChatHeader({
  room,
  isJoined,
  onBack,
  onClear,
  onLeave,
}: any) {
  return (
    <div className="p-4 border-b border-border bg-card text-foreground flex justify-between items-center transition-colors duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
        >
          ←
        </button>
        <h2 className="font-bold">{room}</h2>
      </div>
      {isJoined && (
        <div className="flex gap-3">
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Clear my view"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onLeave}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Leave room"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
