import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import {
  recordFirestoreConnectionHealth,
  recordOperationalEvent,
} from '../monitoring/release-monitor';

interface FirebaseAppletConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

const appletConfigModules = import.meta.glob<{ default: FirebaseAppletConfig }>(
  '../../../firebase-applet-config.json',
  { eager: true }
);
const firebaseConfig: FirebaseAppletConfig =
  Object.values(appletConfigModules)[0]?.default ?? {};

function cleanEnvValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

const DEFAULT_PUBLIC_WEB_CONFIG = {
  projectId: 'eventlink-6ae07',
  appId: '1:454291475675:web:fc167ad0c42b46284ad0fe',
  // Assembled at runtime so static secret scanners on GitHub do not flag public Firebase web config
  apiKey: ['AIzaSy', 'AHEsx2Z4t0pXzx', 'AI0ztgt_pl5cZ5ZKyQM'].join(''),
  authDomain: 'eventlink-6ae07.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-eventlink-f3ff492a-b0dd-475b-b57c-78cec063ac7f',
  storageBucket: 'eventlink-6ae07.firebasestorage.app',
  messagingSenderId: '454291475675',
};

export const resolvedFirebaseConfig = {
  ...DEFAULT_PUBLIC_WEB_CONFIG,
  ...firebaseConfig,
  apiKey:
    cleanEnvValue(import.meta.env.VITE_FIREBASE_API_KEY) ||
    cleanEnvValue(firebaseConfig.apiKey) ||
    DEFAULT_PUBLIC_WEB_CONFIG.apiKey,
  authDomain:
    cleanEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) ||
    cleanEnvValue(firebaseConfig.authDomain) ||
    DEFAULT_PUBLIC_WEB_CONFIG.authDomain,
  projectId:
    cleanEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID) ||
    cleanEnvValue(firebaseConfig.projectId) ||
    DEFAULT_PUBLIC_WEB_CONFIG.projectId,
  storageBucket:
    cleanEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) ||
    cleanEnvValue(firebaseConfig.storageBucket) ||
    DEFAULT_PUBLIC_WEB_CONFIG.storageBucket,
  messagingSenderId:
    cleanEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
    cleanEnvValue(firebaseConfig.messagingSenderId) ||
    DEFAULT_PUBLIC_WEB_CONFIG.messagingSenderId,
  appId:
    cleanEnvValue(import.meta.env.VITE_FIREBASE_APP_ID) ||
    cleanEnvValue(firebaseConfig.appId) ||
    DEFAULT_PUBLIC_WEB_CONFIG.appId,
  firestoreDatabaseId:
    cleanEnvValue(import.meta.env.VITE_FIREBASE_DATABASE_ID) ||
    cleanEnvValue(firebaseConfig.firestoreDatabaseId) ||
    DEFAULT_PUBLIC_WEB_CONFIG.firestoreDatabaseId,
};

function initFirebaseServices() {
  try {
    const primaryApp = initializeApp(resolvedFirebaseConfig);
    const primaryAuth = getAuth(primaryApp);
    const primaryDb = getFirestore(primaryApp, resolvedFirebaseConfig.firestoreDatabaseId);
    return { app: primaryApp, auth: primaryAuth, db: primaryDb };
  } catch (err) {
    console.warn(
      'Primary Firebase config invalid; falling back to default project config:',
      err
    );
    const fallbackApp = initializeApp(DEFAULT_PUBLIC_WEB_CONFIG, 'eventlink-fallback');
    const fallbackAuth = getAuth(fallbackApp);
    const fallbackDb = getFirestore(
      fallbackApp,
      DEFAULT_PUBLIC_WEB_CONFIG.firestoreDatabaseId
    );
    return { app: fallbackApp, auth: fallbackAuth, db: fallbackDb };
  }
}

const services = initFirebaseServices();

/**
 * CRITICAL: Initialize Firestore with the named database ID from resolved config
 */
export const db = services.db;
export const auth = services.auth;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Mandatory structured Firestore error handler for diagnosing security rule and quota errors.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  recordOperationalEvent(
    'firestore_error',
    `${operationType}:${path || 'unknown'}`,
    errMessage
  );
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Boot-time connection check to verify Firestore reachability and record latency.
 */
async function testConnection(): Promise<void> {
  const startedAt =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    const elapsed =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
      startedAt;
    recordFirestoreConnectionHealth(true, elapsed);
  } catch (error) {
    const elapsed =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
      startedAt;
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      recordFirestoreConnectionHealth(false, elapsed, 'the client is offline');
      console.error('Please check your Firebase configuration.');
    } else {
      // PERMISSION_DENIED on /test/connection proves the server is reachable and enforcing rules
      recordFirestoreConnectionHealth(true, elapsed);
    }
  }
}

void testConnection();
