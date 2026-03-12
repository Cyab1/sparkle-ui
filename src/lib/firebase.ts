import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent as fbLogEvent } from "firebase/analytics";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmT8tgFZIjz6f6xIAyCTiq-ChETClnC4w",
  authDomain: "gym-pro-20ee6.firebaseapp.com",
  databaseURL: "https://gym-pro-20ee6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gym-pro-20ee6",
  storageBucket: "gym-pro-20ee6.firebasestorage.app",
  messagingSenderId: "816966119755",
  appId: "1:816966119755:web:299e532903d842f514f8ce",
  measurementId: "G-G0GH8BD9WD",
};

const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Firestore helpers
const getUserDoc = (uid: string) => doc(db, "users", uid);

const fetchUser = async (uid: string) => {
  const s = await getDoc(getUserDoc(uid));
  return s.exists() ? s.data() : null;
};

const saveUser = async (uid: string, data: any) => {
  await setDoc(getUserDoc(uid), data, { merge: true });
};

const logEvent = (event: string, params?: Record<string, any>) => {
  fbLogEvent(analytics, event, params);
};

export {
  auth,
  db,
  analytics,
  firebaseApp,
  fetchUser,
  saveUser,
  logEvent,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};
