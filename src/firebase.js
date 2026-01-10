import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAfeZ7lh8j2vQhgzZycwXH1OIlCCLg_o2M",
    authDomain: "ecocycle-b409a.firebaseapp.com",
    projectId: "ecocycle-b409a",
    storageBucket: "ecocycle-b409a.firebasestorage.app",
    messagingSenderId: "457607732144",
    appId: "1:457607732144:web:ca198ef5bfea9142735475",
    measurementId: "G-TQ702HN3CQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
