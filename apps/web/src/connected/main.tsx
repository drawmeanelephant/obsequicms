import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '../astryx-themes';
import { ConnectedApp } from './ConnectedApp';
import '../index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Obsequious: missing root element.');
createRoot(container).render(
  <StrictMode>
    <Theme theme={themes[defaultThemeSlug]}>
      <ConnectedApp />
    </Theme>
  </StrictMode>,
);
