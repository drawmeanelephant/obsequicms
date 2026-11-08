import { useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import type { ReadinessItem } from '@obsequious/contracts';
import { KEY_EXPLANATIONS } from './explanations';
import {
  deploymentStaleness,
  generatedStaleness,
  observationStaleness,
  type Displayed,
} from './staleness';

export type ItemDetailProps = {
  item: ReadinessItem;
  displayed: Displayed;
};

function subjectText(item: ReadinessItem): string | null {
  if (item.observation.status !== 'complete') {
    return null;
  }
  const { subject } = item.observation;
  const parts = [
    subject.sourceRevision ? `source ${subject.sourceRevision}` : null,
    subject.releaseId ? `release ${subject.releaseId}` : null,
    subject.url ? `URL ${subject.url}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * The item detail panel. Configuration, generation, deployment, and the
 * last observation stay separate facts; staleness is derived by comparing
 * each record's subject with what the workspace displays. The next action
 * explains that the backend is not connected — activation runs nothing and
 * fabricates no success.
 */
export function ItemDetail({ item, displayed }: ItemDetailProps) {
  const [actionNote, setActionNote] = useState<string | null>(null);
  const explanation = KEY_EXPLANATIONS[item.key];
  const observationStale = observationStaleness(item.observation, displayed);
  const generatedStale = generatedStaleness(item, displayed);
  const deploymentStale = deploymentStaleness(item, displayed);

  return (
    <aside aria-label="Readiness item detail" className="readiness-detail">
      <Section variant="section">
        <Heading level={2}>{item.label}</Heading>
        <Badge variant="neutral" label={item.category} />
        <Text as="p">{explanation.purpose}</Text>
        <Text type="supporting" color="secondary" as="p">
          {explanation.applicability}
        </Text>
      </Section>

      <Section variant="section">
        <Heading level={3}>Facts</Heading>
        <MetadataList columns={1} label={{ position: 'top' }}>
          <MetadataListItem label="Configuration">
            <Text>
              {item.configuration === 'configured'
                ? 'Configured for this publication.'
                : 'Not configured. Nothing can be generated or checked yet.'}
            </Text>
          </MetadataListItem>
          <MetadataListItem label="Generated artifact">
            {item.generated ? (
              <>
                <Text>
                  {generatedStale.isStale
                    ? 'Present, but stale.'
                    : 'Present for the displayed source revision.'}
                </Text>
                <Text type="supporting" color="secondary">
                  Source {item.generated.sourceRevision} · evidence{' '}
                  {item.generated.evidenceId}
                  {generatedStale.reason ? ` — ${generatedStale.reason}` : ''}
                </Text>
              </>
            ) : (
              <Text type="supporting">Nothing has been generated.</Text>
            )}
          </MetadataListItem>
          <MetadataListItem label="Deployment">
            {item.deployment ? (
              <>
                <Text>
                  {deploymentStale.isStale
                    ? 'Present, but stale.'
                    : 'Present for the displayed release.'}
                </Text>
                <Text type="supporting" color="secondary">
                  Release {item.deployment.releaseId} · evidence{' '}
                  {item.deployment.evidenceId}
                  {deploymentStale.reason ? ` — ${deploymentStale.reason}` : ''}
                </Text>
              </>
            ) : (
              <Text type="supporting">
                Not deployed. Generated artifacts are not a deployment.
              </Text>
            )}
          </MetadataListItem>
        </MetadataList>
      </Section>

      <Section variant="section">
        <Heading level={3}>Last observation</Heading>
        {item.observation.status === 'not_checked' ? (
          <Text>
            Not checked. An absent check is not a pass, and missing evidence
            cannot produce one.
          </Text>
        ) : null}
        {item.observation.status === 'running' ? (
          <Text>
            A check is running (job {item.observation.jobId}). Its outcome is
            not known yet.
          </Text>
        ) : null}
        {item.observation.status === 'error' ? (
          <>
            <Badge variant="error" label="Check error" />
            <Text as="p">
              {item.observation.message} (code: {item.observation.code})
            </Text>
          </>
        ) : null}
        {item.observation.status === 'complete' ? (
          <>
            <Badge
              variant={
                item.observation.verdict === 'passed'
                  ? 'success'
                  : item.observation.verdict === 'failed'
                    ? 'error'
                    : 'neutral'
              }
              label={`Verdict: ${item.observation.verdict}`}
            />
            {observationStale.isStale && observationStale.reason ? (
              <Banner
                status="warning"
                title="This observation is stale"
                description={observationStale.reason}
              />
            ) : null}
            <MetadataList columns={1} label={{ position: 'top' }}>
              <MetadataListItem label="Method">
                <Text>{item.observation.method}</Text>
              </MetadataListItem>
              <MetadataListItem label="Observed at">
                <Text>{item.observation.observedAt}</Text>
              </MetadataListItem>
              <MetadataListItem label="Subject">
                <Text type="supporting">
                  {subjectText(item) ?? 'No subject recorded'}
                </Text>
              </MetadataListItem>
              <MetadataListItem label="Evidence record">
                <Text type="code">{item.observation.evidenceId}</Text>
              </MetadataListItem>
            </MetadataList>
            {item.observation.verdict === 'not_applicable' ? (
              <Text type="supporting" color="secondary">
                Recorded as not applicable — different from unknown: the
                owner decided this item does not apply, and the decision is
                kept as evidence.
              </Text>
            ) : null}
          </>
        ) : null}
      </Section>

      <Section variant="section">
        <Heading level={3}>Next action</Heading>
        {item.action.kind === 'none' ? (
          <Text type="supporting">{item.action.label}</Text>
        ) : (
          <>
            <Button
              variant="secondary"
              label={item.action.label}
              onClick={() =>
                setActionNote(
                  'The backend is not connected in this prototype. Activating this action changed nothing and ran no check.',
                )
              }
            />
            {actionNote ? (
              <Text role="status" type="supporting">
                {actionNote}
              </Text>
            ) : null}
          </>
        )}
      </Section>
    </aside>
  );
}

export default ItemDetail;
