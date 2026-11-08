import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceHref,
  parseScenarioParam,
  parseWorkspace,
} from './workspaces';

describe('workspace query-parameter interface', () => {
  it('defaults to the Structure workspace', () => {
    expect(parseWorkspace('')).toBe('structure');
    expect(parseWorkspace('?scenario=stale')).toBe('structure');
  });

  it('parses every documented workspace value and rejects unknown ones', () => {
    expect(parseWorkspace('?workspace=pages')).toBe('pages');
    expect(parseWorkspace('?workspace=readiness')).toBe('readiness');
    expect(parseWorkspace('?workspace=settings')).toBe('settings');
    expect(parseWorkspace('?workspace=nonsense')).toBe('structure');
    expect(parseWorkspace('?workspace[]=structure')).toBe('structure');
  });

  it('builds hrefs that preserve the scenario parameter', () => {
    expect(buildWorkspaceHref('readiness', 'stale')).toBe(
      '?workspace=readiness&scenario=stale',
    );
    expect(buildWorkspaceHref('pages', 'request-error')).toBe(
      '?workspace=pages&scenario=request-error',
    );
  });

  it('drops an absent scenario instead of inventing one', () => {
    expect(buildWorkspaceHref('publish', null)).toBe('?workspace=publish');
  });

  it('treats a missing scenario parameter as empty for callers that validate', () => {
    expect(parseScenarioParam('?workspace=readiness')).toBe('populated');
    expect(parseScenarioParam('?scenario=empty')).toBe('empty');
  });
});
