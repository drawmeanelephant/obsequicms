import { useCallback, useEffect, useState } from 'react';
import type { ObsequiousClient, ReadinessIndex } from '@obsequious/contracts';

export type ReadinessState =
  | { phase: 'loading' }
  | { phase: 'error'; error: unknown }
  | { phase: 'ready'; index: ReadinessIndex };

/**
 * Loads the readiness index through the injected client. A failure
 * surfaces as an explicit error state — never as empty data, sample data,
 * or a fabricated pass.
 */
export function useReadiness(
  client: ObsequiousClient,
): { state: ReadinessState; reload: () => void } {
  const [state, setState] = useState<ReadinessState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    client
      .getReadiness()
      .then((index) => {
        if (!cancelled) {
          setState({ phase: 'ready', index });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ phase: 'error', error });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, attempt]);

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { state, reload };
}
