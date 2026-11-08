import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { DEMO_SCENARIOS, type DemoScenario } from '../demo/types';
import { navigateTo } from '../shell/fullNavigation';

export type DemoScenarioBannerProps = {
  scenario: DemoScenario;
};

function scenarioLabel(scenario: DemoScenario): string {
  switch (scenario) {
    case 'populated':
      return 'Populated site';
    case 'empty':
      return 'Empty site';
    case 'stale':
      return 'Stale graph';
    case 'unavailable':
      return 'Graph unavailable';
    case 'unsupported':
      return 'Unsupported producer';
    case 'request-error':
      return 'Request error';
  }
}

/**
 * Persistent demo-data notice rendered in the shell banner slot by the
 * demo entry. It labels every screen as sample data, names the active
 * scenario, and switches scenarios with a full navigation so the demo
 * entry can recreate the client. The label never dismisses.
 */
export function DemoScenarioBanner({ scenario }: DemoScenarioBannerProps) {
  return (
    <div className="demo-banner" data-testid="demo-banner">
      <Badge variant="warning" label="Demo data" />
      <Text type="supporting" color="secondary" className="demo-banner-note">
        Sample data for the prototype — nothing here is live, saved, or
        verified.
      </Text>
      <label className="demo-banner-scenario">
        <Text type="label" as="span">
          Demo scenario
        </Text>
        <select
          value={scenario}
          onChange={(event) => {
            const params = new URLSearchParams(window.location.search);
            params.set('scenario', event.target.value);
            navigateTo(`?${params.toString()}`);
          }}
        >
          {DEMO_SCENARIOS.map((name) => (
            <option key={name} value={name}>
              {scenarioLabel(name)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default DemoScenarioBanner;
