import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoreButton } from '@lore/ui/button';
import { expectOnlyTokenColours, overlayContainer } from '@lore/ui/testing';
import { HlmDropdownMenuImports } from '../index';

// The row-actions menu the materials/lots tables will hang off a `loreBtn`.
@Component({
  imports: [HlmDropdownMenuImports, LoreButton],
  template: `
    <button [hlmDropdownMenuTrigger]="rowActions" loreBtn variant="plain" size="icon-sm">
      <span class="sr-only">Row actions</span>
    </button>

    <ng-template #rowActions>
      <div hlmDropdownMenu>
        <div hlmDropdownMenuLabel>Lot LOT-0007</div>
        <hlm-dropdown-menu-separator />
        <button hlmDropdownMenuItem>
          Edit
          <span hlmDropdownMenuShortcut>⌘E</span>
        </button>
        <button hlmDropdownMenuItem variant="destructive">Delete</button>
      </div>
    </ng-template>
  `,
})
class Host {}

// One of each item type, so the hover contract is held by every row a menu can hold.
@Component({
  imports: [HlmDropdownMenuImports, LoreButton],
  template: `
    <button [hlmDropdownMenuTrigger]="viewMenu" loreBtn variant="plain" size="icon-sm">
      <span class="sr-only">View</span>
    </button>

    <ng-template #viewMenu>
      <div hlmDropdownMenu>
        <button hlmDropdownMenuItem>Refresh</button>
        <button hlmDropdownMenuCheckbox>Show archived</button>
        <div hlmDropdownMenuGroup>
          <button hlmDropdownMenuRadio [checked]="true">Comfortable</button>
        </div>
      </div>
    </ng-template>
  `,
})
class EveryItemHost {}

describe('HlmDropdownMenu', () => {
  async function open(host: typeof Host | typeof EveryItemHost = Host) {
    await TestBed.configureTestingModule({
      imports: [host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(host);
    await fixture.whenStable();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    trigger.click();
    await fixture.whenStable();

    const menu = overlayContainer().querySelector<HTMLElement>('[role="menu"]')!;
    return { fixture, trigger, menu };
  }

  afterEach(() => {
    document.querySelector('.cdk-overlay-container')?.remove();
  });

  it('opens a real menu with real menu items — the reason it is a helm component at all', async () => {
    const { trigger, menu } = await open();

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(menu).toBeTruthy();
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    expect(items.map((item) => item.textContent?.trim().split(/\s+/)[0])).toEqual([
      'Edit',
      'Delete',
    ]);
  });

  it('renders the menu surface on the lore token layer', async () => {
    const { menu } = await open();

    expect([...menu.classList]).toEqual(
      expect.arrayContaining(['bg-popover', 'text-popover-foreground', 'ring-border']),
    );
    // The open/close animation is behind `motion-safe:`, which is the
    // prefers-reduced-motion contract the shell is held to (plan 030 P4.2).
    expect([...menu.classList].some((name) => name.startsWith('motion-safe:'))).toBe(true);
    expectOnlyTokenColours(menu);
  });

  it('keys the destructive item off --destructive, not a red ramp', async () => {
    const { menu } = await open();
    const destructive = menu.querySelectorAll<HTMLElement>('[role="menuitem"]')[1];

    expect(destructive.getAttribute('data-variant')).toBe('destructive');
    expect([...destructive.classList]).toContain('data-[variant=destructive]:text-destructive');
    expectOnlyTokenColours(destructive);
  });

  // jsdom applies no :hover, so read what each state paints off the classes it would apply.
  const paints = (row: HTMLElement, variant: string) =>
    [...row.classList].filter((c) => c.startsWith(variant)).map((c) => c.slice(variant.length));

  it('moves focus to the row a pointer enters, and a key moves it off a resting pointer', async () => {
    const { fixture, menu } = await open(EveryItemHost);
    const [refresh, archived] = Array.from(menu.querySelectorAll<HTMLElement>('[data-slot]'));

    refresh.dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
    expect(document.activeElement).toBe(refresh);

    // CDK's key manager reads `keyCode`, which a browser sets and a bare jsdom event does not.
    refresh.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }),
    );
    await fixture.whenStable();
    // The pointer is still on Refresh, so its hover must not paint what focus paints.
    expect(document.activeElement).toBe(archived);
    expect(paints(refresh, 'hover:')).toEqual(['bg-muted']);
    expect(paints(archived, 'focus:')).toContain('bg-accent');
  });

  it('paints focus with --accent and hover with a different, neutral fill, on every item type', async () => {
    const { menu } = await open(EveryItemHost);
    const rows = Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
    expect(rows.map((row) => row.getAttribute('role'))).toEqual([
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
    ]);

    for (const row of rows) {
      const focusFill = paints(row, 'focus:');
      const hoverFill = paints(row, 'hover:');
      expect(focusFill).toEqual(expect.arrayContaining(['bg-accent', 'text-accent-foreground']));
      expect(hoverFill).toEqual(['bg-muted']);
      // Not even nested ink: nothing under a hovered row takes the accent pairing.
      expect(
        [...row.classList].filter((c) => /(^|:)hover:/.test(c) && c.includes('accent')),
      ).toEqual([]);
    }
  });
});
