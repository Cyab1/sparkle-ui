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
import { Leaderboard } from "@/pages/Leaderboard";
import { Notifications } from "@/pages/Notifications";
import { InBody } from "@/pages/Inbody";
import { BMR } from "@/pages/BMR";
import { Admin } from "@/pages/Admin";
import { PRLogbook } from "@/pages/PRLogbook";
import { Toast } from "@/components/shared/Toast";
import { motion } from "framer-motion";
import { MembershipGate } from "@/components/MembershipGate";
import { AboutUs } from "@/pages/AboutUs";
import { Contact } from "@/pages/Contact";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { Advertise } from "@/pages/Advertise";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

function AppContent() {
  const { user, booting, toastData, clearToast } = useAuth();
  const [page, setPage] = useState("Dashboard");

  if (typeof window !== "undefined" && window.location.hash === "#admin") {
    return (
      <div className="min-h-screen bg-background text-foreground font-body">
        <Admin />
      </div>
    );
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="font-display text-[32px] text-primary tracking-[0.15em]">
            MK2 RIVERS
          </div>
          <div className="text-muted-foreground text-xs mt-1.5 font-body">
            Connecting…
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        {toastData && (
          <Toast
            msg={toastData.msg}
            type={toastData.type}
            onDone={clearToast}
          />
        )}
      </>
    );
  }

  return (
    <>
      <OfflineBanner />
      <Layout page={page} setPage={setPage}>
        {/* Free pages */}
        {page === "Dashboard" && <Dashboard setPage={setPage} />}
        {page === "Classes" && <ClassBooking />}
        {page === "Checkin" && <CheckIn />}
        {page === "Gallery" && <Gallery />}
        {page === "News" && <NewsEvents />}
        {page === "Membership" && <Membership setPage={setPage} />}
        {page === "Account" && <Account setPage={setPage} />}
        {page === "About" && <AboutUs />}
        {page === "Contact" && <Contact />}
        {page === "Terms" && <Terms />}
        {page === "Privacy" && <Privacy />}
        {page === "Advertise" && <Advertise />}

        {/* Silver tier */}
        {page === "Notifications" && (
          <MembershipGate
            required="silver"
            feature="Push Notifications"
            icon="notifications"
            setPage={setPage}
          >
            <Notifications />
          </MembershipGate>
        )}
        {page === "Community" && (
          <MembershipGate
            required="silver"
            feature="Community Chat"
            icon="group"
            setPage={setPage}
          >
            <Community />
          </MembershipGate>
        )}
        {page === "Leaderboard" && (
          <MembershipGate
            required="silver"
            feature="Leaderboard"
            icon="emoji_events"
            setPage={setPage}
          >
            <Leaderboard />
          </MembershipGate>
        )}
        {page === "PRLogbook" && (
          <MembershipGate
            required="silver"
            feature="PR Logbook"
            icon="emoji_events"
            setPage={setPage}
          >
            <PRLogbook />
          </MembershipGate>
        )}

        {/* Gold tier */}
        {page === "Workout" && (
          <MembershipGate
            required="gold"
            feature="AI Workout Planner"
            icon="bolt"
            setPage={setPage}
          >
            <WorkoutPlanner />
          </MembershipGate>
        )}
        {page === "Nutrition" && (
          <MembershipGate
            required="gold"
            feature="Nutrition & Meal Plans"
            icon="restaurant"
            setPage={setPage}
          >
            <NutritionCoach />
          </MembershipGate>
        )}
        {page === "BMR" && (
          <MembershipGate
            required="gold"
            feature="BMR Calculator"
            icon="monitor_heart"
            setPage={setPage}
          >
            <BMR />
          </MembershipGate>
        )}
        {page === "InBody" && (
          <MembershipGate
            required="gold"
            feature="InBody Analysis"
            icon="accessibility_new"
            setPage={setPage}
          >
            <InBody />
          </MembershipGate>
        )}
        {page === "Progress" && (
          <MembershipGate
            required="gold"
            feature="Progress Tracker"
            icon="trending_up"
            setPage={setPage}
          >
            <ProgressTracker />
          </MembershipGate>
        )}
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// import { useState } from "react";
// import { AuthProvider, useAuth } from "@/context/AuthContext";
// import { Layout } from "@/components/layout/Layout";
// import { AuthScreen } from "@/pages/AuthScreen";
// import { Dashboard } from "@/pages/Dashboard";
// import { WorkoutPlanner } from "@/pages/WorkoutPlanner";
// import { NutritionCoach } from "@/pages/NutritionCoach";
// import { ProgressTracker } from "@/pages/ProgressTracker";
// import { ClassBooking } from "@/pages/ClassBooking";
// import { CheckIn } from "@/pages/CheckIn";
// import { Membership } from "@/pages/Membership";
// import { Community } from "@/pages/Community";
// import { Gallery } from "@/pages/Gallery";
// import { NewsEvents } from "@/pages/NewsEvents";
// import { Account } from "@/pages/Account";
// import { Leaderboard } from "./pages/Leaderboard"
// import { Notifications } from "./pages/Notifications";
// import { InBody } from "./pages/Inbody";
// import { Admin } from "@/pages/Admin";
// import { Toast } from "@/components/shared/Toast";
// import { motion } from "framer-motion";

// function AppContent() {
//   const { user, booting, toastData, clearToast } = useAuth();
//   const [page, setPage] = useState("Dashboard");

//   // Admin panel — accessible at /#admin without member login
//   if (typeof window !== "undefined" && window.location.hash === "#admin") {
//     return (
//       <div className="min-h-screen bg-background text-foreground font-body">
//         <Admin />
//       </div>
//     );
//   }

//   // Boot screen
//   if (booting) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           className="text-center"
//         >
//           <div className="font-display text-[32px] text-primary tracking-[0.15em]">
//             MK2 RIVERS
//           </div>
//           <div className="text-muted-foreground text-xs mt-1.5 font-body">
//             Connecting…
//           </div>
//         </motion.div>
//       </div>
//     );
//   }

//   // Auth screen
//   if (!user) {
//     return (
//       <>
//         <AuthScreen />
//         {toastData && (
//           <Toast
//             msg={toastData.msg}
//             type={toastData.type}
//             onDone={clearToast}
//           />
//         )}
//       </>
//     );
//   }

//   // Main app
//   return (
//     <Layout page={page} setPage={setPage}>
//       {page === "Dashboard" && <Dashboard setPage={setPage} />}
//       {page === "Workout" && <WorkoutPlanner />}
//       {page === "Nutrition" && <NutritionCoach />}
//       {page === "Progress" && <ProgressTracker />}
//       {page === "Classes" && <ClassBooking />}
//       {page === "Checkin" && <CheckIn />}
//       {page === "Membership" && <Membership />}
//       {page === "Community" && <Community />}
//       {page === "Gallery" && <Gallery />}
//       {page === "News" && <NewsEvents />}
//       {page === "Account" && <Account />}
//       {page === "Leaderboard" && <Leaderboard />}
//       {page === "Notifications" && <Notifications />}
//       {page === "InBody" && <InBody />}
//     </Layout>
//   );
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <AppContent />
//     </AuthProvider>
//   );
// }
