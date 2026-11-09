import { mergeConfig, type Connect, type Plugin } from 'vite';
import base from './vite.config';

const redirect: Connect.NextHandleFunction = (request, response, next) => {
  if (request.url === '/' || request.url?.startsWith('/?')) {
    response.writeHead(302, { Location: `/connected.html${request.url.slice(1)}` });
    response.end();
  } else {
    next();
  }
};
const connectedEntry: Plugin = {
  name: 'obsequious-connected-entry',
  configureServer(server) { server.middlewares.use(redirect); },
  configurePreviewServer(server) { server.middlewares.use(redirect); },
};

export default mergeConfig(base, { plugins: [connectedEntry] });
