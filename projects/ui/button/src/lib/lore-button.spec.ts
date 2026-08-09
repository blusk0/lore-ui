import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoreButton, type LoreSize, type LoreVariant } from './lore-button';

// Signals, not plain fields: the app is zoneless, so a plain field write would
// never mark the host dirty and `whenStable()` would have nothing to flush.
@Component({
  imports: [LoreButton],
  template: `
    <button
      loreBtn
      [variant]="variant()"
      [color]="'danger'"
      [size]="size()"
      [disabled]="disabled()"
    >
      Delete
    </button>
    <button loreBtn type="submit">Submit</button>
    <a loreBtn href="/library" [disabled]="disabled()">Library</a>
  `,
})
class Host {
  readonly variant = signal<LoreVariant>('solid');
  readonly size = signal<LoreSize>('md');
  readonly disabled = signal(false);
}

describe('LoreButton', () => {
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
      button: el.querySelector('button')!,
      submit: el.querySelectorAll('button')[1]!,
      anchor: el.querySelector('a')!,
    };
  }

  it('reflects the variant matrix onto data attributes', async () => {
    const { fixture, button } = await setup();

    expect(button.getAttribute('data-variant')).toBe('solid');
    expect(button.getAttribute('data-color')).toBe('danger');
    expect(button.getAttribute('data-size')).toBe('md');
    expect(button.classList).toContain('lore-ctl');

    fixture.componentInstance.variant.set('outlined');
    fixture.componentInstance.size.set('icon-sm');
    await fixture.whenStable();

    expect(button.getAttribute('data-variant')).toBe('outlined');
    expect(button.getAttribute('data-size')).toBe('icon-sm');
  });

  it('defaults <button> to type=button so it cannot submit a form by accident', async () => {
    const { button } = await setup();
    expect(button.getAttribute('type')).toBe('button');
  });

  it('preserves a consumer-set type', async () => {
    const { submit } = await setup();
    expect(submit.getAttribute('type')).toBe('submit');
  });

  it('never puts a type attribute on an anchor', async () => {
    const { anchor } = await setup();
    expect(anchor.hasAttribute('type')).toBe(false);
  });

  it('disables a <button> natively and an <a> via aria-disabled + tabindex', async () => {
    const { fixture, button, anchor } = await setup();

    expect(button.hasAttribute('disabled')).toBe(false);
    expect(anchor.hasAttribute('aria-disabled')).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    // <button> gets the real thing — it must actually be inert.
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('data-disabled')).toBe('true');

    // <a> has no native disabled: aria-disabled + tabindex=-1 carry the story
    // (the pointer-events guard lives in components.css).
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
    expect(anchor.getAttribute('tabindex')).toBe('-1');
    expect(anchor.getAttribute('data-disabled')).toBe('true');
    expect(anchor.hasAttribute('disabled')).toBe(false);
  });
});
