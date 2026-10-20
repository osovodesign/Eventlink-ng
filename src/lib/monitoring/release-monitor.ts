/**
 * EventLink — Phase 12 Release Manifest & Operational Monitoring
 * Tracks non-PII operational health, Firestore latency, failed submissions, and abuse blocks
 * for the Administrator Governance & Monitoring console (/admin).
 */

import { ENV } from '../config/env';

const appletConfigModules = import.meta.glob<{
  default: { firestoreDatabaseId?: string };
}>('../../../firebase-applet-config.json', { eager: true });
const fallbackDbId =
  Object.values(appletConfigModules)[0]?.default?.firestoreDatabaseId ||
  'ai-studio-eventlink-f3ff492a-b0dd-475b-b57c-78cec063ac7f';

export interface ReleaseManifest {
  version: string;
  releaseStage: string;
  releasedAt: string;
  launchMarket: string;
  currency: string;
  timezone: string;
  firestoreDatabaseId: string;
  knownLimitations: string[];
}

export const RELEASE_MANIFEST: ReleaseManifest = {
  version: '1.0.0',
  releaseStage: ENV.appEnv,
  releasedAt: '2026-10-19',
  launchMarket: 'Warri & Effurun, Delta State, Nigeria',
  currency: ENV.defaultCurrency,
  timezone: ENV.defaultTimezone,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || fallbackDbId,
  knownLimitations: [
    'Geographic scope is intentionally focused on Warri and Effurun, Delta State for V1 launch.',
    'Enquiries and structured NGN quotations record customer and vendor responses but do not process online card/bank payments or automatically lock calendar dates.',
    'Public star ratings and customer reviews are excluded in V1 until verified post-event attendance confirmation is introduced.',
    'Listing approval indicates administrative review for marketplace completeness, not physical venue safety certification.',
  ],
};

export type OperationalEventType =
  | 'firestore_connection'
  | 'firestore_error'
  | 'submission_failed'
  | 'rate_limit_blocked'
  | 'ui_error_boundary';

export interface OperationalEventRecord {
  id: string;
  type: OperationalEventType;
  operation: string;
  summary: string;
  timestamp: string;
  durationMs?: number;
}

interface OperationalStore {
  bootLatencyMs: number | null;
  connectionStatus: 'connected' | 'degraded' | 'initializing';
  events: OperationalEventRecord[];
}

const store: OperationalStore = {
  bootLatencyMs: null,
  connectionStatus: 'initializing',
  events: [],
};

const MAX_EVENTS = 40;

export function recordFirestoreConnectionHealth(
  connected: boolean,
  latencyMs: number,
  detail?: string
): void {
  store.bootLatencyMs = Math.round(latencyMs);
  store.connectionStatus = connected ? 'connected' : 'degraded';
  recordOperationalEvent(
    'firestore_connection',
    'boot_ping',
    connected
      ? `Firestore reachable (${Math.round(latencyMs)} ms)`
      : `Firestore connection degraded: ${detail || 'offline'}`,
    Math.round(latencyMs)
  );
}

export function recordOperationalEvent(
  type: OperationalEventType,
  operation: string,
  summary: string,
  durationMs?: number
): void {
  const entry: OperationalEventRecord = {
    id: `ops_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    operation,
    summary: summary.slice(0, 240),
    timestamp: new Date().toISOString(),
    durationMs,
  };
  store.events = [entry, ...store.events].slice(0, MAX_EVENTS);
}

export function getOperationalHealthSnapshot(): {
  bootLatencyMs: number | null;
  connectionStatus: OperationalStore['connectionStatus'];
  errorCount: number;
  rateLimitCount: number;
  events: OperationalEventRecord[];
} {
  const errorCount = store.events.filter(
    (e) => e.type === 'firestore_error' || e.type === 'ui_error_boundary'
  ).length;
  const rateLimitCount = store.events.filter(
    (e) => e.type === 'rate_limit_blocked'
  ).length;

  return {
    bootLatencyMs: store.bootLatencyMs,
    connectionStatus: store.connectionStatus,
    errorCount,
    rateLimitCount,
    events: [...store.events],
  };
}

/**
 * Safely extracts a user-appropriate message from an unknown error or serialized FirestoreErrorInfo,
 * without leaking internal stack traces or auth tokens.
 */
export function parseSafeErrorSummary(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.startsWith('{') && raw.includes('"operationType"')) {
    try {
      const parsed = JSON.parse(raw) as {
        error?: string;
        operationType?: string;
      };
      if (
        parsed.error?.includes('Missing or insufficient permissions') ||
        parsed.error?.includes('PERMISSION_DENIED')
      ) {
        return 'You do not have permission to perform this action or view this restricted record.';
      }
      return (
        parsed.error ||
        `Database ${parsed.operationType || 'operation'} could not be completed.`
      );
    } catch {
      // Fall through
    }
  }
  return raw;
}
