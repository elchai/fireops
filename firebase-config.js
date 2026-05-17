/* ============================================================
   FireOps — Firebase Config (Stub)

   המערכת תפעל במלואה דרך LocalStorage עד שתחבר Firebase.
   להפעלת sync בזמן אמת:
   1. צור Firebase project ב-https://console.firebase.google.com (שם מוצע: fireops-prod)
   2. הפעל Firestore Database (mode: production rules)
   3. צור Web App → העתק את אובייקט הקונפיג
   4. החלף את הערכים למטה והעבר FIREBASE_ENABLED = true
   ============================================================ */

const FIREBASE_ENABLED = false;

const firebaseConfig = {
  apiKey:            "REPLACE_ME",
  authDomain:        "fireops-prod.firebaseapp.com",
  projectId:         "fireops-prod",
  storageBucket:     "fireops-prod.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId:             "REPLACE_ME"
};

// stub interface — app.js יקרא לפונקציות האלה. בשלב Phase 1 הן no-op.
window.FireOpsFirebase = {
  enabled: FIREBASE_ENABLED,

  async init() {
    if (!this.enabled) {
      console.info('🔥 FireOps: running in LocalStorage-only mode (Firebase disabled)');
      return false;
    }
    // TODO Phase 2: load firebase SDK from CDN, init app, init firestore
    console.warn('Firebase enabled but SDK loader not implemented yet');
    return false;
  },

  async pushState(state) {
    if (!this.enabled) return;
    // TODO: debounced write to Firestore
  },

  subscribeRemote(callback) {
    if (!this.enabled) return () => {};
    // TODO: onSnapshot listener
    return () => {};
  }
};
