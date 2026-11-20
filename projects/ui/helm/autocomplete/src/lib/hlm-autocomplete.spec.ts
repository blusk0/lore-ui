import { Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { expectOnlyTokenColours, overlayContainer } from '@lore/ui/testing';
import { axe } from 'vitest-axe';
import { HlmAutocomplete, HlmAutocompleteImports, type AutocompleteOption } from '../index';

/** None of these contains the text the host starts with, so any sieve would drop them. */
const UNITS: readonly AutocompleteOption[] = [
  { value: 'kg', label: 'kg', detail: 'kilograms' },
  { value: 'g', label: 'g', detail: 'grams' },
  { value: 'lb', label: 'lb', detail: 'pounds' },
];

/** What a host saw at its own `(keydown)`, after the control had its turn. */
interface SeenKey {
  readonly key: string;
  readonly defaultPrevented: boolean;
}

@Component({
  imports: [HlmFieldImports, HlmAutocompleteImports],
  template: `
    <div (keydown)="dialog.push($event.key)">
      <hlm-field>
        <label hlmLabel>What do you want to do?</label>
        <hlm-autocomplete
          [text]="text()"
          [options]="options()"
          [(open)]="open"
          [acceptOnTab]="acceptOnTab()"
          [disabled]="disabled()"
          listboxLabel="Unit suggestions"
          (textChange)="texts.push($event)"
          (caretChange)="carets.push($event)"
          (accept)="accepted.push($event)"
          (keydown)="seen.push({ key: $event.key, defaultPrevented: $event.defaultPrevented })"
        />
      </hlm-field>
    </div>
  `,
})
class Host {
  readonly box = viewChild.required(HlmAutocomplete);
  readonly text = signal('received 2 ');
  readonly options = signal<readonly AutocompleteOption[]>(UNITS);
  readonly open = signal(false);
  readonly acceptOnTab = signal(true);
  readonly disabled = signal(false);

  readonly texts: string[] = [];
  readonly carets: number[] = [];
  readonly accepted: AutocompleteOption[] = [];
  readonly seen: SeenKey[] = [];
  /** Keys that reached an element around the control, as a dialog's handler would. */
  readonly dialog: string[] = [];
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  const input = () => el.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const options = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="option"]'));
  const listbox = () =>
    document.querySelector<HTMLElement>('.cdk-overlay-container [role="listbox"]');

  async function set(change: () => void) {
    change();
    await fixture.whenStable();
  }

  /** Dispatches a keydown at the input and returns it, so a spec can read `defaultPrevented`. */
  async function press(key: string, init: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    input().dispatchEvent(event);
    await fixture.whenStable();
    return event;
  }

  async function type(value: string) {
    input().value = value;
    input().setSelectionRange(value.length, value.length);
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function openList() {
    await set(() => host.open.set(true));
  }

  const highlighted = () => options().findIndex((o) => o.hasAttribute('data-highlighted'));

  return { fixture, host, el, input, options, listbox, set, press, type, openList, highlighted };
}

afterEach(() => {
  document.querySelector('.cdk-overlay-container')?.remove();
});

describe('HlmAutocomplete', () => {
  it('renders the options verbatim, in the order given', async () => {
    const { openList, options, input, set, host } = await setup();
    await openList();

    expect(input().value).toBe('received 2 ');
    expect(options().map((o) => o.querySelector('span')!.textContent)).toEqual(['kg', 'g', 'lb']);
    expect(options()[0].textContent).toContain('kilograms');

    // Two rows with one value both render: nothing is merged.
    await set(() => host.options.set([UNITS[0], UNITS[0]]));
    expect(options()).toHaveLength(2);
  });

  it('is a combobox named by its field, with aria-controls only while a listbox is on the page', async () => {
    const { el, input, listbox, openList, set, host } = await setup();

    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(el.querySelector('label')!.getAttribute('for')).toBe(input().id);
    expect(input().hasAttribute('aria-label')).toBe(false);
    expect(el.querySelector('hlm-autocomplete')!.hasAttribute('aria-label')).toBe(false);

    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().hasAttribute('aria-controls')).toBe(false);
    expect(listbox()).toBeNull();

    await openList();
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(input().getAttribute('aria-controls')).toBe(listbox()!.id);
    expect(listbox()!.getAttribute('aria-label')).toBe('Unit suggestions');

    // Open but empty: no listbox, so nothing to control.
    await set(() => host.options.set([]));
    expect(listbox()).toBeNull();
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().hasAttribute('aria-controls')).toBe(false);
  });

  it('moves the highlight with ArrowDown, ArrowUp, Home and End, wrapping, and names it as the active descendant', async () => {
    const { openList, press, highlighted, input, options } = await setup();
    await openList();

    // Nothing is highlighted until an arrow key is pressed.
    expect(highlighted()).toBe(-1);
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);

    const down = await press('ArrowDown');
    expect(highlighted()).toBe(0);
    expect(down.defaultPrevented).toBe(true);
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(options()[1].getAttribute('aria-selected')).toBe('false');

    await press('ArrowDown');
    await press('ArrowDown');
    expect(highlighted()).toBe(2);
    await press('ArrowDown');
    expect(highlighted()).toBe(0);
    await press('ArrowUp');
    expect(highlighted()).toBe(2);
    await press('Home');
    expect(highlighted()).toBe(0);
    await press('End');
    expect(highlighted()).toBe(2);
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[2].id);
  });

  it('starts a new list with nothing highlighted', async () => {
    const { openList, press, highlighted, set, host } = await setup();
    await openList();
    await press('ArrowDown');
    expect(highlighted()).toBe(0);

    await set(() => host.options.set([...UNITS]));
    expect(highlighted()).toBe(-1);
  });

  it('takes the highlighted row on Enter and prevents the default; the caller never sees it', async () => {
    const { host, openList, press, input } = await setup();
    await openList();
    await press('ArrowDown');
    await press('ArrowDown');

    const enter = await press('Enter');

    expect(host.accepted).toEqual([UNITS[1]]);
    expect(enter.defaultPrevented).toBe(true);
    expect(host.seen.map((k) => k.key)).not.toContain('Enter');
    // The caller splices; until it does, the text is what it was.
    expect(input().value).toBe('received 2 ');
  });

  it('leaves Enter with no highlight to the caller: nothing taken, nothing prevented', async () => {
    const { host, openList, press } = await setup();
    await openList();

    const enter = await press('Enter');

    expect(host.accepted).toEqual([]);
    expect(enter.defaultPrevented).toBe(false);
    expect(host.seen).toEqual([{ key: 'Enter', defaultPrevented: false }]);
  });

  it('takes the highlighted row, else the first, on Tab while the list shows', async () => {
    const { host, openList, press } = await setup();
    await openList();

    const first = await press('Tab');
    expect(host.accepted).toEqual([UNITS[0]]);
    expect(first.defaultPrevented).toBe(true);

    await press('End');
    await press('Tab');
    expect(host.accepted).toEqual([UNITS[0], UNITS[2]]);
  });

  it('leaves Tab alone with the list closed or empty, on Shift, and with acceptOnTab off', async () => {
    const { host, openList, press, set } = await setup();

    const closed = await press('Tab');
    expect(closed.defaultPrevented).toBe(false);

    await openList();
    expect((await press('Tab', { shiftKey: true })).defaultPrevented).toBe(false);

    await set(() => host.acceptOnTab.set(false));
    expect((await press('Tab')).defaultPrevented).toBe(false);

    await set(() => {
      host.acceptOnTab.set(true);
      host.options.set([]);
    });
    expect((await press('Tab')).defaultPrevented).toBe(false);

    expect(host.accepted).toEqual([]);
  });

  it('closes on Escape without letting it reach the dialog around it, and lets a second Escape through', async () => {
    const { host, openList, press, listbox, input } = await setup();
    const atBody: string[] = [];
    const listener = (event: KeyboardEvent) => atBody.push(event.key);
    document.body.addEventListener('keydown', listener);

    try {
      await openList();
      const first = await press('Escape');

      expect(host.open()).toBe(false);
      expect(listbox()).toBeNull();
      expect(input().getAttribute('aria-expanded')).toBe('false');
      expect(first.defaultPrevented).toBe(true);
      // The element a dialog listens on, and the body CDK's dispatcher listens on, saw nothing.
      expect(host.dialog).toEqual([]);
      expect(atBody).toEqual([]);

      const second = await press('Escape');
      expect(second.defaultPrevented).toBe(false);
      expect(host.dialog).toEqual(['Escape']);
      expect(atBody).toEqual(['Escape']);
    } finally {
      document.body.removeEventListener('keydown', listener);
    }
  });

  it('never sets the input value except from text', async () => {
    const { host, input, openList, options, fixture, type, set } = await setup();
    await openList();

    options()[2].click();
    await fixture.whenStable();
    expect(host.accepted).toEqual([UNITS[2]]);
    expect(input().value).toBe('received 2 ');

    // Typed and not written back: reported, and the text input stays what the caller holds.
    await type('received 2 k');
    expect(host.texts).toEqual(['received 2 k']);
    expect(host.text()).toBe('received 2 ');

    await set(() => host.text.set('received 2 kg '));
    expect(input().value).toBe('received 2 kg ');
  });

  it('reports the text and each caret move once', async () => {
    const { host, input, type, fixture } = await setup();

    await type('rec');
    expect(host.texts).toEqual(['rec']);
    expect(host.carets).toEqual([3]);

    input().setSelectionRange(1, 1);
    input().dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
    await fixture.whenStable();
    input().click();
    await fixture.whenStable();

    expect(host.carets).toEqual([3, 1]);
  });

  it('puts the caret where the caller says once the new text is rendered, without reporting it', async () => {
    const { host, input, fixture } = await setup();

    host.text.set('received 2 kg shea butter');
    host.box().setCaret(14);
    await fixture.whenStable();

    expect(input().value).toBe('received 2 kg shea butter');
    expect(document.activeElement).toBe(input());
    expect(input().selectionStart).toBe(14);
    expect(input().selectionEnd).toBe(14);
    expect(host.carets).toEqual([]);

    input().click();
    await fixture.whenStable();
    expect(host.carets).toEqual([]);
  });

  it('keeps focus in the input when a row is pressed, and closes when focus leaves', async () => {
    const { host, input, openList, options, fixture } = await setup();
    await openList();

    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[0].dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);

    input().focus();
    input().blur();
    await fixture.whenStable();
    expect(host.open()).toBe(false);
  });

  it('shows no list while disabled', async () => {
    const { host, input, listbox, set } = await setup();
    await set(() => {
      host.disabled.set(true);
      host.open.set(true);
    });

    expect(input().disabled).toBe(true);
    expect(listbox()).toBeNull();
  });

  it('paints only from the token layer, and reports no axe violations, closed or open', async () => {
    const { el, openList, press } = await setup();
    expectOnlyTokenColours(el);
    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);

    await openList();
    await press('ArrowDown');
    const overlay = overlayContainer();
    const panel = overlay.querySelector<HTMLElement>('[data-slot="autocomplete-panel"]')!;
    expect([...panel.classList]).toEqual(
      expect.arrayContaining(['bg-popover', 'text-popover-foreground', 'ring-border']),
    );
    expect([...panel.classList].some((name) => name.startsWith('motion-safe:'))).toBe(true);
    expectOnlyTokenColours(overlay);
    // The input and the overlay together, so aria-controls and aria-activedescendant
    // resolve; landmarks are the page's, not this control's.
    expect(
      (await axe(document.body, { rules: { region: { enabled: false } } })).violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`,
      ),
    ).toEqual([]);
  });

  it('takes a name from aria-label when it stands alone', async () => {
    @Component({
      imports: [HlmAutocompleteImports],
      template: `<hlm-autocomplete aria-label="Quick action" inputId="qa-text" />`,
    })
    class Standalone {}

    await TestBed.configureTestingModule({
      imports: [Standalone],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Standalone);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('[role="combobox"]')!;
    expect(input.getAttribute('aria-label')).toBe('Quick action');
    expect(input.id).toBe('qa-text');
    expect(el.querySelector('hlm-autocomplete')!.hasAttribute('aria-label')).toBe(false);
    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);
  });
});
