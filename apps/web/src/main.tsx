import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from './astryx-themes';
import App from './App';
import { DemoScenarioBanner } from './demo-entry/DemoScenarioBanner';
import { parseScenario } from './demo-entry/scenario';
import { createDemoClient } from './demo';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Obsequious: missing #root element in index.html');
}

// Demo entry: the client is created explicitly from the scenario query
// parameter (docs/api.md#prototype-composition). A connected entry would
// construct its HTTP client here and never import demo scenarios.
const scenario = parseScenario(window.location.search);
const client = createDemoClient(scenario);

createRoot(container).render(
  <StrictMode>
    <Theme theme={themes[defaultThemeSlug]}>
      <App client={client} banner={<DemoScenarioBanner scenario={scenario} />} />
    </Theme>
  </StrictMode>,
);
