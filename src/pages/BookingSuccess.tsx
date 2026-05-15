import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

interface BookingDetails {
  className: string;
  dateDisplay: string;
  time: string;
  trainer: string;
  category: string;
  price: number;
}

export function BookingSuccess({ onContinue }: { onContinue: () => void }) {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read bookingId from URL query string
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("bookingId");

    if (!bookingId) {
      setLoading(false);
      return;
    }

    // Look up the booking details from Firebase
    get(ref(db, `mk2_bookings/${bookingId}`))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setBooking({
            className: data.className ?? "Class",
            dateDisplay: data.dateDisplay ?? "",
            time: data.time ?? "",
            trainer: data.trainer ?? "",
            category: data.category ?? "",
            price: data.price ?? 0,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Clean up URL without reloading
  useEffect(() => {
    window.history.replaceState({}, document.title, "/");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.15,
            type: "spring",
            stiffness: 200,
            damping: 14,
          }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: "hsl(142 72% 37% / 0.15)",
            border: "2px solid hsl(142 72% 37% / 0.4)",
          }}
        >
          <span className="text-4xl">✓</span>
        </motion.div>

        {/* Heading */}
        <div
          className="font-display text-3xl tracking-wide mb-2"
          style={{ color: "hsl(142 72% 37%)" }}
        >
          BOOKING CONFIRMED
        </div>
        <div className="text-muted-foreground text-sm mb-8">
          Your payment was successful and your spot is reserved.
        </div>

        {/* Booking details card */}
        {!loading && booking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl p-5 mb-8 text-left"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderTop: "3px solid hsl(20 100% 50%)",
            }}
          >
            <div className="font-display text-xl tracking-wide mb-1 text-primary">
              {booking.className}
            </div>
            {booking.dateDisplay && (
              <div className="text-sm font-bold text-foreground mb-3">
                {booking.dateDisplay}
                {booking.time && ` · ${booking.time}`}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {booking.trainer && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>👤</span>
                  <span>{booking.trainer}</span>
                </div>
              )}
              {booking.category && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>🏷</span>
                  <span>{booking.category}</span>
                </div>
              )}
              {booking.price > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>💳</span>
                  <span>R{booking.price.toFixed(2)} paid</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-sm text-muted-foreground mb-8">
            Loading booking details…
          </div>
        )}

        {/* No booking found — still show success */}
        {!loading && !booking && (
          <div
            className="rounded-xl p-4 mb-8 text-sm text-muted-foreground"
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            Your payment was received. Check your email for confirmation or
            visit the Classes page to see your booking.
          </div>
        )}

        {/* Info note */}
        <div
          className="rounded-xl px-4 py-3 mb-8 text-xs text-left"
          style={{
            background: "hsl(20 100% 50% / 0.06)",
            border: "1px solid hsl(20 100% 50% / 0.2)",
          }}
        >
          <div className="font-bold mb-1" style={{ color: "hsl(20 100% 50%)" }}>
            What's next?
          </div>
          <ul className="text-muted-foreground space-y-1 leading-relaxed">
            <li>
              • Your booking appears under "Upcoming Bookings" in the Classes
              page
            </li>
            <li>• Arrive 5 minutes before class starts</li>
            <li>• Cancellations must be made at least 1 hour before class</li>
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl font-body font-bold text-sm border-none cursor-pointer transition-all active:scale-95"
          style={{ background: "hsl(20 100% 50%)", color: "#000" }}
        >
          Back to App →
        </button>
      </motion.div>
    </div>
  );
}
