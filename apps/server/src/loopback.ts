import { createServer, type RequestListener } from 'node:http';

export function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === '::1' || host === '[::1]' || host === 'localhost';
}

/** Reject non-loopback binds before an unauthenticated listener is created. */
export function loopbackServer(handler: RequestListener) {
  const server = createServer(handler);
  const listen = server.listen;
  server.listen = ((...args: unknown[]) => {
    const first = args[0];
    const host = typeof first === 'object' && first !== null && 'host' in first
      ? first.host
      : typeof first === 'number' ? args[1] : undefined;
    if (host !== '127.0.0.1' && host !== '::1') {
      throw new Error('Obsequious refuses non-loopback listeners.');
    }
    return Reflect.apply(listen, server, args);
  }) as typeof server.listen;
  return server;
}
