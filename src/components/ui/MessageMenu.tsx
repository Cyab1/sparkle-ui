import { forwardRef } from "react";
import { Trash2, Pencil, X } from "lucide-react";

const MessageMenu = forwardRef(function MessageMenu(
  { onEdit, onDelete, onClose }: any,
  ref: any,
) {
  return (
    <div
      ref={ref}
      className="fixed bottom-16 left-1/2 -translate-x-1/2 backdrop-blur-md bg-card border border-border text-foreground rounded-2xl shadow-xl px-3 py-2 flex gap-2 z-50 transition-colors duration-200"
    >
      <button
        onClick={onEdit}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-secondary transition-colors"
      >
        <Pencil size={16} /> Edit
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={16} /> Delete
      </button>
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
});

export default MessageMenu;
