import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmDialogImports } from '@lore/ui/helm/dialog';
import { LoreButton } from '@lore/ui/button';

@Component({
  imports: [HlmDialogImports, LoreButton],
  template: `
    <hlm-dialog>
      <button loreBtn hlmDialogTrigger>Open</button>
      <hlm-dialog-content *hlmDialogPortal>
        <div hlmDialogHeader>
          <h3 hlmDialogTitle>Delete 3 assets?</h3>
          <p hlmDialogDescription>This cannot be undone.</p>
        </div>
        <button loreBtn hlmDialogClose>Cancel</button>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
class Host {}

describe('helm dialog (composition)', () => {
  let overlayContainer: OverlayContainer;

  async function setup() {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    overlayContainer = TestBed.inject(OverlayContainer);
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, trigger };
  }

  afterEach(() => {
    // Overlay content renders onto document.body — clean it between tests.
    overlayContainer?.ngOnDestroy();
  });

  async function open(fixture: { whenStable: () => Promise<unknown> }, trigger: HTMLElement) {
    trigger.click();
    await fixture.whenStable();
    return overlayContainer.getContainerElement();
  }

  it('renders the dialog into the overlay container with a title and description', async () => {
    const { fixture, trigger } = await setup();
    const container = await open(fixture, trigger);

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // An untitled dialog is an a11y regression — assert the wiring exists,
    // rather than trusting the template's presence alone.
    const labelledBy = dialog!.getAttribute('aria-labelledby');
    const describedBy = dialog!.getAttribute('aria-describedby');
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();

    // Attribute selector rather than `#id` — brain's generated ids are not
    // guaranteed to be valid CSS identifiers, and jsdom has no CSS.escape.
    expect(container.querySelector(`[id="${labelledBy}"]`)!.textContent).toContain(
      'Delete 3 assets?',
    );
    expect(container.querySelector(`[id="${describedBy}"]`)!.textContent).toContain(
      'This cannot be undone.',
    );
  });

  it('closes on Escape', async () => {
    const { fixture, trigger } = await setup();
    const container = await open(fixture, trigger);
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // Dispatch from inside the overlay: CDK's keyboard dispatcher routes by the
    // event's target chain, so a bare document-level event never reaches it.
    dialog!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(overlayContainer.getContainerElement().querySelector('[role="dialog"]')).toBeFalsy();
  });

  it('ships a close button that uses the lore matrix, not shadcn variant names', async () => {
    const { fixture, trigger } = await setup();
    const container = await open(fixture, trigger);

    // Both the consumer's Cancel button and the built-in X carry
    // data-slot="dialog-close"; the built-in is the one with the sr-only name.
    const close = [...container.querySelectorAll('[data-slot="dialog-close"]')].find((el) =>
      el.querySelector('.sr-only'),
    )!;

    // Bridge rule (120 D3.3): the built-in close button is a lore control.
    expect(close).toBeTruthy();
    expect(close.classList).toContain('lore-ctl');
    expect(close.getAttribute('data-variant')).toBe('plain');
    expect(close.getAttribute('data-size')).toBe('icon-sm');

    // Icon-only affordance still needs an accessible name.
    expect(close.textContent?.trim()).toContain('Close');
  });
});
