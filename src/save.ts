// Save service: localStorage is always the source of truth; when Firebase is
// configured, saves are mirrored to the cloud and can be pulled on another
// device. Bakeries can also be shared via a short link id.
//
// Every function degrades gracefully to a no-op / null when the cloud is off,
// so the game is fully playable with zero backend.

import { cloudEnabled, getClient } from './firebase';

export { cloudEnabled };

/** Push the latest save blob to this user's cloud document (fire-and-forget). */
export async function cloudMirror(json: string): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(c.db, 'saves', c.uid), { data: json, updatedAt: Date.now() });
  } catch { /* offline / rules / transient — keep local save */ }
}

/** Fetch this user's cloud save blob, or null. */
export async function cloudPull(): Promise<string | null> {
  try {
    const c = await getClient();
    if (!c) return null;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(c.db, 'saves', c.uid));
    return snap.exists() ? (snap.data().data as string) : null;
  } catch { return null; }
}

/** Publish a read-only copy of a bakery; returns a short share id (or null). */
export async function shareBakery(json: string): Promise<string | null> {
  try {
    const c = await getClient();
    if (!c) return null;
    const { collection, addDoc } = await import('firebase/firestore');
    const ref = await addDoc(collection(c.db, 'shared'), { data: json, createdAt: Date.now() });
    return ref.id;
  } catch { return null; }
}

/** Load a shared bakery blob by its share id, or null. */
export async function loadShared(id: string): Promise<string | null> {
  try {
    const c = await getClient();
    if (!c) return null;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(c.db, 'shared', id));
    return snap.exists() ? (snap.data().data as string) : null;
  } catch { return null; }
}
