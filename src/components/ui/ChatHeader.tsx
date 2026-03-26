import { Trash2, LogOut } from "lucide-react";

export default function ChatHeader({
  room,
  isJoined,
  onBack,
  onClear,
  onLeave
}: any) {

  return (
    <div className="p-4 border-b border-gray-800 flex justify-between items-center">

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="md:hidden">←</button>
        <h2 className="font-bold">{room}</h2>
      </div>

      {isJoined && (
        <div className="flex gap-3">
          <button onClick={onClear}>
            <Trash2 size={18}/>
          </button>

          <button onClick={onLeave}>
            <LogOut size={18}/>
          </button>
        </div>
      )}
    </div>
  );
}