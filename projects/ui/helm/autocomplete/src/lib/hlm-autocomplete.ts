import { ActiveDescendantKeyManager, type Highlightable } from '@angular/cdk/a11y';
import { type BooleanInput } from '@angular/cdk/coercion';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  effect,
  inject,
  Injector,
  input,
  model,
  output,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { injectElementSize } from '@spartan-ng/brain/core';
import {
  BrnPopover,
  BrnPopoverContent,
  provideBrnPopoverConfig,
  provideBrnPopoverDefaultOptions,
} from '@spartan-ng/brain/popover';
import { HlmInput } from '@lore/ui/helm/input';
import { classes, hlm } from '@lore/ui/helm/utils';

/** One completion row: `label` is what the row reads, `detail` a muted second part. */
export interface AutocompleteOption {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

/** A row as CDK's key manager sees it; the highlight is drawn from `_active`, not from these. */
interface Row extends Highlightable {
  readonly index: number;
}

/**
 * A free-text input that offers completions for the text the caller owns (plan 960 D10).
 *
 * ```html
 * <label hlmLabel [for]="textId">What do you want to do?</label>
 * <hlm-autocomplete
 *   [inputId]="textId"
 *   [text]="text()"
 *   [options]="rows()"
 *   [(open)]="listOpen"
 *   listboxLabel="Unit suggestions"
 *   (textChange)="text.set($event)"
 *   (caretChange)="caret.set($event)"
 *   (accept)="splice($event)"
 *   (keydown)="key($event)"
 * />
 * ```
 *
 * The text is the value, so the control never writes it: `accept` hands the row over, the
 * caller splices and passes the new `text` back, then calls `setCaret`. `options` render
 * verbatim, in the order given, with nothing sieved, sorted or merged.
 *
 * Built on CDK's `ActiveDescendantKeyManager` and brain's popover. Brain's
 * `BrnAutocompleteSearch` is not the base: its input writes its own value, takes a row by
 * replacing the text with the label, and prevents the default action of every Enter.
 *
 * With the list on the page it consumes ArrowDown/ArrowUp/Home/End (move and wrap), Enter
 * on a highlight, Tab (the highlight, else the first row) and Escape (close). A consumed
 * key is default-prevented and stopped, so a dialog around it stays open and the caller's
 * `(keydown)` sees only the keys it did not take. Nothing is highlighted until an arrow
 * key is pressed, so Enter after typing reaches the caller.
 */
@Component({
  selector: 'hlm-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrnPopover, BrnPopoverContent, HlmInput],
  providers: [
    provideBrnPopoverConfig({ align: 'start', sideOffset: 4 }),
    // The listbox inside carries the role. Opening and closing are this control's alone,
    // and focus stays in the input throughout.
    provideBrnPopoverDefaultOptions({
      role: null,
      autoFocus: false,
      closeOnOutsidePointerEvents: false,
      disableClose: true,
    }),
  ],
  host: {
    'data-slot': 'autocomplete',
    // Forwarded to the input, which carries the combobox role; not left on the host too.
    '[attr.aria-label]': 'null',
  },
  template: `
    <div brnPopover [state]="_state()" [attachTo]="field" class="block">
      <input
        #field
        hlmInput
        type="text"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        data-slot="autocomplete-input"
        [id]="inputId()"
        [value]="text()"
        [disabled]="disabled()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-expanded]="_shown()"
        [attr.aria-controls]="_shown() ? listboxId : null"
        [attr.aria-activedescendant]="_activeId()"
        (input)="_onInput()"
        (keydown)="_onKeydown($event)"
        (keyup)="_reportCaret()"
        (click)="_reportCaret()"
        (focusout)="_close()"
      />

      <ng-template brnPopoverContent>
        <!-- Pressing a row must not take focus out of the input. -->
        <div
          data-slot="autocomplete-panel"
          [class]="_panelClass"
          [style.--hlm-autocomplete-width.px]="_width()?.width"
          (mousedown)="$event.preventDefault()"
        >
          <div
            role="listbox"
            class="flex flex-col"
            [id]="listboxId"
            [attr.aria-label]="listboxLabel()"
            [attr.aria-busy]="loading() ? 'true' : null"
          >
            @for (option of options(); track $index) {
              <div
                #row
                role="option"
                [id]="listboxId + '-' + $index"
                [attr.aria-selected]="$index === _active()"
                [attr.data-highlighted]="$index === _active() ? '' : null"
                [class]="_optionClass"
                (click)="_take(option)"
              >
                <span class="truncate">{{ option.label }}</span>
                @if (option.detail) {
                  <span class="text-muted-foreground shrink-0 text-xs">{{ option.detail }}</span>
                }
              </div>
            }
          </div>
        </div>
      </ng-template>
    </div>
  `,
})
export class HlmAutocomplete {
  private static _id = 0;

  private readonly _injector = inject(Injector);

  /** The input's value. The control renders it and never changes it. */
  readonly text = input('');

  /** The rows to offer, rendered verbatim: not sorted, not de-duplicated, not narrowed. */
  readonly options = input<readonly AutocompleteOption[]>([]);

  /** Whether the list may show. It shows only while there are rows; Escape and leaving the input set it `false`. */
  readonly open = model(false);

  /** A request is out; rendered as `aria-busy` on the list. */
  readonly loading = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  /** The listbox's accessible name, e.g. "Unit suggestions". */
  readonly listboxLabel = input('Suggestions');

  /** Tab takes the highlighted row, or the first, while the list shows. */
  readonly acceptOnTab = input<boolean, BooleanInput>(true, { transform: booleanAttribute });

  readonly disabled = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  /** The input's id, for a `<label for>` outside an `hlm-field`. */
  readonly inputId = input(`hlm-autocomplete-input-${++HlmAutocomplete._id}`);

  /** A name for the standalone case only; inside an `hlm-field` the label names the input. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

  /** What the user typed, unmodified. */
  readonly textChange = output<string>();

  /** The caret moved (typing, arrows, Home, End, a click). Not emitted for `setCaret`, nor before its caret lands. */
  readonly caretChange = output<number>();

  /** A row was taken by Enter, Tab or a click. The caller splices; the text is not touched here. */
  readonly accept = output<AutocompleteOption>();

  readonly listboxId = `hlm-autocomplete-list-${HlmAutocomplete._id}`;

  private readonly _field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly _rows = viewChildren<ElementRef<HTMLElement>>('row');

  private readonly _items = computed<readonly Row[]>(() =>
    this.options().map((_, index) => ({
      index,
      setActiveStyles() {
        /* drawn from `_active` */
      },
      setInactiveStyles() {
        /* drawn from `_active` */
      },
    })),
  );

  private readonly _keys = new ActiveDescendantKeyManager<Row>(this._items, this._injector)
    .withVerticalOrientation()
    .withHomeAndEnd()
    .withWrap();

  /** The last caret reported or set, so an unchanged caret is not reported twice. */
  private _caret = -1;

  /** A `setCaret` has not landed: the input still holds the old text and caret, so a read is stale. */
  private _placing = false;

  protected readonly _width = injectElementSize();

  protected readonly _state = computed(() =>
    this.open() && !this.disabled() && this.options().length > 0 ? 'open' : 'closed',
  );

  /** The listbox is in the document. Read off the rendered rows, so no attribute names a missing id. */
  protected readonly _shown = computed(() => this._rows().length > 0);

  /** The highlighted row's index, or -1; a row from an earlier `options` is no highlight. */
  protected readonly _active = computed(() => {
    const row = this._keys.activeItem;
    return this._shown() && row !== null && this._items().includes(row) ? row.index : -1;
  });

  protected readonly _activeId = computed(() => {
    const index = this._active();
    return index < 0 ? null : `${this.listboxId}-${index}`;
  });

  protected readonly _panelClass = hlm(
    // The surface the combobox and the menus use: --popover, with the app's hairline.
    'ring-border bg-popover text-popover-foreground rounded-lg p-1 shadow-md ring-1 outline-none',
    'min-w-(--hlm-autocomplete-width) max-h-64 overflow-x-hidden overflow-y-auto',
    // Entry only: an exit animation keeps the overlay attached, and an Escape pressed in
    // that window would be routed to it instead of to the dialog around the input.
    'motion-safe:data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 duration-100',
  );

  protected readonly _optionClass = hlm(
    'relative flex w-full cursor-default items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none',
    // Hover is a neutral fill and never the highlight, so only the keyboard's row takes --accent.
    'hover:bg-muted data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
  );

  constructor() {
    classes(() => 'block w-full');

    // A new list, or one newly shown, starts with nothing highlighted.
    effect(() => {
      this._items();
      this._shown();
      untracked(() => this._keys.setActiveItem(-1));
    });

    afterRenderEffect(() => {
      const index = this._active();
      if (index >= 0) {
        this._rows()[index]?.nativeElement.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /** Focuses the input and puts the caret at `position` once the current `text` is rendered. */
  setCaret(position: number): void {
    this._caret = position;
    this._placing = true;
    afterNextRender(
      {
        write: () => {
          const field = this._field().nativeElement;
          field.focus();
          field.setSelectionRange(position, position);
          this._placing = false;
        },
      },
      { injector: this._injector },
    );
  }

  protected _onInput(): void {
    this.textChange.emit(this._field().nativeElement.value);
    this._reportCaret();
  }

  protected _reportCaret(): void {
    if (this._placing) {
      return;
    }
    const field = this._field().nativeElement;
    const caret =
      (field.selectionDirection === 'backward' ? field.selectionStart : field.selectionEnd) ??
      field.value.length;
    if (caret !== this._caret) {
      this._caret = caret;
      this.caretChange.emit(caret);
    }
  }

  protected _onKeydown(event: KeyboardEvent): void {
    if (
      !this._shown() ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        this._keys.setNextItemActive();
        break;
      case 'ArrowUp':
        this._keys.setPreviousItemActive();
        break;
      case 'Home':
        this._keys.setFirstItemActive();
        break;
      case 'End':
        this._keys.setLastItemActive();
        break;
      case 'Enter': {
        const index = this._active();
        if (index < 0) {
          return;
        }
        this._take(this.options()[index]);
        break;
      }
      case 'Tab': {
        if (!this.acceptOnTab()) {
          return;
        }
        this._take(this.options()[Math.max(this._active(), 0)]);
        break;
      }
      case 'Escape':
        this._close();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  protected _take(option: AutocompleteOption): void {
    this._keys.setActiveItem(-1);
    this.accept.emit(option);
  }

  protected _close(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }
}
