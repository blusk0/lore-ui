import {
  Component,
  provideZonelessChangeDetection,
  reflectComponentType,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { axe } from 'vitest-axe';
type FieldErrors = Readonly<Record<string, readonly string[]>>;
import { expectOnlyTokenColours, overlayContainer } from '@lore/ui/testing';
import { HlmDatePicker, HlmDatePickerImports } from '../index';

/**
 * The picker, composed exactly as a form will compose it (130 D1, D3).
 *
 * **Every assertion about a day is written as an exact string, and none of them
 * consults the process timezone.** The plan's acceptance runs this file under
 * `TZ=Pacific/Kiritimati` (+14) and `TZ=Pacific/Honolulu` (−10) precisely so
 * that an implementation reading local date components is wrong in one
 * direction in the first run and the other direction in the second. A spec that
 * computed its expectations from the running zone would pass under both and
 * prove nothing.
 */
@Component({
  imports: [HlmFieldImports, HlmDatePickerImports],
  template: `
    <hlm-field [messages]="errors()['receivedOn'] ?? []">
      <label hlmLabel>Received on</label>
      <hlm-date-picker [value]="receivedOn()" (valueChange)="onChange($event)"></hlm-date-picker>
      <p hlmFieldDescription>The day the delivery arrived.</p>
    </hlm-field>
  `,
})
class Host {
  readonly receivedOn = signal<string | null>(null);
  readonly errors = signal<FieldErrors>({});

  /** Every emission, in order — so a spec can assert one did *not* happen. */
  readonly emitted = signal<readonly (string | null)[]>([]);
  /** A feature that ignores the event is a bug; the default host writes back. */
  writesBack = true;

  onChange(next: string | null): void {
    this.emitted.update((all) => [...all, next]);
    if (this.writesBack) {
      this.receivedOn.set(next);
    }
  }
}

async function setup(initial: string | null = null) {
  await TestBed.configureTestingModule({
    imports: [Host],
    // Deliberately no `provideHttpClient`. 130 D1: every component in this plan
    // is state in, event out and none of them fetches — so if this control ever
    // grows an injected `HttpClient`, every test in this file dies at
    // construction with a NullInjectorError.
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.receivedOn.set(initial);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  const trigger = () => el.querySelector<HTMLButtonElement>('[data-slot="date-picker-trigger"]')!;

  /** The day buttons for the month on show, without the neighbours filling the grid. */
  const days = () =>
    Array.from(overlayContainer().querySelectorAll<HTMLButtonElement>('[role="gridcell"]')).filter(
      (cell) => !cell.hasAttribute('data-outside'),
    );

  return {
    fixture,
    el,
    host: fixture.componentInstance,
    trigger,
    days,
    panel: () => overlayContainer().querySelector<HTMLElement>('[role="dialog"]'),
    grid: () => overlayContainer().querySelector<HTMLElement>('[role="grid"]'),
    header: () => overlayContainer().querySelector<HTMLElement>('[aria-live="polite"]'),

    /** The day-of-month button, by the number printed on it. */
    day: (number: number) => days().find((cell) => cell.textContent?.trim() === String(number))!,

    async open() {
      // Focused before it is clicked, because a real browser focuses a button on
      // mousedown and jsdom's `click()` does not. It matters rather than being
      // ceremony: brain captures `document.activeElement` when the overlay opens
      // and restores focus to it on close, and it deliberately declines to
      // restore focus to `body` — so without this the panel would close leaving
      // focus nowhere, which is a test artefact that looks exactly like a
      // component that loses focus.
      trigger().focus();
      trigger().click();
      await fixture.whenStable();
      return overlayContainer();
    },

    async click(element: HTMLElement) {
      element.click();
      await fixture.whenStable();
    },

    async press(key: string, on: HTMLElement) {
      on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    },

    async write(value: string | null) {
      fixture.componentInstance.receivedOn.set(value);
      await fixture.whenStable();
    },

    async refuse(errors: FieldErrors) {
      fixture.componentInstance.errors.set(errors);
      await fixture.whenStable();
    },
  };
}

/** The ids in an `aria-describedby`, as a list. */
function describedBy(control: Element): string[] {
  return (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
}

afterEach(() => {
  document.querySelector('.cdk-overlay-container')?.remove();
});

describe('HlmDatePicker', () => {
  it('takes a string and emits a string, with no way to reach the Date', () => {
    const meta = reflectComponentType(HlmDatePicker)!;

    // 130 D4's rule, asserted as an ABSENCE because that is the only way to
    // assert it: the failure this control exists to prevent is a `Date` reaching
    // a form, and that becomes possible the moment a second output appears. Both
    // lists are exact rather than "contains", so a `dateChange` added later fails
    // here and is read before it is written.
    expect(meta.outputs.map((output) => output.templateName)).toEqual(['valueChange']);
    expect(meta.inputs.map((input) => input.templateName).sort()).toEqual([
      'aria-label',
      'dialogLabel',
      'disabled',
      'placeholder',
      'value',
    ]);
  });

  it('names the trigger from the field label and describes it from the hint', async () => {
    const { el, trigger } = await setup();

    // The form writes no ids: this component generates the trigger's, registers
    // it as the field's labelable through brain's `BrnFieldControl`, and
    // `BrnLabel` resolves `for` from it.
    expect(trigger().id).toBeTruthy();
    expect(el.querySelector('label')!.getAttribute('for')).toBe(trigger().id);
    expect(trigger().hasAttribute('aria-label')).toBe(false);
    expect(el.querySelector('hlm-date-picker')!.hasAttribute('aria-label')).toBe(false);

    const hint = el.querySelector('[hlmFieldDescription]')!;
    expect(hint.id).toBeTruthy();
    expect(describedBy(trigger())).toContain(hint.id);

    // It says what it opens, and it is shut until a maker opens it.
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('shows a written day in the trigger without a timezone touching it', async () => {
    const { trigger, host } = await setup('2026-08-03');

    // Pinned to UTC in the formatter, so this string is identical at +14 and at
    // −10. A picker that formatted in the browser's zone would read "Aug 2,
    // 2026" in Honolulu — the exact failure 130 D4 names, arriving through the
    // display path rather than through the model.
    expect(trigger().textContent).toContain('Aug 3, 2026');
    expect(trigger().hasAttribute('data-placeholder')).toBe(false);

    // A caller writing a value is not a maker changing one.
    expect(host.emitted()).toEqual([]);
  });

  it('reads as its placeholder when there is nothing to show', async () => {
    const { trigger, write } = await setup();

    expect(trigger().textContent).toContain('Pick a date');
    expect(trigger().getAttribute('data-placeholder')).toBe('');

    // An instant is not a `DateOnly` and is refused rather than truncated, so a
    // caller that hands one over sees an empty control instead of a day this
    // component invented — see `fromDateOnly`.
    await write('2026-08-03T00:00:00Z');
    expect(trigger().textContent).toContain('Pick a date');

    await write('2026-02-30');
    expect(trigger().textContent).toContain('Pick a date');
  });

  it('opens a named panel holding a grid for the month on show', async () => {
    const { open, panel, grid, header, days } = await setup('2026-08-03');
    await open();

    // A dialog with no name is a boundary a screen reader announces as nothing;
    // brain's own overlay role is turned off precisely so this one can be named.
    expect(panel()!.getAttribute('aria-label')).toBe('Choose a date');

    expect(header()!.textContent).toContain('August');
    expect(header()!.textContent).toContain('2026');

    // The grid is named by the live header, through the `aria-labelledby` brain
    // binds — and it resolves even though the header is rendered into the CDK
    // overlay, because the content query matches the template where it was
    // declared rather than where it was inserted. Measured rather than assumed:
    // it is the kind of thing a portal is entitled to break.
    expect(grid()!.getAttribute('aria-labelledby')).toBe(header()!.id);
    expect(header()!.id).toBeTruthy();

    // The fallback name says the same month, so the day it is ever needed the
    // grid is still named rather than silently anonymous. Two routes to one
    // name, never two names.
    expect(grid()!.getAttribute('aria-label')).toBe(header()!.textContent!.trim());

    // August has 31 days, and the neighbours that fill the grid are marked as
    // such rather than counted.
    expect(days()).toHaveLength(31);
    expect(days()[0].textContent!.trim()).toBe('1');
    expect(days()[30].textContent!.trim()).toBe('31');
  });

  it('emits the exact day that was clicked, at both ends of the month', async () => {
    const { open, click, day, host } = await setup('2026-08-15');
    await open();

    // The whole acceptance in three lines. A naive implementation reading local
    // date components emits `2026-07-31` here in Honolulu and `2026-08-02` in
    // Kiritimati; both runs assert this same string.
    await click(day(1));
    expect(host.emitted()).toEqual(['2026-08-01']);
    expect(host.receivedOn()).toBe('2026-08-01');

    await open();
    await click(day(31));
    expect(host.emitted()).toEqual(['2026-08-01', '2026-08-31']);

    // What crossed the boundary is a string and only a string.
    for (const emission of host.emitted()) {
      expect(typeof emission).toBe('string');
    }
  });

  it('round-trips a day it emitted back into the grid it came from', async () => {
    const { open, click, day, days, trigger, host } = await setup('2026-08-15');
    await open();
    await click(day(3));

    expect(host.receivedOn()).toBe('2026-08-03');
    expect(trigger().textContent).toContain('Aug 3, 2026');

    // The day that went out is the day that comes back in and is marked chosen —
    // the property that fails the moment either conversion drifts by a day.
    await open();
    const selected = days().filter((cell) => cell.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent!.trim()).toBe('3');
  });

  it('shuts on a choice and hands focus back to the trigger', async () => {
    const { open, click, day, trigger } = await setup('2026-08-15');
    await open();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    await click(day(9));

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(overlayContainer().querySelector('[role="grid"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('clears when the chosen day is picked a second time', async () => {
    const { open, click, day, trigger, host } = await setup('2026-08-15');
    await open();

    // brain's own toggle, and the only way to empty this control. A maker who
    // picked the wrong day can un-pick it without a second affordance beside the
    // grid that already does it.
    await click(day(15));

    expect(host.emitted()).toEqual([null]);
    expect(host.receivedOn()).toBeNull();
    expect(trigger().textContent).toContain('Pick a date');

    // Clearing is not the end of the interaction, so the panel stays put.
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('moves real focus through the grid and announces the month politely', async () => {
    const { open, press, day, header, grid } = await setup('2026-08-15');
    await open();

    // 130 C2 is answered by this test rather than by a bound attribute. A
    // listbox announces its caret with `aria-activedescendant` because focus
    // never moves; a grid moves focus itself, so the caret IS the focused
    // element and the attribute would be a second, contradictory claim.
    expect(document.activeElement).toBe(day(15));
    expect(day(15).getAttribute('tabindex')).toBe('0');
    expect(day(14).getAttribute('tabindex')).toBe('-1');
    expect(grid()!.hasAttribute('aria-activedescendant')).toBe(false);
    expect(overlayContainer().querySelector('[aria-activedescendant]')).toBeNull();

    await press('ArrowRight', day(15));
    expect(document.activeElement).toBe(day(16));

    await press('ArrowDown', day(16));
    expect(document.activeElement).toBe(day(23));

    // The header is a live region, so a maker who moves off the month hears
    // which one they landed on rather than watching the days change silently.
    expect(header()!.getAttribute('aria-live')).toBe('polite');
    await press('PageDown', day(23));
    expect(header()!.textContent).toContain('September');
  });

  it('never renames the day that was picked when the caller ignores the event', async () => {
    const { open, click, day, trigger, host } = await setup('2026-08-15');
    host.writesBack = false;

    await open();
    await click(day(4));

    // The caller dropped the event on the floor, which is the caller's bug and
    // not a licence for the control to render a contradiction.
    expect(host.emitted()).toEqual(['2026-08-04']);
    expect(host.receivedOn()).toBe('2026-08-15');
    expect(trigger().textContent).toContain('Aug 4, 2026');
  });

  it('lands a server refusal on the trigger, and not by colour alone', async () => {
    const { el, trigger, refuse } = await setup('2026-08-03');

    // `020` D3's wire shape. A 422 arrives on a form whose client-side
    // validators all pass, which is exactly what brain's own `aria-invalid`
    // cannot see; `HlmField` is the one thing in the tree that unions the two.
    await refuse({ receivedOn: ['A receipt cannot be dated in the future.'] });

    const messages = el.querySelector('[data-slot="field-messages"]')!;
    expect(messages.textContent).toContain('cannot be dated in the future');
    expect(describedBy(trigger())).toContain(messages.id);
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('hlm-field')!.getAttribute('data-invalid')).toBe('true');

    await refuse({});
    expect(trigger().getAttribute('aria-invalid')).toBeNull();
  });

  it('paints only from the token layer', async () => {
    const { el, open, refuse } = await setup('2026-08-03');
    await refuse({ receivedOn: ['A receipt cannot be dated in the future.'] });
    expectOnlyTokenColours(el);
    expectOnlyTokenColours(await open());
  });

  it('reports no axe violations, closed, open or refused', async () => {
    const { el, open, refuse } = await setup('2026-08-03');

    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);

    await refuse({ receivedOn: ['A receipt cannot be dated in the future.'] });
    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);

    const overlay = await open();
    expect(
      (await axe(overlay)).violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`,
      ),
    ).toEqual([]);
  });
});
