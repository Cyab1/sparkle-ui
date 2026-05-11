import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { AuthScreen } from "@/pages/AuthScreen";
import { Dashboard } from "@/pages/Dashboard";
import { WorkoutPlanner } from "@/pages/WorkoutPlanner";
import { NutritionCoach } from "@/pages/NutritionCoach";
import { ProgressReport } from "@/pages/ProgressTracker";
import { ClassBooking } from "@/pages/ClassBooking";
import { CheckIn } from "@/pages/CheckIn";
import { Membership } from "@/pages/Membership";
import { Community } from "@/pages/Community";
import { Gallery } from "@/pages/Gallery";
import { NewsEvents } from "@/pages/NewsEvents";
import { Account } from "@/pages/Account";
import { Leaderboard } from "@/pages/Leaderboard";
import { NotificationsInbox } from "@/pages/NotificationsInbox";
// If you renamed the file:
import { NotificationSettings } from "@/pages/NotificationSettings";
import { InBody } from "@/pages/Inbody";
import { BMR } from "@/pages/BMR";
import { PRLogbook } from "@/pages/PRLogbook";
import { Toast } from "@/components/shared/Toast";
import { MembershipGate } from "@/components/MembershipGate";
import { AboutUs } from "@/pages/AboutUs";
import { Contact } from "@/pages/Contact";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { Advertise } from "@/pages/Advertise";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { motion } from "framer-motion";

import { Onboarding } from "@/pages/Onboarding";
// Admin is a NAMED export — matches "export function Admin()" in Admin.tsx
import { Admin } from "@/pages/Admin";

function AppContent() {
  const { user, booting, toastData, clearToast } = useAuth();
  const [page, setPage] = useState("Dashboard");

  usePushNotifications(setPage);

  // Admin panel — no login required, accessed via /#admin
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

  // Show onboarding only for brand-new users.
  // Uses optional chaining (?.) so missing fields on fresh accounts
  // don't throw and cause a permanent stuck state.
  const isNewUser =
    !(user as any).onboardingDone &&
    (user.checkIns?.length ?? 0) === 0 &&
    (user.bookings?.length ?? 0) === 0 &&
    (user.workouts?.length ?? 0) === 0;

  if (isNewUser) {
    return (
      <>
        <Onboarding onDone={() => setPage("Dashboard")} setPage={setPage} />
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
        {/* ── Free pages ──────────────────────────────────────────────────── */}
        {page === "Dashboard" && <Dashboard setPage={setPage} />}
        {page === "Classes" && <ClassBooking setPage={setPage} />}
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
        {page === "NotificationsInbox" && (
          <NotificationsInbox setPage={setPage} />
        )}
        {page === "NotificationSettings" && (
          <NotificationSettings setPage={setPage} />
        )}

        {/* ── Silver tier ─────────────────────────────────────────────────── */}
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

        {/* ── Gold tier ───────────────────────────────────────────────────── */}
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
            <InBody setPage={setPage} />
          </MembershipGate>
        )}
        {page === "Progress" && (
          <MembershipGate
            required="gold"
            feature="Progress Report"
            icon="trending_up"
            setPage={setPage}
          >
            <ProgressReport setPage={setPage} />
          </MembershipGate>
        )}
      </Layout>

      {toastData && (
        <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />
      )}
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

// import { useState, useEffect } from "react";
// import { AuthProvider, useAuth } from "@/context/AuthContext";
// import { Layout } from "@/components/layout/Layout";
// import { AuthScreen } from "@/pages/AuthScreen";
// import { Dashboard } from "@/pages/Dashboard";
// import { WorkoutPlanner } from "@/pages/WorkoutPlanner";
// import { NutritionCoach } from "@/pages/NutritionCoach";
// import { ProgressReport } from "@/pages/ProgressTracker";
// import { ClassBooking } from "@/pages/ClassBooking";
// import { CheckIn } from "@/pages/CheckIn";
// import { Membership } from "@/pages/Membership";
// import { Community } from "@/pages/Community";
// import { Gallery } from "@/pages/Gallery";
// import { NewsEvents } from "@/pages/NewsEvents";
// import { Account } from "@/pages/Account";
// import { Leaderboard } from "@/pages/Leaderboard";
// import { Notifications } from "@/pages/Notifications";
// import { InBody } from "@/pages/Inbody";
// import { BMR } from "@/pages/BMR";
// import { PRLogbook } from "@/pages/PRLogbook";
// import { Toast } from "@/components/shared/Toast";
// import { MembershipGate } from "@/components/MembershipGate";
// import { AboutUs } from "@/pages/AboutUs";
// import { Contact } from "@/pages/Contact";
// import { Terms } from "@/pages/Terms";
// import { Privacy } from "@/pages/Privacy";
// import { Advertise } from "@/pages/Advertise";
// import { usePushNotifications } from "@/hooks/usePushNotifications";
// import { OfflineBanner } from "@/components/shared/OfflineBanner";
// import { motion } from "framer-motion";
// import { Admin } from "@/pages/Admin";
// import { BookingSuccess } from "@/pages/BookingSuccess";
// import { BookingCancel } from "@/pages/BookingCancel";

// function AppContent() {
//   const { user, booting, toastData, clearToast } = useAuth();
//   const [page, setPage] = useState("Dashboard");

//   usePushNotifications();

//   // Handle direct PayFast redirect URLs
//   useEffect(() => {
//     const path = window.location.pathname;
//     if (path === "/booking-success") {
//       setPage("BookingSuccess");
//     } else if (path === "/booking-cancel") {
//       setPage("BookingCancel");
//     }
//     // Optionally clear the URL hash/query without reload
//     if (path === "/booking-success" || path === "/booking-cancel") {
//       window.history.replaceState({}, "", "/");
//     }
//   }, []);

//   // Admin panel via hash
//   if (typeof window !== "undefined" && window.location.hash === "#admin") {
//     return (
//       <div className="min-h-screen bg-background text-foreground font-body">
//         <Admin />
//       </div>
//     );
//   }

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

//   // Special pages without layout (full screen)
//   if (page === "BookingSuccess") {
//     return (
//       <>
//         <BookingSuccess />
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
//   if (page === "BookingCancel") {
//     return (
//       <>
//         <BookingCancel />
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

//   return (
//     <>
//       <OfflineBanner />
//       <Layout page={page} setPage={setPage}>
//         {/* ── Free pages ──────────────────────────────────────────────────── */}
//         {page === "Dashboard" && <Dashboard setPage={setPage} />}
//         {page === "Classes" && <ClassBooking setPage={setPage} />}
//         {page === "Checkin" && <CheckIn />}
//         {page === "Gallery" && <Gallery />}
//         {page === "News" && <NewsEvents />}
//         {page === "Membership" && <Membership setPage={setPage} />}
//         {page === "Account" && <Account setPage={setPage} />}
//         {page === "About" && <AboutUs />}
//         {page === "Contact" && <Contact />}
//         {page === "Terms" && <Terms />}
//         {page === "Privacy" && <Privacy />}
//         {page === "Advertise" && <Advertise />}

//         {/* ── Silver tier ─────────────────────────────────────────────────── */}
//         {page === "Notifications" && (
//           <MembershipGate
//             required="silver"
//             feature="Push Notifications"
//             icon="notifications"
//             setPage={setPage}
//           >
//             <Notifications setPage={setPage} />
//           </MembershipGate>
//         )}
//         {page === "Community" && (
//           <MembershipGate
//             required="silver"
//             feature="Community Chat"
//             icon="group"
//             setPage={setPage}
//           >
//             <Community />
//           </MembershipGate>
//         )}
//         {page === "Leaderboard" && (
//           <MembershipGate
//             required="silver"
//             feature="Leaderboard"
//             icon="emoji_events"
//             setPage={setPage}
//           >
//             <Leaderboard />
//           </MembershipGate>
//         )}
//         {page === "PRLogbook" && (
//           <MembershipGate
//             required="silver"
//             feature="PR Logbook"
//             icon="emoji_events"
//             setPage={setPage}
//           >
//             <PRLogbook />
//           </MembershipGate>
//         )}
//         {/* ── Gold tier ───────────────────────────────────────────────────── */}
//         {page === "Workout" && (
//           <MembershipGate
//             required="gold"
//             feature="AI Workout Planner"
//             icon="bolt"
//             setPage={setPage}
//           >
//             <WorkoutPlanner />
//           </MembershipGate>
//         )}
//         {page === "Nutrition" && (
//           <MembershipGate
//             required="gold"
//             feature="Nutrition & Meal Plans"
//             icon="restaurant"
//             setPage={setPage}
//           >
//             <NutritionCoach />
//           </MembershipGate>
//         )}
//         {page === "BMR" && (
//           <MembershipGate
//             required="gold"
//             feature="BMR Calculator"
//             icon="monitor_heart"
//             setPage={setPage}
//           >
//             <BMR />
//           </MembershipGate>
//         )}
//         {page === "InBody" && (
//           <MembershipGate
//             required="gold"
//             feature="InBody Analysis"
//             icon="accessibility_new"
//             setPage={setPage}
//           >
//             <InBody setPage={setPage} />
//           </MembershipGate>
//         )}
//         {page === "Progress" && (
//           <MembershipGate
//             required="gold"
//             feature="Progress Report"
//             icon="trending_up"
//             setPage={setPage}
//           >
//             <ProgressReport setPage={setPage} />
//           </MembershipGate>
//         )}
//       </Layout>

//       {toastData && (
//         <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />
//       )}
//     </>
//   );
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <AppContent />
//     </AuthProvider>
//   );
// }

// import { useState } from "react";
// import { AuthProvider, useAuth } from "@/context/AuthContext";
// import { Layout } from "@/components/layout/Layout";
// import { AuthScreen } from "@/pages/AuthScreen";
// import { Dashboard } from "@/pages/Dashboard";
// import { WorkoutPlanner } from "@/pages/WorkoutPlanner";
// import { NutritionCoach } from "@/pages/NutritionCoach";
// import { ProgressReport } from "@/pages/ProgressTracker";
// import { ClassBooking } from "@/pages/ClassBooking";
// import { CheckIn } from "@/pages/CheckIn";
// import { Membership } from "@/pages/Membership";
// import { Community } from "@/pages/Community";
// import { Gallery } from "@/pages/Gallery";
// import { NewsEvents } from "@/pages/NewsEvents";
// import { Account } from "@/pages/Account";
// import { Leaderboard } from "@/pages/Leaderboard";
// import { Notifications } from "@/pages/Notifications";
// import { InBody } from "@/pages/Inbody";
// import { BMR } from "@/pages/BMR";
// import { PRLogbook } from "@/pages/PRLogbook";
// import { Toast } from "@/components/shared/Toast";
// import { MembershipGate } from "@/components/MembershipGate";
// import { AboutUs } from "@/pages/AboutUs";
// import { Contact } from "@/pages/Contact";
// import { Terms } from "@/pages/Terms";
// import { Privacy } from "@/pages/Privacy";
// import { Advertise } from "@/pages/Advertise";
// import { usePushNotifications } from "@/hooks/usePushNotifications";
// import { OfflineBanner } from "@/components/shared/OfflineBanner";
// import { motion } from "framer-motion";

// // Admin is a NAMED export — matches "export function Admin()" in Admin.tsx
// import { Admin } from "@/pages/Admin";

// function AppContent() {
//   const { user, booting, toastData, clearToast } = useAuth();
//   const [page, setPage] = useState("Dashboard");

//   usePushNotifications();

//   // Admin panel — no login required, accessed via /#admin
//   if (typeof window !== "undefined" && window.location.hash === "#admin") {
//     return (
//       <div className="min-h-screen bg-background text-foreground font-body">
//         <Admin />
//       </div>
//     );
//   }

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

//   return (
//     <>
//       <OfflineBanner />
//       <Layout page={page} setPage={setPage}>
//         {/* ── Free pages ──────────────────────────────────────────────────── */}
//         {page === "Dashboard" && <Dashboard setPage={setPage} />}
//         {/* {page === "Classes" && <ClassBooking />} */}
//         {page === "Classes" && <ClassBooking setPage={setPage} />}
//         {page === "Checkin" && <CheckIn />}
//         {page === "Gallery" && <Gallery />}
//         {page === "News" && <NewsEvents />}
//         {page === "Membership" && <Membership setPage={setPage} />}
//         {page === "Account" && <Account setPage={setPage} />}
//         {page === "About" && <AboutUs />}
//         {page === "Contact" && <Contact />}
//         {page === "Terms" && <Terms />}
//         {page === "Privacy" && <Privacy />}
//         {page === "Advertise" && <Advertise />}

//         {/* ── Silver tier ─────────────────────────────────────────────────── */}
//         {page === "Notifications" && (
//           <MembershipGate
//             required="silver"
//             feature="Push Notifications"
//             icon="notifications"
//             setPage={setPage}
//           >
//             <Notifications setPage={setPage} /> {/* ← added setPage */}
//           </MembershipGate>
//         )}
//         {page === "Community" && (
//           <MembershipGate
//             required="silver"
//             feature="Community Chat"
//             icon="group"
//             setPage={setPage}
//           >
//             <Community />
//           </MembershipGate>
//         )}
//         {page === "Leaderboard" && (
//           <MembershipGate
//             required="silver"
//             feature="Leaderboard"
//             icon="emoji_events"
//             setPage={setPage}
//           >
//             <Leaderboard />
//           </MembershipGate>
//         )}
//         {page === "PRLogbook" && (
//           <MembershipGate
//             required="silver"
//             feature="PR Logbook"
//             icon="emoji_events"
//             setPage={setPage}
//           >
//             <PRLogbook />
//           </MembershipGate>
//         )}
//         {/* ── Gold tier ───────────────────────────────────────────────────── */}
//         {page === "Workout" && (
//           <MembershipGate
//             required="gold"
//             feature="AI Workout Planner"
//             icon="bolt"
//             setPage={setPage}
//           >
//             <WorkoutPlanner />
//           </MembershipGate>
//         )}
//         {page === "Nutrition" && (
//           <MembershipGate
//             required="gold"
//             feature="Nutrition & Meal Plans"
//             icon="restaurant"
//             setPage={setPage}
//           >
//             <NutritionCoach />
//           </MembershipGate>
//         )}
//         {page === "BMR" && (
//           <MembershipGate
//             required="gold"
//             feature="BMR Calculator"
//             icon="monitor_heart"
//             setPage={setPage}
//           >
//             <BMR />
//           </MembershipGate>
//         )}
//         {page === "InBody" && (
//           <MembershipGate
//             required="gold"
//             feature="InBody Analysis"
//             icon="accessibility_new"
//             setPage={setPage}
//           >
//             <InBody setPage={setPage} />
//           </MembershipGate>
//         )}
//         {page === "Progress" && (
//           <MembershipGate
//             required="gold"
//             feature="Progress Report"
//             icon="trending_up"
//             setPage={setPage}
//           >
//             <ProgressReport setPage={setPage} />
//           </MembershipGate>
//         )}
//       </Layout>

//       {toastData && (
//         <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />
//       )}
//     </>
//   );
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <AppContent />
//     </AuthProvider>
//   );
// }
