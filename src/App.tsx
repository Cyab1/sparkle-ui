import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { AuthScreen } from "@/pages/AuthScreen";
import { Dashboard } from "@/pages/Dashboard";
import { WorkoutPlanner } from "@/pages/WorkoutPlanner";
import { NutritionCoach } from "@/pages/NutritionCoach";
import { ProgressTracker } from "@/pages/ProgressTracker";
import { ClassBooking } from "@/pages/ClassBooking";
import { CheckIn } from "@/pages/CheckIn";
import { Membership } from "@/pages/Membership";
import { Community } from "@/pages/Community";
import { Gallery } from "@/pages/Gallery";
import { NewsEvents } from "@/pages/NewsEvents";
import { Account } from "@/pages/Account";
import { Toast } from "@/components/shared/Toast";
import { motion } from "framer-motion";

function AppContent() {
  const { user, booting, toastData, clearToast } = useAuth();
  const [page, setPage] = useState("Dashboard");

  // Boot screen
  if (booting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="font-display text-[32px] text-primary tracking-[0.15em]">MK2 RIVERS</div>
          <div className="text-muted-foreground text-xs mt-1.5 font-body">Connecting to Firebase…</div>
        </motion.div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <>
        <AuthScreen />
        {toastData && <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />}
      </>
    );
  }

  // Main app
  return (
    <Layout page={page} setPage={setPage}>
      {page === "Dashboard" && <Dashboard setPage={setPage} />}
      {page === "Workout" && <WorkoutPlanner />}
      {page === "Nutrition" && <NutritionCoach />}
      {page === "Progress" && <ProgressTracker />}
      {page === "Classes" && <ClassBooking />}
      {page === "Checkin" && <CheckIn />}
      {page === "Membership" && <Membership />}
      {page === "Community" && <Community />}
      {page === "Gallery" && <Gallery />}
      {page === "News" && <NewsEvents />}
      {page === "Account" && <Account />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
