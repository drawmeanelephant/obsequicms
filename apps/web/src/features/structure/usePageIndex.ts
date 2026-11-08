import { useCallback, useEffect, useState } from 'react';
import type { ObsequiousClient, PageIndex } from '@obsequious/contracts';

export type PageIndexState =
  | { phase: 'loading' }
  | { phase: 'error'; error: unknown }
  | { phase: 'ready'; index: PageIndex };

/**
 * Loads the page index through the injected client. A failure rejects the
 * load and surfaces as an explicit error state — data is never substituted
 * and a failed request never renders as an empty success.
 */
export function usePageIndex(
  client: ObsequiousClient,
): { state: PageIndexState; reload: () => void } {
  const [state, setState] = useState<PageIndexState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    client
      .getPages()
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
