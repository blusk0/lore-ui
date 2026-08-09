import { type BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import {
  BrnCombobox,
  BrnComboboxAnchor,
  BrnComboboxBaseToken,
  type BrnComboboxConfig,
  BrnComboboxContent,
  BrnComboboxEmpty,
  BrnComboboxInput,
  BrnComboboxItem,
  BrnComboboxItemToken,
  BrnComboboxList,
  BrnComboboxPopoverTrigger,
  provideBrnComboboxConfig,
} from '@spartan-ng/brain/combobox';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import {
  BrnPopover,
  BrnPopoverContent,
  provideBrnPopoverConfig,
  provideBrnPopoverDefaultOptions,
} from '@spartan-ng/brain/popover';
import { HlmField } from '@lore/ui/helm/field';
import { activeDescendantId, classes, hlm } from '@lore/ui/helm/utils';

/**
 * One thing a maker can choose, as this control renders it.
 *
 * Declared here and **not** imported from `core/api` (130 D1): `140` maps a
 * `MaterialSummary` — or anything else it needs picked — onto this shape in one
 * place, which is what keeps this component free of an API type and free of an
 * HTTP client.
 *
 * `hint` is the second line of identification a long list needs: two materials
 * called "Beeswax" are told apart by their code, not by their name.
 */
export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

/**
 * How this control asks brain to behave. See the class comment for the two
 * choices that carry weight.
 *
 * **The first member is written as a method rather than as an arrow, and that is
 * not a style choice.** Tailwind v4 finds its utilities by scanning source
 * *text*, and a bare `<word>:` or `<word> =` is read as one wherever it appears
 * — so the arrow spelling of this member mints a live rule for the CSS property
 * of the same name, plus the fifteen `@property` blocks that come with it:
 * **1.27 kB of stylesheet nothing in this application renders**, measured with
 * and against a build without it. The scanner skips a word immediately followed
 * by `(`, which is why the ordinary method shorthand costs nothing. Fifth time
 * this trap has cost this repository bytes, and the first where the word came
 * from a name a library chose rather than from English in a comment.
 */
const COMBOBOX_CONFIG: Partial<BrnComboboxConfig<ComboboxOption>> = {
  // Keep every option the caller handed over. See the class comment: the server
  // has already answered the query, and answering it a second time under a
  // different rule loses rows rather than tidying them.
  filter() {
    return true;
  },
  // Options arrive as fresh objects on every response, so identity would never
  // match; the value is what identifies a row.
  isItemEqualToValue: (option, chosen) => option.value === chosen?.value,
  // What the box reads once a row is taken, and it is read from the option
  // itself — which is why a chosen row survives leaving the current page.
  itemToString: (option) => option.label,
  // Typing puts the caret on the first row, so Enter takes the obvious match
  // without an arrow key first. It is the behaviour a maker who types four
  // letters and presses Enter is expecting.
  autoHighlight: true,
  // Shutting the panel is this component's job instead — see `_pick`. Left on,
  // brain shuts it in the middle of its own Enter handler and then re-opens it
  // two lines later.
  closeOnSelect: false,
};

/** Shown when the caller has handed over nothing and is not looking. */
export const COMBOBOX_NO_MATCHES = 'No matches.';

/** Shown when the caller has handed over nothing and a request is out. */
export const COMBOBOX_SEARCHING = 'Searching…';

/**
 * The typeahead: hundreds of things in, one of them out (130 P2.2).
 *
 * ```html
 * <hlm-field [messages]="errors()['materialId'] ?? []">
 *   <label hlmLabel>Material</label>
 *   <hlm-combobox
 *     [options]="options()"
 *     [value]="material()"
 *     [loading]="searching()"
 *     listboxLabel="Materials"
 *     (filterChange)="query.set($event)"
 *     (valueChange)="material.set($event)"
 *   />
 * </hlm-field>
 * ```
 *
 * ## It asks for more; it does not sieve what it was given
 *
 * The catalogue this picks from is **paged on the server** and matched there
 * against `110`'s `search` parameter, so the question "does this control narrow
 * the list it holds, or ask for a different one?" has exactly one safe answer:
 * it asks. Typing emits `filterChange`; `140` owns the debounce, the request and
 * the `loading` flag (130 D1), and hands back a new `options` array. Nothing
 * here fetches, and there is no `HttpClient` to inject.
 *
 * **So brain's own matching is turned off, and that is a correctness fix rather
 * than a tidy-up.** `BrnCombobox` ships a client-side matcher that keeps only
 * the items whose text contains the query, and leaving it on would sieve the
 * server's answer a second time under a *different* rule: the server matches a
 * material on its code as well as its name and returns one page of what it
 * found, so a row matched on a code would be dropped here for not repeating that
 * code in its label — silently, and only for the makers whose search terms work
 * that way. The config below therefore keeps every option it is handed, in the
 * order it is handed them, and the server's answer is the whole answer.
 *
 * ## A chosen option that is not in the current page is not stale
 *
 * P2.1's unit select shows a selection its caller has stopped offering as
 * `g (no longer offered)` and marks the host `data-orphaned`, because there a
 * shrinking list really is evidence: the catalogue is small, complete and always
 * fully present, so "not in the list" means "withdrawn".
 *
 * **Here that inference would be wrong nearly every time it fired.** These
 * options are one page of the matches for whatever the maker last typed, so the
 * chosen material drops out of `options` as a matter of course — most obviously
 * the moment it is chosen and the query moves on. A "no longer offered" badge
 * driven by that would be noise, and worse, noise that trains a maker to ignore
 * it. So the chosen option keeps rendering from its own `label`, which is why
 * the whole option travels in and out rather than a bare id.
 *
 * What P2.1 established and this control keeps unchanged is the part that
 * matters: **a maker's choice is never rewritten behind their back.** New
 * `options` do not clear it, do not swap it for the first row of the new page,
 * and emit nothing. The only writes are a maker picking a row and a maker
 * emptying the box — and the second one emits `null`, because a form that keeps
 * a material the box no longer shows is the failure this rules out.
 *
 * ## What comes from brain, and the one thing added beside it
 *
 * `BrnCombobox` and its input supply the contract: `role="combobox"` with
 * `aria-autocomplete="list"`, `aria-haspopup="listbox"` and `aria-expanded`;
 * type to open; arrows/Home/End/wrap to move the caret; Enter to take it; Escape
 * to dismiss through the CDK overlay's keyboard dispatcher, restoring the chosen
 * label; `role="option"` with `aria-selected` per row. `BrnFieldControl` (a host
 * directive of `BrnCombobox`) registers the input as the enclosing field's
 * labelable, so `<label hlmLabel>` resolves its `for` with the form writing no
 * ids. None of that is re-implemented.
 *
 * Three things brain leaves to its consumer, all bound below: the listbox's own
 * accessible name — it cannot borrow the input's, which computes to whatever has
 * been typed; `aria-controls`, bound only while a listbox is really on the page;
 * and `aria-activedescendant`, which is 130 C2 and is settled with the same
 * `activeDescendantId` the unit select uses, for the reasons in that helper's
 * comment.
 *
 * *Unverified here, not verified-clean* (`030` C1/C2): jsdom computes no geometry
 * and implements no top layer, so where this panel lands relative to the input —
 * and whether `provideSpartanHlm()`'s application-wide `usePopover: false` does
 * what it says — belongs to the browser-axe layer, not to this file's spec.
 */
@Component({
  selector: 'hlm-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    BrnPopover,
    BrnPopoverContent,
    BrnCombobox,
    BrnComboboxAnchor,
    BrnComboboxContent,
    BrnComboboxEmpty,
    BrnComboboxInput,
    BrnComboboxItem,
    BrnComboboxList,
    BrnComboboxPopoverTrigger,
    BrnFieldControlDescribedBy,
  ],
  providers: [
    provideIcons({ lucideCheck }),
    provideBrnComboboxConfig<ComboboxOption>(COMBOBOX_CONFIG),
    // Anchored to the control's start edge and lifted a hair off it, like the
    // menu and the unit select.
    provideBrnPopoverConfig({ align: 'start', sideOffset: 4 }),
    // `role: null` is not cosmetic. The popover defaults to `role="dialog"`, and
    // a combobox that says `aria-haspopup="listbox"` and then opens a dialog is
    // lying about its own popup. The listbox role belongs to the list inside.
    provideBrnPopoverDefaultOptions({ role: null }),
  ],
  host: {
    'data-slot': 'combobox',
    // An `aria-label` passed to this element is consumed as an input below and
    // forwarded to the input, which is the element that actually carries the
    // combobox role. Stripping it from the host stops the same name existing
    // twice, on one element that means it and one that does not.
    '[attr.aria-label]': 'null',
  },
  template: `
    <div
      brnCombobox
      brnPopover
      class="block"
      [value]="_chosen()"
      (valueChange)="_pick($event)"
      (searchChange)="filterChange.emit($event)"
      [disabled]="disabled()"
    >
      <input
        brnComboboxInput
        brnComboboxAnchor
        brnComboboxPopoverTrigger
        brnFieldControlDescribedBy
        data-slot="combobox-input"
        [closeOnTriggerClick]="false"
        [class]="_inputClass()"
        [placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel()"
        [aria-invalid]="_invalid() ? true : undefined"
        [attr.aria-controls]="_listboxId()"
        [attr.aria-activedescendant]="_activeDescendant()"
      />

      <ng-template brnPopoverContent>
        <div brnComboboxContent data-slot="combobox-panel" [class]="_panelClass()">
          @if (options().length > 0) {
            <!--
              The list carries its own name. A listbox with none is an axe
              finding (the aria-input-field-name rule) and, more to the point, a
              screen reader announcing "listbox" and nothing else. It cannot
              borrow the input's: a name taken from there is computed from the
              input's text, which is whatever the maker has typed, so the list
              would announce itself as "bees". The caller names what it offers.
            -->
            <div
              brnComboboxList
              [id]="listboxId"
              [aria-label]="listboxLabel()"
              [attr.aria-busy]="loading() ? 'true' : null"
              class="flex flex-col"
            >
              @for (option of options(); track option.value) {
                <div brnComboboxItem [value]="option" [class]="_itemClass()">
                  <span class="truncate">{{ option.label }}</span>

                  @if (option.hint) {
                    <span class="text-muted-foreground text-xs">{{ option.hint }}</span>
                  }

                  @if (option.value === _chosen()?.value) {
                    <ng-icon name="lucideCheck" aria-hidden="true" class="shrink-0 text-sm" />
                  }
                </div>
              }
            </div>
          } @else {
            <!--
              Outside the list on purpose: an empty listbox, and a paragraph
              inside one, are both malformed markup. brain makes this a polite
              live region, so a maker who types past the last match is told so
              instead of being left with a panel that quietly went blank.
            -->
            <p brnComboboxEmpty data-slot="combobox-empty" [class]="_emptyClass()">
              {{ _emptyMessage() }}
            </p>
          }
        </div>
      </ng-template>
    </div>
  `,
})
export class HlmCombobox {
  private static _id = 0;

  private readonly _field = inject(HlmField, { optional: true });

  /**
   * The options to offer, in display order.
   *
   * Taken verbatim: not sorted, not de-duplicated and not narrowed. Whatever the
   * server answered the last `filterChange` with is what a maker sees.
   */
  readonly options = input<readonly ComboboxOption[]>([]);

  /**
   * The chosen option, or `null`.
   *
   * The whole option rather than its value, because this list is one page of a
   * server's answer and the chosen row is routinely not on it — see the class
   * comment. Holding the label is what lets the control keep showing a choice it
   * can no longer look up.
   */
  readonly value = input<ComboboxOption | null>(null);

  /** A request is out. Renders as `aria-busy`, and as the empty body's wording. */
  readonly loading = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  /** What the box reads before anything is chosen or typed. */
  readonly placeholder = input('Search');

  /**
   * The accessible name for the list of matches — "Materials", "Suppliers".
   *
   * A default exists because an unnamed listbox is a defect rather than a
   * styling choice, and it is deliberately generic: a caller that means
   * something more specific says so.
   */
  readonly listboxLabel = input('Suggestions');

  readonly disabled = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  /**
   * An accessible name for the standalone case only.
   *
   * Inside an `<hlm-field>` the `<label hlmLabel>` is already associated with the
   * input and this must stay unset — two names on one control is a defect, not a
   * belt-and-braces.
   */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

  /**
   * A maker chose a row, or emptied the box. Fires on those and on nothing else
   * — never when `options` changes underneath a choice.
   */
  readonly valueChange = output<ComboboxOption | null>();

  /**
   * What the maker has typed, unthrottled and unmodified.
   *
   * The caller debounces it and turns it into a request (130 D1). It also fires
   * with `''` when the panel closes, because brain clears the query then and a
   * caller told otherwise would hold a query no longer on screen.
   */
  readonly filterChange = output<string>();

  /** Referenced by the input's `aria-controls` while the list is on the page. */
  readonly listboxId = `hlm-combobox-list-${++HlmCombobox._id}`;

  private readonly _combobox = viewChild(BrnComboboxBaseToken);
  private readonly _renderedOptions = viewChildren(BrnComboboxItemToken);

  /**
   * The option the caret is on, announced beside the one that is chosen (130 C2).
   *
   * A typeahead whose caret is silent cannot be used without sight, which is why
   * this is the task that closes C2 rather than carrying it. Both the route and
   * its upgrade risk are argued in `activeDescendantId`'s comment.
   */
  protected readonly _activeDescendant = activeDescendantId(this._combobox, this._renderedOptions);

  /**
   * `aria-controls`, but only while there is something to control.
   *
   * The list exists only inside the open overlay and only when there are options
   * to put in it, so the rendered rows are the honest test — the same signal the
   * caret reads. Pointing at an id that is not in the document would be a defect
   * a screen reader follows into nothing.
   */
  protected readonly _listboxId = computed(() =>
    this._renderedOptions().length > 0 ? this.listboxId : null,
  );

  /**
   * The option the control is showing.
   *
   * A `linkedSignal` rather than a plain read of `value()` so the two ways it can
   * move stay separate: the caller writing a new `value` resets it, a maker
   * choosing or clearing sets it. A caller that ignores `valueChange` still sees
   * a coherent control rather than a box and a list that disagree — and, the
   * point of the whole file, a change to `options` moves neither.
   */
  protected readonly _chosen = linkedSignal(() => this.value());

  /**
   * Brain's invalidity ∪ "a server refused this field", read from the one place
   * that unions them (`HlmField`). Brain's own answer derives from an Angular
   * control's validity, which cannot see a `422`: a server refusal arrives on a
   * form whose client-side validators all pass. Passing `undefined` rather than
   * `false` is what keeps this a widening — brain's own answer stands underneath,
   * including outside a field, where there is nothing here to read.
   */
  protected readonly _invalid = computed(() => this._field?.invalid() ?? false);

  protected readonly _emptyMessage = computed(() =>
    this.loading() ? COMBOBOX_SEARCHING : COMBOBOX_NO_MATCHES,
  );

  protected readonly _inputClass = computed(() =>
    hlm(
      // Deliberately the same set `HlmInput` puts on a text field, written out
      // rather than borrowed by stacking `hlmInput` on this element: that
      // directive brings its own `BrnInput`, which would register a second
      // labelable and a second generated id against the one `BrnCombobox`
      // already registers. Two answers to "which element does the label name?"
      // is worse than four repeated utilities.
      'lore-ctl block w-full cursor-text text-start font-normal select-text',
      'border-input bg-background text-foreground placeholder:text-muted-foreground',
      // The colour half of the invalid state, and only the half: the messages
      // render as text under the control and `aria-invalid` is what a screen
      // reader announces, so nothing here is carried by hue alone.
      'aria-[invalid=true]:border-destructive',
    ),
  );

  protected readonly _panelClass = computed(() =>
    hlm(
      // The same surface as the menu, the dialog and the unit select: an overlay
      // above the page sits on --popover (030 D7), with the hairline the rest of
      // the app draws.
      'ring-border bg-popover text-popover-foreground rounded-lg p-1 shadow-md ring-1 outline-none',
      // brain measures the input and publishes its width here, so the panel is
      // never narrower than the control it belongs to.
      'min-w-(--brn-combobox-width) max-h-64 overflow-x-hidden overflow-y-auto',
      // Behind `motion-safe:`, which is the prefers-reduced-motion contract the
      // shell is held to (030 P4.2).
      'motion-safe:data-open:animate-in motion-safe:data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 duration-100',
    ),
  );

  protected readonly _itemClass = computed(() =>
    hlm(
      'relative flex w-full cursor-default items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none',
      // `data-highlighted` is what brain's key manager writes as the caret moves,
      // so the keyboard caret and the pointer hover land on one treatment.
      'hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
    ),
  );

  protected readonly _emptyClass = computed(() => hlm('text-muted-foreground px-2 py-1.5 text-sm'));

  constructor() {
    classes(() => 'block w-full');
  }

  /**
   * A maker took a row, or emptied the box.
   *
   * Guarded against re-announcing what the control is already showing, so a
   * caller treating `valueChange` as "the maker changed something" is not told a
   * change happened when one did not. `undefined` cannot arrive from brain and
   * is refused rather than forwarded as a clear, because "no choice" has one
   * spelling here and it is `null`.
   *
   * ## Why taking a row shuts the panel from here, one turn late
   *
   * Measured against brain 1.3.0, and worth writing down because the shape is
   * not guessable: `BrnComboboxInput`'s own Enter handler commits the row, which
   * shuts the panel, and then **re-reads whether the panel is open and re-opens
   * it** — two branches of one handler, three lines apart, with the second
   * reacting to what the first just did. Left to itself the panel therefore
   * springs back open on the Enter that chose a row, with its query cleared.
   *
   * So `closeOnSelect` is off, brain never shuts it mid-handler, and the shutting
   * happens here instead — deferred by exactly one microtask, so that brain's
   * handler has finished reading its own state before this changes it. Anything
   * sooner is the same race from the other side. Clearing the box is deliberately
   * **not** a commit that shuts anything: a maker who empties the field is still
   * typing and still wants the list.
   *
   * This repository does not patch `node_modules` (`030` C3, 130 D2), so this is
   * a composition around the defect and is worth an upstream issue on the same
   * ground as 130 C1 and C2. Delete it, and restore `closeOnSelect`, when that
   * handler stops re-opening what it closed.
   */
  protected _pick(option: ComboboxOption | null | undefined): void {
    if (option === undefined) {
      return;
    }
    if ((option?.value ?? null) === (this._chosen()?.value ?? null)) {
      return;
    }
    this._chosen.set(option);
    this.valueChange.emit(option);

    if (option !== null) {
      queueMicrotask(() => this._combobox()?.close());
    }
  }
}
