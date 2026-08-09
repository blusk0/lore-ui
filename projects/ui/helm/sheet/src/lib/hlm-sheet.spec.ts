import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoreButton } from '@lore/ui/button';
import { expectOnlyTokenColours, overlayContainer } from '@lore/ui/testing';
import { HlmSheetImports } from '../index';

// Composed the way plan 030 P4.2 will compose it: a left-anchored sheet
// carrying the navigation rail below the medium breakpoint. The width class is
// the documented override — it must beat the primitive's own `w-3/4` default.
@Component({
  imports: [HlmSheetImports, LoreButton],
  template: `
    <hlm-sheet side="left">
      <button hlmSheetTrigger loreBtn variant="plain" size="icon-sm">
        <span class="sr-only">Open navigation</span>
      </button>
      <hlm-sheet-content *hlmSheetPortal class="data-[side=left]:w-(--rail-w-expanded)">
        <hlm-sheet-header>
          <h2 hlmSheetTitle>Navigation</h2>
          <p hlmSheetDescription>Jump to a section of the workspace.</p>
        </hlm-sheet-header>
        <nav aria-label="Main">
          <a href="/materials">Materials</a>
        </nav>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
class Host {}

describe('HlmSheet', () => {
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

    const container = overlayContainer();
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    const content = container.querySelector<HTMLElement>('hlm-sheet-content')!;
    return { fixture, trigger, dialog, content };
  }

  afterEach(() => {
    document.querySelector('.cdk-overlay-container')?.remove();
  });

  it('anchors to the side it is given — the input P4.2 drives the mobile rail with', async () => {
    const { content } = await open();

    expect(content.getAttribute('data-side')).toBe('left');
    expect(content.getAttribute('data-state')).toBe('open');
  });

  it('carries a navigation landmark and an accessible name for the overlay', async () => {
    const { dialog, content } = await open();

    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!);
    expect(title?.textContent?.trim()).toBe('Navigation');
    expect(content.querySelector('nav[aria-label="Main"]')).toBeTruthy();
  });

  it("lets a call site pin the width to the rail token, dropping the primitive's default", async () => {
    const { content } = await open();
    const classes = [...content.classList];

    // tailwind-merge only resolves a conflict when the modifier matches, which
    // is why the documented override is written with the `data-[side=left]:`
    // prefix. If this ever fails, the comment in hlm-sheet-content.ts is wrong.
    expect(classes).toContain('data-[side=left]:w-(--rail-w-expanded)');
    expect(classes).not.toContain('data-[side=left]:w-3/4');
  });

  it('renders the surface on the lore token layer', async () => {
    const { content } = await open();

    expect([...content.classList]).toEqual(
      expect.arrayContaining(['bg-popover', 'text-popover-foreground']),
    );
    expectOnlyTokenColours(content);
  });

  it('closes on the lore-owned close button', async () => {
    const { fixture, content } = await open();

    const close = content.querySelector<HTMLButtonElement>('button.lore-ctl[data-size="icon-sm"]')!;
    expect(close.textContent?.trim()).toBe('Close');

    close.click();
    await fixture.whenStable();

    expect(overlayContainer().querySelector('[role="dialog"]')).toBeNull();
  });
});
