export default function RoomCard({
  room,
  active,
  onClick,
  unreadCount = 0,
}: any) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl mb-2 cursor-pointer transition-colors duration-200 relative
        ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground hover:bg-secondary/80"
        }`}
    >
      <p className="font-medium">{room.name}</p>
      <p
        className={`text-xs mt-0.5 ${active ? "opacity-70" : "text-muted-foreground"}`}
      >
        {room.desc}
      </p>
      {unreadCount > 0 && (
        <span className="absolute top-3 right-3 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  );
}
