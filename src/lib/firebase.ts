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
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  push,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBmT8tgFZIjz6f6xIAyCTiq-ChETClnC4w",
  authDomain: "gym-pro-20ee6.firebaseapp.com",
  databaseURL:
    "https://gym-pro-20ee6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gym-pro-20ee6",
  storageBucket: "gym-pro-20ee6.firebasestorage.app",
  messagingSenderId: "816966119755",
  appId: "1:816966119755:web:299e532903d842f514f8ce",
  measurementId: "G-G0GH8BD9WD",
};

const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

const fetchUser = async (uid: string) => {
  const snap = await get(ref(db, `mk2_users/${uid}`));
  return snap.exists() ? snap.val() : null;
};

const saveUser = async (uid: string, data: any) => {
  await set(ref(db, `mk2_users/${uid}`), data);
};

const fetchCollection = async (path: string) => {
  const snap = await get(ref(db, path));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.entries(val).map(([id, data]: any) => ({ id, ...data }));
};

const addToCollection = async (path: string, data: any) => {
  const newRef = push(ref(db, path));
  await set(newRef, { ...data, createdAt: Date.now() });
  return newRef.key;
};

const updateInCollection = async (path: string, id: string, data: any) => {
  await update(ref(db, `${path}/${id}`), { ...data, updatedAt: Date.now() });
};

const deleteFromCollection = async (path: string, id: string) => {
  await remove(ref(db, `${path}/${id}`));
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
  fetchCollection,
  addToCollection,
  updateInCollection,
  deleteFromCollection,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  get,
  update,
  remove,
  push,
};
