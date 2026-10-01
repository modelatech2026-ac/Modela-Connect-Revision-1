/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getApps, initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

/**
 * Universal Environment Variable Reader
 * Reads configuration directly from both Vite (import.meta.env.VITE_FIREBASE_*)
 * and Next.js / Node (process.env.NEXT_PUBLIC_FIREBASE_*) environments.
 */
function readEnv(keyVite: string, keyNext: string): string {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[keyVite]) {
      return String(import.meta.env[keyVite]).trim();
    }
  } catch {
    // Ignore in non-meta environments
  }

  try {
    if (typeof process !== "undefined" && process.env) {
      if (process.env[keyNext]) return String(process.env[keyNext]).trim();
      if (process.env[keyVite]) return String(process.env[keyVite]).trim();
    }
  } catch {
    // Ignore in non-process environments
  }

  return "";
}

const rawApiKey = readEnv("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY");
const rawProjectId = readEnv("VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const rawAuthDomain = readEnv("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
const rawStorageBucket = readEnv("VITE_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
const rawMessagingSenderId = readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
const rawAppId = readEnv("VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID");

export const isLiveFirebaseConfigured = Boolean(
  rawApiKey &&
  rawProjectId &&
  !rawApiKey.toLowerCase().includes("dummy") &&
  !rawProjectId.toLowerCase().includes("dummy") &&
  rawApiKey.length > 20
);

export const firebaseConfig = isLiveFirebaseConfigured
  ? {
      apiKey: rawApiKey,
      authDomain: rawAuthDomain || `${rawProjectId}.firebaseapp.com`,
      projectId: rawProjectId,
      storageBucket: rawStorageBucket || `${rawProjectId}.appspot.com`,
      messagingSenderId: rawMessagingSenderId || "",
      appId: rawAppId || "",
    }
  : null;

// Safe Singletons to prevent re-initialization during HMR or SSR
let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;

/**
 * Resolves or initializes Firebase App, Auth, and Firestore
 * Includes proper check routines so Firebase does not attempt re-initialization
 * during hot reloads or server-side renders.
 */
export function getSafeFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
} {
  // Prevent initialization during server-side renders without browser DOM
  if (typeof window === "undefined" && typeof globalThis === "undefined") {
    return { app: null, auth: null, db: null };
  }

  if (cachedApp && cachedAuth && cachedDb) {
    return { app: cachedApp, auth: cachedAuth, db: cachedDb };
  }

  try {
    // Check existing initialized apps first (HMR protection)
    const existingApps = getApps();
    if (existingApps.length > 0) {
      cachedApp = existingApps[0];
      cachedAuth = getAuth(cachedApp);
      cachedDb = getFirestore(cachedApp);
      return { app: cachedApp, auth: cachedAuth, db: cachedDb };
    }

    if (!isLiveFirebaseConfigured || !firebaseConfig) {
      return { app: null, auth: null, db: null };
    }

    // Re-check getApps() before initializeApp to guard against rapid concurrent HMR cycles
    if (getApps().length === 0) {
      cachedApp = initializeApp(firebaseConfig);
    } else {
      cachedApp = getApps()[0];
    }

    cachedAuth = getAuth(cachedApp);
    cachedDb = getFirestore(cachedApp);
    return { app: cachedApp, auth: cachedAuth, db: cachedDb };
  } catch (err) {
    console.warn("Firebase safe initialization warning:", err);
    return { app: null, auth: null, db: null };
  }
}

/**
 * Resolves Firebase Storage with HMR protection
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  if (cachedStorage) return cachedStorage;

  const { app } = getSafeFirebase();
  if (app) {
    try {
      cachedStorage = getStorage(app);
      return cachedStorage;
    } catch (err) {
      console.warn("Storage initialization warning:", err);
    }
  }

  return null;
}
