/**
 * Performs a full-document navigation. A tiny seam: the demo banner uses a
 * full navigation (not pushState) so the demo entry recreates the client
 * for the new scenario; tests mock this module instead of jsdom's
 * non-configurable location.
 */
export function navigateTo(href: string): void {
  window.location.assign(href);
}
