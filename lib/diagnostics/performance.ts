export type LoadPhase = 'initial-load' | 'refresh';

type PerformanceOperation =
  | 'root.session-bootstrap'
  | 'root.font-bootstrap'
  | 'goals.load'
  | 'goals.enrichment'
  | 'dashboard.active-goals-feed'
  | 'dashboard.primary-content-ready'
  | 'projects.load'
  | 'entries.load'
  | 'entries.screen-ready';

type DiagnosticMetadata = {
  phase?: LoadPhase;
  resultCount?: number;
  containerCount?: number;
  requestCount?: number;
  fontCount?: number;
};

type CompletionMetadata = DiagnosticMetadata & {
  success: boolean;
};

type PerformanceTimer = {
  end: (metadata: CompletionMetadata) => void;
};

const DIAGNOSTIC_FLAG = 'EXPO_PUBLIC_PERF_DIAGNOSTICS';

function isDiagnosticsEnabled(): boolean {
  const isDevelopmentBuild = typeof __DEV__ !== 'undefined' && __DEV__;
  const isExplicitlyEnabled = process.env[DIAGNOSTIC_FLAG] === 'true';
  return isDevelopmentBuild || isExplicitlyEnabled;
}

function now(): number {
  const performance = typeof globalThis !== 'undefined' ? globalThis.performance : undefined;
  return typeof performance?.now === 'function' ? performance.now() : Date.now();
}

/**
 * Emits aggregate-only timing diagnostics. Callers must pass counts and fixed
 * labels only; never include record content, identifiers, credentials, or errors.
 */
export function startPerformanceTimer(
  operation: PerformanceOperation,
  initialMetadata: DiagnosticMetadata = {},
): PerformanceTimer {
  if (!isDiagnosticsEnabled()) {
    return { end: () => undefined };
  }

  const startedAt = now();
  let completed = false;

  return {
    end: (metadata) => {
      if (completed) return;
      completed = true;

      console.info('[performance]', {
        operation,
        durationMs: Math.round(now() - startedAt),
        ...initialMetadata,
        ...metadata,
      });
    },
  };
}
