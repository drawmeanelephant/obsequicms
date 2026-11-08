import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppNavigation } from './AppNavigation';
import type { Workspace } from './workspaces';

function hrefFor(workspace: Workspace): string {
  return `/?workspace=${workspace}&scenario=stale`;
}

function renderNav() {
  const onNavigate = vi.fn();
  render(
    <AppNavigation
      activeWorkspace="structure"
      hrefFor={hrefFor}
      onNavigate={onNavigate}
    />,
  );
  const readiness = screen.getByRole('link', { name: 'Readiness' });
  return { onNavigate, readiness };
}

/** Dispatches a synthetic click with full control over its modifiers. */
function clickWith(
  element: HTMLElement,
  init: MouseEventInit,
): MouseEvent {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
}

describe('AppNavigation activation semantics', () => {
  it('intercepts an ordinary click and navigates in place', () => {
    const { onNavigate, readiness } = renderNav();

    const event = clickWith(readiness, { button: 0 });

    expect(event.defaultPrevented).toBe(true);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('readiness');
  });

  it('intercepts keyboard activation (Enter) like an ordinary click', async () => {
    const { onNavigate, readiness } = renderNav();
    const user = userEvent.setup();

    readiness.focus();
    await user.keyboard('{Enter}');

    expect(onNavigate).toHaveBeenCalledWith('readiness');
  });

  it('leaves modified primary activations to the browser', () => {
    const { onNavigate, readiness } = renderNav();

    // Cmd/Ctrl-click (new tab), Shift-click (new window), Alt-click
    // (download): none may be hijacked into in-place navigation.
    for (const modifiers of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
    ]) {
      const event = clickWith(readiness, { button: 0, ...modifiers });
      expect(event.defaultPrevented).toBe(false);
      expect(onNavigate).not.toHaveBeenCalled();
    }
  });

  it('leaves non-primary buttons (middle click) to the browser', () => {
    const { onNavigate, readiness } = renderNav();

    const middle = clickWith(readiness, { button: 1 });
    const auxiliary = clickWith(readiness, { button: 2 });

    expect(middle.defaultPrevented).toBe(false);
    expect(auxiliary.defaultPrevented).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
