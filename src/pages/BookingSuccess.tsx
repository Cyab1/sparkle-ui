import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Btn } from "@/components/shared/Btn";

export function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const [status, setStatus] = useState<"loading" | "confirmed" | "notFound">(
    "loading",
  );
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!bookingId) {
      setStatus("notFound");
      return;
    }
    const checkBooking = async () => {
      const snap = await get(ref(db, `mk2_bookings/${bookingId}`));
      if (snap.exists() && snap.val().status === "confirmed") {
        setStatus("confirmed");
      } else {
        setStatus("notFound");
      }
    };
    checkBooking();
  }, [bookingId]);

  return (
    <div className="max-w-md mx-auto py-20 text-center">
      {status === "loading" && <p>Confirming your booking...</p>}
      {status === "confirmed" && (
        <>
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Your class booking is confirmed. See you at the gym!
          </p>
          <Btn variant="primary" onClick={() => navigate("/classes")}>
            Back to Classes
          </Btn>
        </>
      )}
      {status === "notFound" && (
        <>
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn’t confirm your booking. Please contact reception.
          </p>
          <Btn variant="primary" onClick={() => navigate("/classes")}>
            Go to Classes
          </Btn>
        </>
      )}
    </div>
  );
}
