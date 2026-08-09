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

describe('HlmDropdownMenu', () => {
  async function open() {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
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
});
