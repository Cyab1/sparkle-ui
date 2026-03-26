import { forwardRef } from "react";
import { Trash2, Pencil, X } from "lucide-react";

const MessageMenu = forwardRef(function MessageMenu(
  { onEdit, onDelete, onClose }: any,
  ref: any
) {
  return (
    <div
      ref={ref}
      className="
        fixed bottom-16 left-1/2 -translate-x-1/2
        bg-zinc-900/95 backdrop-blur-md
        border border-zinc-700
        rounded-2xl shadow-xl
        px-3 py-2
        flex gap-2
        z-50
      "
    >
      {/* EDIT */}
      <button
        onClick={onEdit}
        className="
          flex items-center gap-2
          px-3 py-2 rounded-xl
          hover:bg-zinc-800 transition
          text-sm
        "
      >
        <Pencil size={16} /> Edit
      </button>

      {/* DELETE */}
      <button
        onClick={onDelete}
        className="
          flex items-center gap-2
          px-3 py-2 rounded-xl
          hover:bg-red-600/20 transition
          text-red-400 text-sm
        "
      >
        <Trash2 size={16} /> Delete
      </button>

      {/* CLOSE */}
      <button
        onClick={onClose}
        className="
          flex items-center gap-2
          px-3 py-2 rounded-xl
          hover:bg-zinc-800 transition
          text-sm
        "
      >
        <X size={16} />
      </button>
    </div>
  );
});

export default MessageMenu;