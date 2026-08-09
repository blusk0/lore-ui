import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoreButton } from '@lore/ui/button';
import {
  expectOnlyTokenColours,
  expectOnlyTokenColoursIn,
  overlayContainer,
} from '@lore/ui/testing';
import { HlmDialogImports } from '../index';
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
