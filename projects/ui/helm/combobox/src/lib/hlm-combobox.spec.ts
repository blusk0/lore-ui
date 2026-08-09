import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { axe } from 'vitest-axe';
type FieldErrors = Readonly<Record<string, readonly string[]>>;
import { expectOnlyTokenColours, overlayContainer } from '@lore/ui/testing';
import {
  COMBOBOX_NO_MATCHES,
  COMBOBOX_SEARCHING,
  HlmComboboxImports,
  type ComboboxOption,
} from '../index';

/*
 * No local `ResizeObserver` stub here, deliberately. brain measures this control
 * with one so its panel can take the width, and jsdom implements none — but the
 * gap-filler now lives in `src/test-setup.ts` beside the three already there,
 * which is where P2.1 said the second suite to need it should put it. A second
 * copy in a second spec is the duplication that move exists to end (`030` C1:
 * it reports nothing, because any size it invented would be a number a test
 * could accidentally believe).
 */

/** One page of `110`'s material search, as `140` will map it onto `ui/`'s shape. */
const PAGE_ONE: readonly ComboboxOption[] = [
  { value: 'mat-1', label: 'Beeswax, white', hint: 'BW-100' },
  { value: 'mat-2', label: 'Beeswax, yellow', hint: 'BW-200' },
  { value: 'mat-3', label: 'Shea butter', hint: 'SB-010' },
];

/**
 * What the server answers for "bw" — matched on the **code**, not on the label.
 *
 * The middle row is the one that matters: nothing in "Beeswax, yellow" contains
 * the letters "bw", so a client-side sieve run over the server's answer would
 * drop it. It is here so that a spec, not a comment, is what stops that.
 */
const CODE_MATCHES: readonly ComboboxOption[] = [
  { value: 'mat-1', label: 'Beeswax, white', hint: 'BW-100' },
  { value: 'mat-2', label: 'Beeswax, yellow', hint: 'BW-200' },
];

/**
 * The host composes the control exactly as `140`'s screens will: inside the field
 * wrapper, with one lookup against `020`'s `errors` map under the field key the
 * server sent it under, and both the query and the value owned by the feature
 * (130 D1).
 */
@Component({
  imports: [HlmFieldImports, HlmComboboxImports],
  template: `
    <hlm-field [messages]="errors()['materialId'] ?? []">
      <label hlmLabel>Material</label>
      <hlm-combobox
        [options]="options()"
        [value]="material()"
        [loading]="loading()"
        listboxLabel="Materials"
        (filterChange)="onFilter($event)"
        (valueChange)="onPick($event)"
      ></hlm-combobox>
      <p hlmFieldDescription>Search by name or code.</p>
    </hlm-field>
  `,
})
class Host {
  readonly options = signal<readonly ComboboxOption[]>(PAGE_ONE);
  readonly material = signal<ComboboxOption | null>(null);
  readonly loading = signal(false);
  readonly errors = signal<FieldErrors>({});

  /** Every emission, in order — so a spec can assert one did *not* happen. */
  readonly emitted = signal<readonly (ComboboxOption | null)[]>([]);
  readonly queries = signal<readonly string[]>([]);
  /** A feature that ignores the event is a bug; the default host writes back. */
  writesBack = true;

  onPick(option: ComboboxOption | null): void {
    this.emitted.update((all) => [...all, option]);
    if (this.writesBack) {
      this.material.set(option);
    }
  }

  onFilter(query: string): void {
    this.queries.update((all) => [...all, query]);
  }
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    // Deliberately no `provideHttpClient`. 130 D1: every component in this plan
    // is state in, event out and none of them fetches — so if this control ever
    // grows an injected `HttpClient`, every test in this file dies at
    // construction with a NullInjectorError. That is the structural assertion the
    // phase asks for, and it costs a comment rather than a test.
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  const box = () => el.querySelector<HTMLInputElement>('[role="combobox"]')!;

  async function type(text: string) {
    box().value = text;
    box().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function press(key: string) {
    box().dispatchEvent(keydown(key));
    await fixture.whenStable();
  }

  return {
    fixture,
    el,
    host: fixture.componentInstance,
    box,
    type,
    press,
    options: () => Array.from(overlayContainer().querySelectorAll<HTMLElement>('[role="option"]')),
    async offer(options: readonly ComboboxOption[]) {
      fixture.componentInstance.options.set(options);
      await fixture.whenStable();
    },
    async searching(is: boolean) {
      fixture.componentInstance.loading.set(is);
      await fixture.whenStable();
    },
    async refuse(errors: FieldErrors) {
      fixture.componentInstance.errors.set(errors);
      await fixture.whenStable();
    },
  };
}

/**
 * A keydown a real browser would produce.
 *
 * jsdom's `KeyboardEvent` leaves `keyCode` at 0, and Angular CDK's list key
 * manager — which is what moves the caret through the options — switches on
 * `keyCode` and nothing else. An event without one opens the panel (brain reads
 * `event.key`) and then silently fails to move, which looks exactly like a broken
 * component. The numbers are the legacy key codes CDK imports from
 * `@angular/cdk/keycodes`. Carried from 130 P2.1's spec, which found it.
 */
const KEY_CODES: Readonly<Record<string, number>> = {
  ArrowDown: 40,
  ArrowUp: 38,
  Enter: 13,
  Escape: 27,
  Home: 36,
  End: 35,
};

function keydown(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { get: () => KEY_CODES[key] ?? 0 });
  return event;
}

/** The ids in an `aria-describedby`, as a list. */
function describedBy(control: Element): string[] {
  return (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
}

afterEach(() => {
  document.querySelector('.cdk-overlay-container')?.remove();
});

describe('HlmCombobox', () => {
  it('is named by the field label, and describes itself with the field hint', async () => {
    const { el, box } = await setup();

    // The form writes no ids: brain generates the input's, `BrnFieldControl`
    // registers the combobox as the field's labelable, and `BrnLabel` resolves
    // `for` from it. Break that registration and this is what fails.
    const id = box().id;
    expect(id).toBeTruthy();
    expect(el.querySelector('label')!.getAttribute('for')).toBe(id);

    const hint = el.querySelector('[hlmFieldDescription]')!;
    expect(hint.id).toBeTruthy();
    expect(describedBy(box())).toContain(hint.id);

    // The combobox contract, from brain and not re-implemented here.
    expect(box().getAttribute('aria-haspopup')).toBe('listbox');
    expect(box().getAttribute('aria-autocomplete')).toBe('list');
    expect(box().getAttribute('aria-expanded')).toBe('false');

    // The accessible name lives on the control, not twice — an `aria-label` input
    // is for the standalone case and nothing set one here.
    expect(el.querySelector('hlm-combobox')!.hasAttribute('aria-label')).toBe(false);
    expect(box().hasAttribute('aria-label')).toBe(false);
  });

  it('names the list, points at it, and points at nothing while it is shut', async () => {
    const { box, press } = await setup();

    // Shut: there is no list on the page, so there is no id to reference. A
    // dangling `aria-controls` is a reference a screen reader follows into
    // nothing, which is why it is bound to what is rendered rather than to a
    // constant.
    expect(box().hasAttribute('aria-controls')).toBe(false);

    await press('ArrowDown');

    const list = overlayContainer().querySelector<HTMLElement>('[role="listbox"]')!;
    expect(list.id).toBeTruthy();
    expect(box().getAttribute('aria-controls')).toBe(list.id);
    // The list is named by the caller. It cannot borrow the input's name, which
    // computes to whatever has been typed.
    expect(list.getAttribute('aria-label')).toBe('Materials');
  });

  it('opens, moves, announces the caret and commits from the keyboard alone', async () => {
    const { host, box, press, options } = await setup();

    // Down arrow opens and lands the caret on the first material.
    await press('ArrowDown');
    expect(box().getAttribute('aria-expanded')).toBe('true');
    expect(options()[0].getAttribute('data-highlighted')).toBe('');

    // …and the caret is announced, not merely painted (130 C2). Without this a
    // screen reader would keep reading the chosen row while the list moved.
    expect(options()[0].id).toBeTruthy();
    expect(box().getAttribute('aria-activedescendant')).toBe(options()[0].id);

    // …and moves.
    await press('ArrowDown');
    expect(options()[1].getAttribute('data-highlighted')).toBe('');
    expect(options()[0].hasAttribute('data-highlighted')).toBe(false);
    expect(box().getAttribute('aria-activedescendant')).toBe(options()[1].id);

    // Enter takes the row under the caret — the whole option, so the caller can
    // keep showing it after it drops out of the current page.
    await press('Enter');
    expect(host.emitted()).toEqual([PAGE_ONE[1]]);
    expect(host.material()).toEqual(PAGE_ONE[1]);
    expect(box().getAttribute('aria-expanded')).toBe('false');
    expect(box().value).toBe('Beeswax, yellow');

    // Shut again, the caret refers to nothing: the options it pointed at are no
    // longer in the document.
    expect(box().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('stops pointing at the caret when the row under it is re-stocked away', async () => {
    const { box, offer, press, options } = await setup();

    await press('ArrowDown');
    expect(box().getAttribute('aria-activedescendant')).toBe(options()[0].id);

    // A page arrives — the caller's last request landing, or a poll — while the
    // panel is still open, and it does not contain the row the caret was on.
    // CDK's key manager does not clear its caret when the item it points at is
    // destroyed, so without a check against what is actually rendered this would
    // go on naming an element that has left the document: a reference a screen
    // reader follows into nothing.
    await offer([PAGE_ONE[2]]);

    expect(options()).toHaveLength(1);
    expect(box().hasAttribute('aria-activedescendant')).toBe(false);
    // The panel is still open and still usable — the caret is simply nowhere.
    expect(box().getAttribute('aria-expanded')).toBe('true');
  });

  it('dismisses on Escape, restoring the choice it already had', async () => {
    const { host, box, press, options, fixture } = await setup();

    await press('ArrowDown');
    options()[2].click();
    await fixture.whenStable();
    expect(host.emitted()).toEqual([PAGE_ONE[2]]);

    await press('ArrowDown');
    expect(box().getAttribute('aria-expanded')).toBe('true');

    await press('Escape');

    expect(box().getAttribute('aria-expanded')).toBe('false');
    // One emission, from the click. Dismissing chose nothing and unchose nothing.
    expect(host.emitted()).toEqual([PAGE_ONE[2]]);
    expect(host.material()).toEqual(PAGE_ONE[2]);
    // …and the box reads the choice again rather than a half-typed query.
    expect(box().value).toBe('Shea butter');
  });

  it('asks the caller for a narrower list instead of sieving the one it holds', async () => {
    const { host, offer, type, options } = await setup();

    await type('bw');

    // The query goes out unmodified and unthrottled; the debounce and the request
    // are the caller's (130 D1).
    expect(host.queries()).toEqual(['bw']);

    // The caller answers with what the *server* matched — including a row whose
    // label contains no "bw" at all, because the server matched its code. brain's
    // own client-side matching is turned off precisely so that row survives: a
    // second sieve under a different rule loses rows rather than tidying them.
    await offer(CODE_MATCHES);

    // Rows are read by what they say, which is also all a maker gets: brain
    // writes the whole option into `data-value` and it stringifies to nothing
    // anyone can match on.
    expect(options().map((option) => option.querySelector('span')!.textContent)).toEqual([
      'Beeswax, white',
      'Beeswax, yellow',
    ]);
    // …and each row carries the second line of identification a long list needs.
    expect(options()[1].textContent).toContain('BW-200');

    // …and no row is marked as sieved out. This is the assertion that actually
    // holds the rule, and counting rows is not: brain's matcher does not remove
    // a row it rejects, it marks it `data-hidden` and leaves the rest to the
    // styling layer. A mutation that switched the matcher back on went unnoticed
    // to every other line in this test (130 P2.2, and R35's rule about what a
    // surviving mutation is evidence of).
    expect(options().filter((option) => option.hasAttribute('data-hidden'))).toEqual([]);
  });

  it('says so when the answer is empty, and says something else while it waits', async () => {
    const { offer, searching, type } = await setup();

    await searching(true);
    await type('zzz');
    await offer([]);

    // Waiting is not the same as nothing found, and a control that says "no
    // matches" while a request is out is telling a maker something untrue.
    let empty = overlayContainer().querySelector<HTMLElement>('[data-slot="combobox-empty"]')!;
    expect(empty.textContent).toContain(COMBOBOX_SEARCHING);

    await searching(false);

    empty = overlayContainer().querySelector<HTMLElement>('[data-slot="combobox-empty"]')!;
    expect(empty.textContent).toContain(COMBOBOX_NO_MATCHES);
    // It is announced rather than merely displayed: a maker who types past the
    // last match is told, instead of being left with a panel that went blank.
    expect(empty.getAttribute('role')).toBe('status');
    expect(empty.getAttribute('aria-live')).toBe('polite');

    // No listbox at all, rather than an empty one with a paragraph inside it.
    expect(overlayContainer().querySelector('[role="listbox"]')).toBeNull();
    expect((await axe(overlayContainer())).violations.map((v) => v.id)).toEqual([]);
  });

  it('lands a server refusal on the control, and not by colour alone', async () => {
    const { el, box, refuse } = await setup();

    // `020` D3's wire shape. A 422 arrives on a form whose client-side validators
    // all pass, which is exactly what brain's own `aria-invalid` cannot see.
    await refuse({ materialId: ['Select a material.'] });

    const messages = el.querySelector('[data-slot="field-messages"]')!;
    expect(messages.textContent).toContain('Select a material.');
    expect(describedBy(box())).toContain(messages.id);
    expect(box().getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('hlm-field')!.getAttribute('data-invalid')).toBe('true');

    // Three channels, not one: the words above, the attribute a screen reader
    // announces, and only then a change of colour.
    expect(box().getAttribute('class')).toContain('aria-[invalid=true]:border-destructive');

    await refuse({});
    expect(box().hasAttribute('aria-invalid')).toBe(false);
  });

  it('keeps showing a choice the current page no longer contains, and does not rewrite it', async () => {
    const { el, host, box, offer, press, options, fixture } = await setup();

    // A maker picks a material out of the first page…
    await press('ArrowDown');
    options()[0].click();
    await fixture.whenStable();
    expect(host.emitted()).toEqual([PAGE_ONE[0]]);

    // …and the caller then hands over a page that does not contain it, which for
    // a server-paged search is the ordinary case rather than an edge one.
    await offer([PAGE_ONE[2]]);

    // Nothing was emitted, so no form was told a maker changed their mind.
    expect(host.emitted()).toEqual([PAGE_ONE[0]]);
    // The choice was not cleared and was not swapped for the first survivor.
    expect(host.material()).toEqual(PAGE_ONE[0]);
    // …and it still reads, because the option itself is what the control holds.
    expect(box().value).toBe('Beeswax, white');
    // Deliberately not marked stale: unlike the unit select's fixed catalogue, a
    // row missing from one page of matches is no evidence that it was withdrawn.
    expect(el.querySelector('hlm-combobox')!.hasAttribute('data-orphaned')).toBe(false);
    expect(box().hasAttribute('aria-invalid')).toBe(false);
  });

  it('emits a clear when a maker empties the box', async () => {
    const { host, box, press, options, fixture } = await setup();

    await press('ArrowDown');
    options()[0].click();
    await fixture.whenStable();

    box().value = '';
    box().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    // A form left holding a material the box no longer shows is the failure this
    // rules out — so "no choice" travels, and it travels as null.
    expect(host.emitted()).toEqual([PAGE_ONE[0], null]);
    expect(host.material()).toBeNull();
  });

  it('stays coherent when the caller ignores the event it emitted', async () => {
    const { host, box, press, options, fixture } = await setup();
    host.writesBack = false;

    await press('ArrowDown');
    options()[2].click();
    await fixture.whenStable();

    // The event fired once and the caller dropped it on the floor — the caller's
    // bug, not a licence for the control to render a contradiction.
    expect(host.emitted()).toEqual([PAGE_ONE[2]]);
    expect(host.material()).toBeNull();
    expect(box().value).toBe('Shea butter');
  });

  it('paints only from the token layer, shut and open', async () => {
    const { el, press, refuse } = await setup();
    await refuse({ materialId: ['Select a material.'] });
    expectOnlyTokenColours(el);

    await press('ArrowDown');
    const overlay = overlayContainer();
    const panel = overlay.querySelector<HTMLElement>('[data-slot="combobox-panel"]')!;
    expect([...panel.classList]).toEqual(
      expect.arrayContaining(['bg-popover', 'text-popover-foreground', 'ring-border']),
    );
    // The open/close animation stays behind `motion-safe:` (030 P4.2).
    expect([...panel.classList].some((name) => name.startsWith('motion-safe:'))).toBe(true);
    expectOnlyTokenColours(overlay);
  });

  it('reports no axe violations, shut, open or refused', async () => {
    const { el, press, refuse } = await setup();

    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);

    await refuse({ materialId: ['Select a material.'] });
    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);

    await press('ArrowDown');
    expect(
      (await axe(overlayContainer())).violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`,
      ),
    ).toEqual([]);
  });
});
