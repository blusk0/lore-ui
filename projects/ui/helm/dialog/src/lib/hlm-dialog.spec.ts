import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoreButton } from '@lore/ui/button';
import {
  expectOnlyTokenColours,
  expectOnlyTokenColoursIn,
  overlayContainer,
} from '@lore/ui/testing';
import { HlmDialogImports, HlmDialogService } from '../index';
import { hlmDialogOverlayClass } from './hlm-dialog-overlay';

// Composed exactly as app code will: a lore-owned trigger button, the portal,
// and the title/description that give brain its aria-labelledby/describedby.
@Component({
  imports: [HlmDialogImports, LoreButton],
  template: `
    <hlm-dialog>
      <button hlmDialogTrigger loreBtn color="primary">Adjust lot</button>
      <hlm-dialog-content *hlmDialogPortal>
        <hlm-dialog-header>
          <h3 hlmDialogTitle>Adjust lot quantity</h3>
          <p hlmDialogDescription>Recorded against the current batch.</p>
        </hlm-dialog-header>
        <hlm-dialog-footer>
          <button loreBtn variant="outlined" hlmDialogClose>Cancel</button>
        </hlm-dialog-footer>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
class Host {}

describe('HlmDialog', () => {
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

    // Overlay content is portalled to document.body, not into the fixture.
    const dialog = overlayContainer().querySelector<HTMLElement>('[role="dialog"]')!;
    return { fixture, trigger, dialog };
  }

  afterEach(() => {
    document.querySelector('.cdk-overlay-container')?.remove();
  });

  it('opens from the trigger with the dialog role and brain-wired accessible name', async () => {
    const { dialog } = await open();

    expect(dialog).toBeTruthy();
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!);
    expect(title?.textContent?.trim()).toBe('Adjust lot quantity');
    const description = document.getElementById(dialog.getAttribute('aria-describedby')!);
    expect(description?.textContent?.trim()).toBe('Recorded against the current batch.');
  });

  it('renders the content surface on the lore token layer', async () => {
    const { dialog } = await open();
    const content = dialog.querySelector<HTMLElement>('hlm-dialog-content')!;

    expect(content.getAttribute('data-state')).toBe('open');
    // The surface, its ink and its hairline all come from tokens.css.
    expect([...content.classList]).toEqual(
      expect.arrayContaining(['bg-popover', 'text-popover-foreground', 'ring-border']),
    );
    expectOnlyTokenColours(content);
  });

  it('dims the backdrop through the token layer, in both themes', () => {
    // Light dims toward --foreground, dark toward --background; the `dark:`
    // variant is the preset's own, keyed off the same `dark` class on <html>
    // that ThemeStore toggles — there is no parallel dark-mode mechanism.
    expect(hlmDialogOverlayClass).toContain('bg-foreground/10');
    expect(hlmDialogOverlayClass).toContain('dark:bg-background/60');
    expectOnlyTokenColoursIn(hlmDialogOverlayClass);
  });

  it('closes on the lore-owned close button rather than a second button system', async () => {
    const { fixture, dialog } = await open();

    // D7: buttons stay lore-owned. The generated helm button was removed, so
    // the built-in close affordance is a .lore-ctl like every other control.
    const close = dialog.querySelector<HTMLButtonElement>('button.lore-ctl[data-size="icon-sm"]')!;
    expect(close.textContent?.trim()).toBe('Close');
    expect(close.getAttribute('data-variant')).toBe('plain');
    expect(close.getAttribute('type')).toBe('button');

    close.click();
    await fixture.whenStable();

    expect(overlayContainer().querySelector('[role="dialog"]')).toBeNull();
  });
});

const VIEWPORT_W = 'w-[calc(100vw-2rem)]';
const VIEWPORT_MAX_W = 'max-w-[calc(100vw-2rem)]';

@Component({
  imports: [HlmDialogImports, LoreButton],
  template: `
    <hlm-dialog>
      <button hlmDialogTrigger loreBtn data-testid="wider">Wider</button>
      <hlm-dialog-content *hlmDialogPortal class="sm:max-w-md">
        <h3 hlmDialogTitle>Approve?</h3>
      </hlm-dialog-content>
    </hlm-dialog>
    <hlm-dialog>
      <button hlmDialogTrigger loreBtn data-testid="fixed">Fixed</button>
      <hlm-dialog-content *hlmDialogPortal class="w-[600px] sm:max-w-none">
        <h3 hlmDialogTitle>Wide</h3>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
class SizedHost {
  readonly service = inject(HlmDialogService);
}

@Component({
  imports: [HlmDialogImports],
  template: `<h3 hlmDialogTitle>From the service</h3>`,
})
class ServiceBody {}

// jsdom has no layout: these pin the class contract that gives the width; only a browser measures it.
describe('HlmDialogContent width', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [SizedHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(SizedHost);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const openBy = async (id: string) => {
      root.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.click();
      await fixture.whenStable();
      return [...overlayContainer().querySelector('hlm-dialog-content')!.classList];
    };
    return { fixture, openBy };
  }

  afterEach(() => {
    document.querySelector('.cdk-overlay-container')?.remove();
  });

  it('fills its max width from the viewport, not from a pane that shrinks to fit', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();
    const classes = [...overlayContainer().querySelector('hlm-dialog-content')!.classList];

    expect(classes).toEqual(expect.arrayContaining([VIEWPORT_W, VIEWPORT_MAX_W, 'sm:max-w-sm']));
    // A percentage resolves against the CDK pane, which is as wide as the content.
    expect(classes).not.toContain('w-full');
    expect(classes.some((c) => c.includes('100%'))).toBe(false);
  });

  it("lets the caller's sm:max-w-* replace the default cap and keep the viewport width", async () => {
    const { openBy } = await setup();
    const classes = await openBy('wider');

    expect(classes).toEqual(expect.arrayContaining(['sm:max-w-md', VIEWPORT_W, VIEWPORT_MAX_W]));
    expect(classes).not.toContain('sm:max-w-sm');
  });

  it("lets the caller's own width replace the viewport width", async () => {
    const { openBy } = await setup();
    const classes = await openBy('fixed');

    expect(classes).toEqual(expect.arrayContaining(['w-[600px]', 'sm:max-w-none']));
    expect(classes).not.toContain(VIEWPORT_W);
    expect(classes).not.toContain('sm:max-w-sm');
  });

  it("merges HlmDialogService's contentClass the same way", async () => {
    const { fixture } = await setup();
    fixture.componentInstance.service.open(ServiceBody, { contentClass: 'sm:max-w-lg' });
    await fixture.whenStable();
    const classes = [...overlayContainer().querySelector('hlm-dialog-content')!.classList];

    expect(classes).toEqual(expect.arrayContaining(['sm:max-w-lg', VIEWPORT_W]));
    expect(classes).not.toContain('sm:max-w-sm');
  });
});
