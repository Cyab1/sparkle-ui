export default function RoomCard({ room, active, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl mb-2 cursor-pointer ${
        active ? "bg-orange-500 text-black" : "bg-zinc-900"
      }`}
    >
      <p>{room.name}</p>
      <p className="text-xs text-gray-400">{room.desc}</p>
    </div>
  );
}