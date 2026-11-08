import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { createDemoClient } from './demo';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Obsequious: missing #root element in index.html');
}

// Temporary P01 wiring: the demo entry creates the client explicitly.
// P02 replaces this with the query-parameter composition contract
// (workspace and scenario selection).
const client = createDemoClient('populated');

createRoot(container).render(
  <StrictMode>
    <App client={client} />
  </StrictMode>,
);
