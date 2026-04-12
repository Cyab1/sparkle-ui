import { useNavigate } from "react-router-dom";
import { Btn } from "@/components/shared/Btn";

export function BookingCancel() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="text-6xl mb-4">😞</div>
      <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
      <p className="text-muted-foreground mb-6">
        You cancelled the payment. No booking was made.
      </p>
      <Btn variant="primary" onClick={() => navigate("/classes")}>
        Try Again
      </Btn>
    </div>
  );
}
