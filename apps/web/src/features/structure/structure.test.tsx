import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDemoClient } from '../../demo';
import { StructurePage } from './StructurePage';

const clientByScenario = {
  populated: createDemoClient('populated'),
  empty: createDemoClient('empty'),
  stale: createDemoClient('stale'),
  unavailable: createDemoClient('unavailable'),
  unsupported: createDemoClient('unsupported'),
  'request-error': createDemoClient('request-error'),
} as const;

async function renderStructure(
  scenario: keyof typeof clientByScenario = 'populated',
  initialView: 'outline' | 'inventory' = 'outline',
) {
  const view = render(
    <StructurePage client={clientByScenario[scenario]} initialView={initialView} />,
  );
  // The workspace loads its data through the client.
  await screen.findByRole('heading', { name: 'Structure' });
  return view;
}

describe('StructurePage outline (populated)', () => {
  it('shows both root trees and the complete deep chain', async () => {
    await renderStructure();

    const tree = await screen.findByRole('tree', {
      name: 'Outline',
    });
    expect(within(tree).getByText('Welcome')).toBeVisible();
    expect(within(tree).getByText('Field guides')).toBeVisible();
    expect(within(tree).getByText('Ferns of the valley')).toBeVisible();
    expect(within(tree).getByText('Caring for ferns')).toBeVisible();
    expect(within(tree).getByText('Seasonal fern care')).toBeVisible();

    // Source-only include files never appear as pages.
    expect(
      screen.queryByText('content/includes/watering-note.md'),
    ).not.toBeInTheDocument();
  });

  it('selects a page and keeps identity, source location, parent, and URL separate', async () => {
    const user = userEvent.setup();
    await renderStructure();

    const tree = await screen.findByRole('tree', {
      name: 'Outline',
    });
    await user.click(within(tree).getByText('Ferns of the valley'));

    const inspector = screen.getByRole('complementary', {
      name: 'Page inspector',
    });
    expect(
      within(inspector).getByText('ent-ferns'),
    ).toBeVisible();
    expect(
      within(inspector).getByText('content/guides/ferns.md'),
    ).toBeVisible();
    // The populated fixture describes a simulated release, so the published
    // fern guide carries a URL.
    expect(
      within(inspector).getByText('https://alder-ivy.example/guides/ferns'),
    ).toBeVisible();

    // The source preview loads through the client while the graph is current.
    await waitFor(() =>
      expect(within(inspector).getByText(/# Ferns of the valley/)).toBeVisible(),
    );

    // The draft page has no route mapping: its URL stays unknown.
    await user.click(within(tree).getByText('Caring for ferns'));
    expect(
      within(inspector).getByText(/Unknown — no release provides/),
    ).toBeVisible();
    expect(within(inspector).getByText('Draft')).toBeVisible();
    await waitFor(() =>
      expect(within(inspector).getByText(/# Caring for ferns/)).toBeVisible(),
    );
  });

  it('lists incoming and outgoing dependencies, showing includes as source files', async () => {
    const user = userEvent.setup();
    await renderStructure();

    const tree = await screen.findByRole('tree', {
      name: 'Outline',
    });
    await user.click(within(tree).getByText('Ferns of the valley'));

    const inspector = screen.getByRole('complementary', {
      name: 'Page inspector',
    });
    expect(
      within(inspector).getByText(/Incoming dependencies \(1\)/),
    ).toBeVisible();
    expect(
      within(inspector).getByText(/Outgoing dependencies \(3\)/),
    ).toBeVisible();
    expect(
      within(inspector).getByText('content/includes/watering-note.md'),
    ).toBeVisible();
    expect(
      within(inspector).getByText('Source file — not a page'),
    ).toBeVisible();

    // Selecting a dependency page navigates the inspector to that page.
    await user.click(within(inspector).getByRole('button', { name: 'About the nursery' }));
    expect(
      within(
        screen.getByRole('complementary', { name: 'Page inspector' }),
      ).getByText('ent-about'),
    ).toBeVisible();
  });

  it('searches and applies combined filters, then clears them', async () => {
    const user = userEvent.setup();
    await renderStructure('populated', 'inventory');

    const search = screen.getByRole('textbox', { name: 'Search pages' });
    await user.type(search, 'fern');

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4); // header + 3 fern pages

    // Astryx Selector is a popup listbox, not a native select: open the
    // trigger, then choose the option.
    await user.click(
      screen.getByRole('combobox', { name: 'Status filter' }),
    );
    await user.click(screen.getByRole('option', { name: 'Draft' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2); // header + fern-care

    await user.click(
      screen.getByRole('combobox', { name: 'Tag filter' }),
    );
    await user.click(screen.getByRole('option', { name: 'plants' }));
    expect(
      within(screen.getByRole('table')).getByText('Caring for ferns'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(
      within(screen.getByRole('table')).getByText('Welcome'),
    ).toBeVisible();
  });

  it('reveals a matching descendant under a collapsed branch when searching', async () => {
    const user = userEvent.setup();
    await renderStructure();

    const tree = await screen.findByRole('tree', { name: 'Outline' });
    const guides = await within(tree).findByText('Field guides');
    const guidesItem = guides.closest('[role="treeitem"]');
    if (!guidesItem) {
      throw new Error('Field guides tree item row not found');
    }

    // Collapse Field guides from the keyboard, as a keyboard user would.
    await user.click(guides);
    expect(guidesItem).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => {
      expect(guidesItem).toHaveAttribute('aria-expanded', 'false');
    });
    expect(
      within(tree).queryByText('Ferns of the valley'),
    ).not.toBeInTheDocument();

    // Searching for the descendant under the collapsed branch must reveal
    // it: the search result is never concealed by retained collapse state.
    // Re-query the tree — reconciling the visible set remounts TreeList,
    // replacing its DOM element.
    await user.type(
      screen.getByRole('textbox', { name: 'Search pages' }),
      'Ferns of the valley',
    );
    const searchedTree = screen.getByRole('tree', { name: 'Outline' });
    const searchedGuides = within(searchedTree)
      .getByText('Field guides')
      .closest('[role="treeitem"]');
    if (!searchedGuides) throw new Error('tree item row not found');
    expect(searchedGuides).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(searchedTree).getByText('Ferns of the valley'),
    ).toBeVisible();

    // Narrowing the filters keeps the revealed match visible.
    await user.click(screen.getByRole('combobox', { name: 'Status filter' }));
    await user.click(screen.getByRole('option', { name: 'Published' }));
    expect(
      within(screen.getByRole('tree', { name: 'Outline' })).getByText(
        'Ferns of the valley',
      ),
    ).toBeVisible();

    // Clearing filters widens back to the full outline, all reachable.
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    const clearedTree = screen.getByRole('tree', { name: 'Outline' });
    expect(within(clearedTree).getByText('Seasonal fern care')).toBeVisible();

    // Searching again after clearing works.
    await user.type(
      screen.getByRole('textbox', { name: 'Search pages' }),
      'Mosses',
    );
    const secondTree = screen.getByRole('tree', { name: 'Outline' });
    expect(
      within(secondTree).getByText('Mosses of the shaded paths'),
    ).toBeVisible();
    expect(within(secondTree).getByText('Field guides')).toBeVisible();
  });

  it('keeps ordinary collapse state when no filter changes the visible outline', async () => {
    const user = userEvent.setup();
    await renderStructure();

    const tree = await screen.findByRole('tree', { name: 'Outline' });
    const guides = within(tree).getByText('Field guides');
    const guidesItem = guides.closest('[role="treeitem"]');
    if (!guidesItem) throw new Error('tree item row not found');

    await user.click(guides);
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => {
      expect(guidesItem).toHaveAttribute('aria-expanded', 'false');
    });

    // Selecting another page changes only the selection; the user's
    // collapse decision persists.
    await user.click(within(tree).getByText('Welcome'));
    expect(within(tree).queryByText('Ferns of the valley')).not.toBeInTheDocument();

    // The user can expand the branch again.
    await user.click(guides);
    await user.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(guidesItem).toHaveAttribute('aria-expanded', 'true');
    });
    expect(within(tree).getByText('Ferns of the valley')).toBeVisible();
  });

  it('switches between outline and inventory views', async () => {
    const user = userEvent.setup();
    await renderStructure('populated', 'outline');

    expect(screen.getByRole('tree', { name: 'Outline' })).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Inventory' }));
    expect(screen.getByRole('table')).toBeVisible();
    expect(
      screen.queryByRole('tree', { name: 'Outline' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Outline' }));
    expect(screen.getByRole('tree', { name: 'Outline' })).toBeVisible();
  });
});

describe('StructurePage distinct states', () => {
  it('names both revisions when the graph is stale', async () => {
    await renderStructure('stale');

    const banner = await screen.findByText(/This graph is older than the source/);
    expect(banner).toBeVisible();
    const staleClient = clientByScenario.stale;
    const index = await staleClient.getPages();
    expect(
      screen.getByText(new RegExp(index.graphRevision?.slice(0, 8) ?? '')),
    ).toBeVisible();
    expect(
      screen.getByText(new RegExp(index.sourceRevision.slice(0, 8))),
    ).toBeVisible();
    // Stale data still renders the views from the earlier graph.
    expect(screen.getByRole('tree', { name: 'Outline' })).toBeVisible();
  });

  it('renders unavailable as no-graph plus problems, never as an empty site', async () => {
    await renderStructure('unavailable');

    expect(
      await screen.findByText(/No valid graph is available/),
    ).toBeVisible();
    expect(
      screen.getByText(/shows no pages rather than presenting an old graph as current/),
    ).toBeVisible();
    expect(screen.getByText(/The last compiler run failed/)).toBeVisible();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('renders unsupported as distinct from empty and from unavailable', async () => {
    await renderStructure('unsupported');

    expect(
      await screen.findByText(/The producer format is not supported/),
    ).toBeVisible();
    expect(
      screen.getByText(/different from a site that simply has no pages/),
    ).toBeVisible();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('renders an empty site as a valid current graph with no pages', async () => {
    const { container } = await renderStructure('empty');

    // Scoped to the rendered workspace: EmptyState mirrors its text into
    // the shared polite live region (outside this container), so an
    // unscoped query would intermittently match both copies.
    const workspace = within(container);
    expect(
      await workspace.findByText(/No pages in this publication/),
    ).toBeVisible();
    expect(
      workspace.getByText(/different from an unavailable or unsupported producer/),
    ).toBeVisible();
  });

  it('keeps empty-state assertions scoped while the announcement region holds the text', async () => {
    const { container } = await renderStructure('empty');

    // EmptyState announces its rendered text through the shared polite
    // live region one frame after mount, and the announcement stays for
    // about two seconds. Wait for that exact window — the timing that let
    // an unscoped text query intermittently match both the visible
    // description and the hidden announcement.
    await waitFor(() => {
      const region = document.body.querySelector(
        '[data-astryx-live-region="polite"]',
      );
      expect(region?.textContent).toContain(
        'different from an unavailable or unsupported producer',
      );
    });

    // The workspace itself holds exactly one copy; the announcement lives
    // outside the rendered workspace and is never asserted on.
    const workspace = within(container);
    const copies = workspace.getAllByText(
      /different from an unavailable or unsupported producer/,
    );
    expect(copies).toHaveLength(1);
    expect(copies[0]).toBeVisible();
    expect(workspace.getByText(/No pages in this publication/)).toBeVisible();
  });

  it('renders a failed request as an explicit error with retry and no fallback', async () => {
    const user = userEvent.setup();
    await renderStructure('request-error');

    expect(
      await screen.findByText(/The page graph could not be loaded/),
    ).toBeVisible();
    expect(
      screen.getByText(/The data source returned unavailable/),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sample data/)).not.toBeInTheDocument();

    // Retry runs a real request again; the scenario keeps failing, so the
    // error stays visible rather than becoming empty success.
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(screen.getAllByText(/The page graph could not be loaded/)).toHaveLength(1);
    });
  });
});
