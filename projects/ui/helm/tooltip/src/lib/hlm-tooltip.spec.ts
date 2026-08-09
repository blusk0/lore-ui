import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoreButton } from '@lore/ui/button';
import {
  expectOnlyTokenColours,
  expectOnlyTokenColoursIn,
  overlayContainer,
} from '@lore/ui/testing';
import {
  DEFAULT_TOOLTIP_CONTENT_CLASSES,
  DEFAULT_TOOLTIP_SVG_CLASS,
  HlmTooltip,
} from './hlm-tooltip';

@Component({
  imports: [HlmTooltip, LoreButton],
  template: `
    <button loreBtn variant="plain" size="icon-sm" hlmTooltip="Trace this lot" [showDelay]="0">
      <span class="sr-only">Trace</span>
    </button>
  `,
})
class Host {}

describe('HlmTooltip', () => {
  async function show() {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    // Keyboard focus is one of brain's two open triggers (the other is a
    // hover-capable pointer); it is the one that matters for accessibility.
    trigger.dispatchEvent(new FocusEvent('focus'));
    // The show delay runs through an rxjs timer, so let the macrotask land.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    return {
      fixture,
      trigger,
      tooltip: overlayContainer().querySelector<HTMLElement>('[role="tooltip"]')!,
    };
  }

  afterEach(() => {
    document.querySelector('.cdk-overlay-container')?.remove();
  });

  it('shows on keyboard focus and describes its trigger', async () => {
    const { trigger, tooltip } = await show();

    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent?.trim()).toContain('Trace this lot');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('renders inverted, on tokens — the one D7 overlay deliberately not on --popover', async () => {
    const { tooltip } = await show();
    const classes = [...tooltip.classList];

    // A transient label inverts so it reads as distinct from the actionable
    // overlays (dialog, menu, sheet), which all sit on --popover.
    expect(classes).toEqual(expect.arrayContaining(['bg-foreground', 'text-background']));
    expectOnlyTokenColours(tooltip);
  });

  it('keeps the arrow on the same token as the bubble', () => {
    expect(DEFAULT_TOOLTIP_SVG_CLASS).toContain('bg-foreground');
    expect(DEFAULT_TOOLTIP_SVG_CLASS).toContain('fill-foreground');
    expectOnlyTokenColoursIn(DEFAULT_TOOLTIP_SVG_CLASS);
    expectOnlyTokenColoursIn(DEFAULT_TOOLTIP_CONTENT_CLASSES);
  });
});
