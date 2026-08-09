import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toastState } from '@spartan-ng/brain/sonner';
import { HlmToasterImports } from '@lore/ui/helm/sonner';
import { LoreButton } from '@lore/ui/button';
import { LoreToast } from './lore-toast';

/** The shell's shape: one toaster, and a control that keeps focus while it speaks. */
@Component({
  imports: [HlmToasterImports, LoreButton],
  template: `
    <button loreBtn data-testid="save">Save</button>
    <hlm-toaster />
  `,
})
class Host {}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  const service = TestBed.inject(LoreToast);

  return {
    fixture,
    el,
    service,
    save: el.querySelector<HTMLButtonElement>('[data-testid="save"]')!,
    async speak(say: () => void) {
      say();
      await fixture.whenStable();
    },
    /** The one toast showing, as the accessibility tree sees it. */
    announced: () => el.querySelector<HTMLElement>('[data-sonner-toast]')!,
  };
}

describe('LoreToast', () => {
  afterEach(() => {
    toastState.reset();
  });

  it('announces a success politely', async () => {
    const { service, announced, speak } = await setup();

    await speak(() => service.success('Material saved.'));

    // Polite, deliberately. The maker asked for this and is looking at the
    // surface that changed; cutting off whatever their screen reader is reading
    // to confirm the expected is noise, and polite is still announced.
    expect(announced().getAttribute('aria-live')).toBe('polite');
    expect(announced().textContent).toContain('Material saved.');
  });

  it('announces a command failure assertively', async () => {
    const { service, announced, speak } = await setup();

    await speak(() => service.failure("Couldn't archive this material."));

    // Assertive, deliberately. The thing the maker asked for did not happen, and
    // the next thing they do is chosen on the belief that it did. This is the
    // assertion that fails if `important` is ever dropped from `failure()` — the
    // failure would then queue behind whatever is being read and might never
    // reach a maker who has already moved on.
    expect(announced().getAttribute('aria-live')).toBe('assertive');
    expect(announced().textContent).toContain("Couldn't archive this material.");
  });

  it('does not let a success and a failure speak at the same volume', async () => {
    const { service, el, speak } = await setup();

    await speak(() => service.success('Material saved.'));
    await speak(() => service.failure("Couldn't archive this material."));

    const volumes = [...el.querySelectorAll('[data-sonner-toast]')].map((node) => ({
      text: node.textContent ?? '',
      live: node.getAttribute('aria-live'),
    }));

    expect(volumes.find((v) => v.text.includes('saved'))?.live).toBe('polite');
    expect(volumes.find((v) => v.text.includes('archive'))?.live).toBe('assertive');
  });

  it('renders the optional description under the message', async () => {
    const { service, announced, speak } = await setup();

    await speak(() =>
      service.failure("Couldn't archive this material.", { description: 'Try again.' }),
    );

    const toastEl = announced();
    expect(toastEl.querySelector('[data-title]')!.textContent).toContain(
      "Couldn't archive this material.",
    );
    expect(toastEl.querySelector('[data-description]')!.textContent).toContain('Try again.');
  });

  it('never moves focus away from the control the maker is using', async () => {
    const { service, save, speak } = await setup();

    save.focus();
    await speak(() => service.failure("Couldn't archive this material."));

    // Even the assertive one. Assertive is about announcement order, not about
    // seizing the keyboard: `alt+T` is how a maker asks to go *to* the region.
    expect(document.activeElement).toBe(save);
  });

  it('exposes two methods and no way to hand it an ApiError', () => {
    // Asserted as an *absence*, like 030 C5 kept the table's column kinds closed:
    // the risk is not that these two are wrong, it is that a third appears —
    // `error(apiError)`, or a `fromProblem()` — and drags core/api into ui/ while
    // moving the "what does this failure say" decision out of the feature that
    // knows (D1, and 105 C2's inversion).
    const surface = Object.getOwnPropertyNames(LoreToast.prototype).filter(
      (name) => name !== 'constructor',
    );
    expect(surface.sort()).toEqual(['failure', 'success']);

    // And each takes a message plus one options bag. A third parameter is where
    // an ApiError, a Retry-After or a callback would arrive.
    expect(LoreToast.prototype.success.length).toBe(2);
    expect(LoreToast.prototype.failure.length).toBe(2);
  });

  it('sets no timer a maker did not ask for (105 C4)', async () => {
    const { service, announced, speak } = await setup();

    await speak(() => service.failure('Inventory service is unavailable.'));

    // A toast in this design never says "try again in five seconds" and never
    // schedules one: ApiError discards the response headers, so Retry-After does
    // not exist to render, and an automatic retry against a server that has just
    // said "not right now" is how a blip becomes an outage (105 D2).
    expect(announced().textContent).not.toMatch(/second|retrying|automatically/i);
    expect(announced().querySelector('[data-button]')).toBeNull();
  });
});
