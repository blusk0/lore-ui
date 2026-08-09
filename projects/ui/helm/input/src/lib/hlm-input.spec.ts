import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { HlmInput } from './hlm-input';

@Component({
  imports: [HlmInput, HlmFieldImports],
  template: `
    <hlm-field [messages]="messages()">
      <label hlmLabel>Notes</label>
      <input hlmInput data-testid="text" placeholder="SKU" />
      <textarea hlmInput data-testid="multiline"></textarea>
    </hlm-field>

    <input hlmInput data-testid="bare" aria-label="Loose" [aria-describedby]="'external-hint'" />
    <p id="external-hint">Set by the caller.</p>
  `,
})
class Host {
  readonly messages = signal<readonly string[]>([]);
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    at: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
  };
}

describe('HlmInput', () => {
  it('sits on the shared .lore-ctl control contract, corrected for text entry', async () => {
    const { at } = await setup();
    const classes = [...at('text').classList];

    // The metrics, radius, focus ring and disabled story come from
    // theme/components.css, so every control in the lore family retunes at once.
    expect(classes).toContain('lore-ctl');
    // …and the corrections a writing surface needs against a base written for
    // buttons: full width, left-aligned, a text caret rather than a pointer.
    expect(classes).toEqual(
      expect.arrayContaining(['block', 'w-full', 'text-start', 'cursor-text', 'select-text']),
    );
  });

  it('paints from the semantic surface tokens, not the variant matrix', async () => {
    const { el, at } = await setup();
    const classes = [...at('text').classList];

    // solid/soft/outlined/plain is an *emphasis* axis for an actionable control;
    // a text field has none, so it takes the input hairline and the page surface
    // rather than a --vc channel.
    expect(classes).toEqual(
      expect.arrayContaining(['border-input', 'bg-background', 'text-foreground']),
    );
    expect(at('text').hasAttribute('data-variant')).toBe(false);
    expect(at('text').hasAttribute('data-color')).toBe(false);

    expectOnlyTokenColours(el);
  });

  it('accepts a textarea as the same control, unpinned from the one-line height', async () => {
    const { at } = await setup();

    expect(at('multiline').tagName).toBe('TEXTAREA');
    expect([...at('multiline').classList]).toEqual(
      expect.arrayContaining(['lore-ctl', 'h-auto', 'min-h-16', 'resize-y']),
    );
    // The single-line control must NOT pick the textarea metrics up.
    expect([...at('text').classList]).not.toContain('h-auto');
  });

  it('marks itself invalid only through the field, and only when the field is', async () => {
    const { fixture, at } = await setup();

    expect(at('text').getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.messages.set(['Notes are too long.']);
    await fixture.whenStable();

    // A 422 leaves the Angular control valid, so brain's own aria-invalid stays
    // silent; HlmField's union is what reaches the control.
    expect(at('text').getAttribute('aria-invalid')).toBe('true');

    // A control with no field around it has nothing to read and stays quiet.
    expect(at('bare').getAttribute('aria-invalid')).toBeNull();
  });

  it("merges the caller's aria-describedby rather than replacing it", async () => {
    const { at } = await setup();

    // BrnFieldControlDescribedBy is forwarded with its `aria-describedby` input,
    // so an id the caller supplies survives alongside the field's own.
    expect(at('bare').getAttribute('aria-describedby')).toBe('external-hint');
  });

  it('generates an id so a form never has to invent one', async () => {
    const { at } = await setup();

    expect(at('text').id).toBeTruthy();
    expect(at('multiline').id).toBeTruthy();
    expect(at('text').id).not.toBe(at('multiline').id);
  });
});
