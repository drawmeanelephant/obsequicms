import { useEffect, useState } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Text } from '@astryxdesign/core/Text';
import {
  isApiError,
  type ObsequiousClient,
  type PageIndex,
  type PageSummary,
} from '@obsequious/contracts';

type SourceState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; content: string; fileHash: string };

export type SourcePreviewProps = {
  client: ObsequiousClient;
  index: PageIndex;
  page: PageSummary;
};

/**
 * Read-only raw source view for the selected page. It fetches through the
 * injected client, shows original line endings byte-faithfully, and turns
 * failures into explicit error text — never into fake content. This is a
 * viewer, not an editor; nothing here saves.
 */
export function SourcePreview({ client, index, page }: SourcePreviewProps) {
  const [state, setState] = useState<SourceState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    client
      .getSource({
        path: page.sourcePath,
        sourceRevision: index.sourceRevision,
      })
      .then((buffer) => {
        if (!cancelled) {
          setState({
            phase: 'ready',
            content: buffer.content,
            fileHash: buffer.fileHash,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: isApiError(error)
              ? `${error.code}: ${error.message}`
              : 'The request failed without a typed error.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, page.sourcePath, index.sourceRevision]);

  return (
    <Section variant="section">
      <Heading level={3}>Source file</Heading>
      <Text type="supporting">
        Raw bytes of {page.sourcePath}, shown read-only with original line
        endings.
      </Text>
      {state.phase === 'loading' ? (
        <Spinner size="sm" label="Loading source" />
      ) : null}
      {state.phase === 'error' ? (
        <Text type="supporting" color="secondary" role="alert">
          The source file could not be loaded — {state.message}
        </Text>
      ) : null}
      {state.phase === 'ready' ? (
        <>
          <pre
            className="structure-source"
            role="region"
            aria-label={`Raw source of ${page.sourcePath}`}
            tabIndex={0}
          >
            {state.content}
          </pre>
          <Text type="supporting" color="secondary">
            SHA-256 {state.fileHash.slice(0, 12)}…
          </Text>
        </>
      ) : null}
    </Section>
  );
}

export default SourcePreview;
