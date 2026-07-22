// Lazy Firebase bootstrap. Reads web config from Vite env vars. When the config
// is absent the game runs in local-only mode and none of the Firebase SDK is
// even loaded (the imports below are dynamic, so they're code-split away and
// only fetched at runtime once a real config exists).

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function cloudEnabled(): boolean {
  return !!(cfg.apiKey && cfg.projectId && cfg.appId);
}

export interface CloudClient {
  db: import('firebase/firestore').Firestore;
  auth: import('firebase/auth').Auth;
  uid: string;
}

let clientPromise: Promise<CloudClient | null> | null = null;

/** Initialise Firebase + anonymous auth once. Resolves null when unconfigured. */
export function getClient(): Promise<CloudClient | null> {
  if (!cloudEnabled()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = (async () => {
      const [{ initializeApp }, authMod, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(cfg as Record<string, string>);
      const auth = authMod.getAuth(app);
      const db = getFirestore(app);
      const uid = await new Promise<string>((resolve) => {
        const off = authMod.onAuthStateChanged(auth, (u) => {
          if (u) { off(); resolve(u.uid); }
        });
        authMod.signInAnonymously(auth).catch(() => {});
      });
      return { db, auth, uid };
    })().catch(() => null);
  }
  return clientPromise;
}
