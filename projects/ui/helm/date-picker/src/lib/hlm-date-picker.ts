import { type BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  LOCALE_ID,
  output,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import {
  BrnCalendar,
  BrnCalendarGrid,
  BrnCalendarHeader,
  BrnCalendarNextButton,
  BrnCalendarPreviousButton,
  type BrnCalendarBase,
  BrnCalendarToken,
  BrnCalendarWeek,
  BrnCalendarWeekday,
  BrnCalendarCellButton,
  injectBrnCalendarI18n,
} from '@spartan-ng/brain/calendar';
import { injectDateAdapter, provideUtcDateAdapter } from '@spartan-ng/brain/date-time';
import {
  BrnFieldControl,
  BrnFieldControlDescribedBy,
  type BrnLabelable,
  provideBrnLabelable,
} from '@spartan-ng/brain/field';
import { type BrnOverlayState } from '@spartan-ng/brain/overlay';
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
  provideBrnPopoverConfig,
  provideBrnPopoverDefaultOptions,
} from '@spartan-ng/brain/popover';
import { HlmField } from '@lore/ui/helm/field';
import { classes, hlm } from '@lore/ui/helm/utils';
import { fromDateOnly, toDateOnly } from './date-only';

/** Shared per locale, because building an `Intl.DateTimeFormat` is the slow part. */
const triggerFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * What the trigger reads once a day is chosen.
 *
 * `timeZone: 'UTC'` is the same anchoring `fromDateOnly` performs and the same
 * one `BusinessDatePipe` performs on the render side. Leaving it out would let
 * the browser's own zone re-interpret a UTC-midnight instant and print the day
 * before — the whole failure this control exists to avoid, arriving through the
 * display path instead of through the model. The field set matches
 * `BusinessDatePipe`'s so that a date reads the same in a form as it does in the
 * table the form saves into.
 */
function triggerFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = triggerFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    triggerFormatters.set(locale, formatter);
  }
  return formatter;
}

/**
 * The date picker: a `YYYY-MM-DD` in, a `YYYY-MM-DD` out (130 P3.2, D4).
 *
 * ```html
 * <hlm-field [messages]="errors()['receivedOn'] ?? []">
 *   <label hlmLabel>Received on</label>
 *   <hlm-date-picker [value]="receivedOn()" (valueChange)="receivedOn.set($event)" />
 *   <p hlmFieldDescription>The day the delivery arrived.</p>
 * </hlm-field>
 * ```
 *
 * ## The model value is a string, and a `Date` never crosses the boundary
 *
 * `value` in and `valueChange` out are the string `YYYY-MM-DD` — not a `Date`,
 * not an ISO instant, not a number of milliseconds. A `Date` exists inside this
 * component because a calendar grid needs one to do arithmetic with, and it does
 * not leave in either direction.
 *
 * That is the whole design, and the reason for it is that a `DateOnly` is a
 * calendar day rather than a point in time. `2026-08-03` is the third of August
 * for the tenant, full stop; `new Date('2026-08-03')` is an *instant* that
 * reports itself as the 2nd anywhere west of Greenwich. A control that handed a
 * `Date` to a form would be handing over a value that changes meaning depending
 * on who reads it — and it would do so silently, producing a batch record dated
 * the day before rather than an error anybody could see.
 *
 * The two conversions are `fromDateOnly` and `toDateOnly`, in `date-only.ts`,
 * and they are unit-tested directly rather than only through this component:
 * arithmetic whose failure mode is a wrong number on a batch record deserves its
 * own test, run under a process timezone far east of UTC and again far west.
 *
 * ## Why `provideUtcDateAdapter()` and not `provideNativeDateAdapter()`
 *
 * The two look interchangeable in a provider list and they are not, so this is
 * the one thing to read before changing anything here.
 *
 * Brain's adapter is what every date operation in the grid goes through — which
 * day a cell holds, which cell is today, which day is selected, what an arrow
 * key adds, where a month starts. **`BrnUtcDateAdapter` reads and writes through
 * the UTC accessors** (`getUTCDate`, `Date.UTC`), so a date anchored at UTC
 * midnight stays on its own calendar day through all of it, and comes back out
 * of `toDateOnly` as the digits that went in.
 *
 * **`BrnNativeDateAdapter` reads and writes through the *local* accessors.**
 * Hand it the same UTC-midnight instant and `getDate()` answers with the
 * previous day everywhere west of Greenwich: the grid would highlight the wrong
 * cell, `startOfDay` would shift the instant, and the day that came back would
 * be the day before the one a maker clicked. Nothing would throw. The picker
 * would simply be wrong, for some users, some of the time — which is exactly the
 * shape of failure the tenant's records cannot absorb.
 *
 * UTC anchoring is also what makes this control and `BusinessDatePipe` agree:
 * the pipe anchors a `DateOnly` at UTC midnight and renders it as UTC for the
 * identical reason.
 *
 * ## The tenant timezone is deliberately not an input
 *
 * A `DateOnly` never converts, so there is nothing for a timezone to do here. A
 * timezone matters for an *instant* — which day 04:30Z fell on — and
 * `BusinessDatePipe` already owns that question. A `timeZone` input on this
 * control would be an input that must always be ignored, which is worse than no
 * input at all (130 D4).
 *
 * "Today", where it is marked in the grid, is UTC's today for the same reason:
 * it is the neutral answer for a value with no zone of its own, and it matches
 * `DEFAULT_TENANT_TIME_ZONE`. When a tenant settings service exists, that is the
 * thing to reconsider — not this component's model.
 *
 * ## What comes from brain, and what is bound beside it
 *
 * `BrnCalendar` and its cell buttons supply the whole grid contract: `role=grid`
 * with rows and gridcells, roving tabindex, arrow keys within the month,
 * Home/End to the ends of a week, PageUp/PageDown by a month, `aria-selected`
 * and `aria-disabled` per day, and a polite live region on the header so the
 * month is announced when it changes. `BrnPopover` supplies the overlay, Escape
 * through the CDK keyboard dispatcher, dismissal on an outside click and focus
 * restoration to the trigger. None of it is re-implemented.
 *
 * **130 C2 — `aria-activedescendant` — does not apply here, and that is a
 * finding rather than an omission.** The select and the combobox are listboxes:
 * DOM focus stays on the trigger or the text box while a caret moves through
 * options that never receive it, so the caret can only be announced by pointing
 * at it, and `activeDescendantId` is this design system's one answer to that. A
 * calendar is a **grid**, and the grid pattern moves *real* focus — brain gives
 * exactly one cell `tabindex="0"` and calls `focus()` on it as the arrow keys
 * move. A screen reader therefore announces the day because focus is on it.
 * Binding `aria-activedescendant` on top would be a second, contradictory claim
 * about where the caret is, on an element that is not the focused one. The
 * shared helper is not imported here on purpose.
 *
 * *Unverified here, not verified-clean* (`030` C1/C2): jsdom computes no
 * geometry and implements no top layer, so where this panel lands relative to
 * the trigger — and whether `provideSpartanHlm()`'s application-wide
 * `usePopover: false` does what it says — belongs to the browser-axe layer, not
 * to this file's spec.
 */
@Component({
  selector: 'hlm-date-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    BrnPopover,
    BrnPopoverContent,
    BrnPopoverTrigger,
    BrnCalendar,
    BrnCalendarGrid,
    BrnCalendarHeader,
    BrnCalendarNextButton,
    BrnCalendarPreviousButton,
    BrnCalendarWeek,
    BrnCalendarWeekday,
    BrnCalendarCellButton,
    BrnFieldControlDescribedBy,
  ],
  // `BrnFieldControl` is what registers the labelable below with the enclosing
  // `BrnField`, so `<label hlmLabel>` resolves its `for` to the trigger with the
  // form writing no ids — the same wiring `HlmInput` and the unit select get,
  // reached the same way they reach it.
  hostDirectives: [BrnFieldControl],
  providers: [
    provideIcons({ lucideCalendar, lucideChevronLeft, lucideChevronRight }),
    // See the class comment. This one line is the difference between a control
    // that records the day a maker clicked and one that records the day before.
    provideUtcDateAdapter(),
    provideBrnLabelable(HlmDatePicker),
    // Anchored to the trigger's start edge and lifted a hair off it, like the
    // menu, the unit select and the combobox.
    provideBrnPopoverConfig({ align: 'start', sideOffset: 4 }),
    provideBrnPopoverDefaultOptions({
      // The popover writes `role="dialog"` on the CDK overlay element, which has
      // no name to give it — an unnamed dialog is an axe finding and, worse, a
      // boundary a screen reader announces as nothing. The role is carried by
      // the panel below instead, where there is something to name it with.
      role: null,
      // Brain would send focus to the first tabbable thing in the panel, which
      // is the previous-month button: a keyboard maker would arrive one step
      // before the days and have to tab past them. `_opened` puts focus on the
      // day the grid is already sitting on instead, which is the APG behaviour
      // and the one a maker expects.
      autoFocus: false,
    }),
  ],
  host: {
    'data-slot': 'date-picker',
    // An `aria-label` written on this element is consumed as an input below and
    // forwarded to the trigger, which is the element that actually carries the
    // button role. Stripping it from the host stops the same name existing
    // twice, on one element that means it and one that does not.
    '[attr.aria-label]': 'null',
  },
  template: `
    <div
      brnCalendar
      brnPopover
      class="block"
      [date]="_date()"
      (dateChange)="_pick($event)"
      (stateChanged)="_opened($event)"
      [disabled]="disabled()"
    >
      <button
        brnPopoverTrigger
        brnFieldControlDescribedBy
        data-slot="date-picker-trigger"
        [id]="triggerId"
        [class]="_triggerClass()"
        [disabled]="disabled()"
        aria-haspopup="dialog"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-invalid]="_invalid() ? 'true' : null"
        [attr.data-placeholder]="_date() === undefined ? '' : null"
      >
        <span data-slot="date-picker-value" class="truncate">{{ _triggerLabel() }}</span>
        <ng-icon name="lucideCalendar" aria-hidden="true" class="shrink-0 text-sm" />
      </button>

      <ng-template brnPopoverContent>
        <!--
          The dialog role and its name live here rather than on the overlay
          element brain writes, because this is the element that knows what it
          is holding. aria-modal is deliberately absent: nothing is trapped,
          the page behind stays reachable, and saying otherwise would be a claim
          this popover does not honour.
        -->
        <div
          role="dialog"
          [attr.aria-label]="dialogLabel()"
          data-slot="date-picker-panel"
          [class]="_panelClass()"
        >
          <div class="flex items-center justify-between gap-1 pb-2">
            <button brnCalendarPreviousButton [class]="_navClass()">
              <ng-icon name="lucideChevronLeft" aria-hidden="true" class="text-sm" />
            </button>

            <!--
              brain makes this a polite live region, so pressing the arrows
              announces the month a maker has moved to. It is also what names
              the grid, through the aria-labelledby brain binds there.
            -->
            <div brnCalendarHeader [id]="headerId" class="text-sm font-medium">
              {{ _monthLabel() }}
            </div>

            <button brnCalendarNextButton [class]="_navClass()">
              <ng-icon name="lucideChevronRight" aria-hidden="true" class="text-sm" />
            </button>
          </div>

          <!--
            Roles rather than table markup, and the ARIA is the same either way:
            a grid holds rows, a row holds column headers and gridcells. Written
            with a table, the day buttons would each need a presentational cell
            around them purely to stop two gridcells nesting.

            aria-label is a fallback for the name, not a second one: brain
            binds aria-labelledby to the header above and that wins wherever it
            resolves. Both say the same month, which is the property that makes
            the pair safe.
          -->
          <div brnCalendarGrid [attr.aria-label]="_monthLabel()" class="flex flex-col gap-1">
            <div role="row" class="flex gap-1">
              <div
                *brnCalendarWeekday="let weekday"
                role="columnheader"
                [attr.aria-label]="_weekdayName(weekday)"
                class="text-muted-foreground flex size-8 items-center justify-center text-xs font-normal"
              >
                {{ _weekdayShort(weekday) }}
              </div>
            </div>

            <div *brnCalendarWeek="let week" role="row" class="flex gap-1">
              @for (day of week; track day.getTime()) {
                <button brnCalendarCellButton [date]="day" [class]="_dayClass()">
                  {{ _dayNumber(day) }}
                </button>
              }
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
})
export class HlmDatePicker implements BrnLabelable {
  private static _id = 0;

  private readonly _field = inject(HlmField, { optional: true });
  private readonly _locale = inject(LOCALE_ID);
  private readonly _i18n = injectBrnCalendarI18n();
  private readonly _adapter = injectDateAdapter<Date>();

  /**
   * The chosen day as `YYYY-MM-DD`, or `null`.
   *
   * Anything that is not exactly that shape reads as no value — see
   * `fromDateOnly`, which refuses an ISO instant and refuses a 30th of February
   * rather than repairing either into a day nobody asked for.
   */
  readonly value = input<string | null>(null);

  /** What the trigger reads before a day is chosen. */
  readonly placeholder = input('Pick a date');

  /** The accessible name of the panel — a dialog with no name is a defect. */
  readonly dialogLabel = input('Choose a date');

  readonly disabled = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  /**
   * An accessible name for the standalone case only.
   *
   * Inside an `<hlm-field>` the `<label hlmLabel>` is already associated with the
   * trigger and this must stay unset — two names on one control is a defect, not
   * a belt-and-braces.
   */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

  /**
   * A maker chose a day, or cleared the one that was chosen.
   *
   * Carries the string and nothing else. There is no second output carrying a
   * `Date`, and there must never be one: the moment a `Date` is reachable from
   * outside, a consumer will bind it, and the day it moves is the day nobody
   * notices.
   */
  readonly valueChange = output<string | null>();

  /** Written on the trigger so the field's label can resolve its `for` to it. */
  readonly triggerId = `hlm-date-picker-trigger-${++HlmDatePicker._id}`;

  /** Named separately so the grid's `aria-labelledby` has something stable. */
  readonly headerId = `hlm-date-picker-header-${HlmDatePicker._id}`;

  /** `BrnLabelable`: what `<label hlmLabel>` points its `for` at. */
  readonly labelableId = computed(() => this.triggerId);

  private readonly _calendar = viewChild(BrnCalendarToken);
  private readonly _popover = viewChild(BrnPopover);

  /**
   * The day the control is showing, as a string.
   *
   * A `linkedSignal` rather than a plain read of `value()` so the two ways it
   * can move stay separate: the caller writing a new `value` resets it, a maker
   * choosing a day sets it. A caller that ignores `valueChange` still sees a
   * coherent control rather than a trigger and a grid that disagree.
   */
  private readonly _chosen = linkedSignal(() => this.value());

  /**
   * The same day as a `Date`, for the grid alone.
   *
   * This is the only place a `Date` is made, and `_pick` is the only place one
   * is read. Between them the value is a string, which is the property the whole
   * file exists to hold.
   */
  protected readonly _date = computed(() => fromDateOnly(this._chosen()) ?? undefined);

  protected readonly _triggerLabel = computed(() => {
    const date = this._date();
    return date === undefined ? this.placeholder() : triggerFormatter(this._locale).format(date);
  });

  /**
   * The month the grid is showing, which is not the month that is chosen: the
   * arrows move it and brain owns it.
   *
   * `BrnCalendarBase` exposes `focusedDate` as public API and the token hands out
   * that interface, so this reads what brain publishes rather than reaching into
   * a concrete class. The cast is the token's generic argument being `unknown`;
   * this component provides the adapter, so the `T` is a `Date` by construction.
   */
  protected readonly _monthLabel = computed(() => {
    const calendar = this._calendar() as BrnCalendarBase<Date> | undefined;
    const focused = calendar?.focusedDate() ?? new Date();
    return this._i18n
      .config()
      .formatHeader(this._adapter.getMonth(focused), this._adapter.getYear(focused));
  });

  /**
   * Brain's invalidity ∪ "a server refused this field", read from the one place
   * that unions them (`HlmField`). A `422` arrives on a form whose client-side
   * validators all pass, which is what brain's own answer cannot see. Outside a
   * field there is nothing to read and this stays false.
   */
  protected readonly _invalid = computed(() => this._field?.invalid() ?? false);

  protected readonly _triggerClass = computed(() =>
    hlm(
      // `.lore-ctl` (theme/components.css) carries the height, the radius, the
      // type ramp, the focus ring and the disabled story for every control in
      // the lore family. What follows is the correction a *field* control needs
      // against a base written for buttons — the same correction `HlmInput` and
      // the unit select make, which is what keeps a date trigger, a select
      // trigger and a text input the same object on the page.
      'lore-ctl flex w-full justify-between text-start font-normal',
      'border-input bg-background text-foreground',
      // An unchosen date reads quieter than a chosen one.
      'data-[placeholder]:text-muted-foreground',
      // The colour half of the invalid state, and deliberately only the half:
      // the messages render as text under the control and `aria-invalid` is what
      // a screen reader announces, so nothing is carried by hue alone.
      'aria-[invalid=true]:border-destructive',
    ),
  );

  protected readonly _panelClass = computed(() =>
    hlm(
      // The same surface as the menu, the dialog, the unit select and the
      // combobox: an overlay above the page sits on --popover (030 D7), with the
      // hairline the rest of the app draws.
      'ring-border bg-popover text-popover-foreground rounded-lg p-3 shadow-md ring-1 outline-none',
      // Behind `motion-safe:`, which is the prefers-reduced-motion contract the
      // shell is held to (030 P4.2).
      'motion-safe:data-open:animate-in motion-safe:data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 duration-100',
    ),
  );

  protected readonly _navClass = computed(() =>
    hlm(
      'lore-ctl size-8 shrink-0 p-0',
      'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
    ),
  );

  protected readonly _dayClass = computed(() =>
    hlm(
      'flex size-8 shrink-0 cursor-default items-center justify-center rounded-md text-sm font-normal select-none',
      'hover:bg-accent hover:text-accent-foreground',
      // Every one of these is an attribute brain writes as the grid's state
      // moves, so the ink tracks the state brain maintains rather than a second
      // copy of it kept here.
      'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
      'data-[selected-single]:bg-primary data-[selected-single]:text-primary-foreground data-[selected-single]:hover:bg-primary',
      'data-[today]:bg-accent data-[today]:text-accent-foreground',
      'data-[outside]:text-muted-foreground data-[outside]:opacity-50',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
    ),
  );

  constructor() {
    classes(() => 'block w-full');
  }

  /** `Su`, `Mo`, … — what the column reads. */
  protected _weekdayShort(weekday: number): string {
    return this._i18n.config().formatWeekdayName(weekday);
  }

  /** `Sunday`, `Monday`, … — what the column is called. */
  protected _weekdayName(weekday: number): string {
    return this._i18n.config().labelWeekday(weekday);
  }

  /** The day of the month, read through the adapter so it is the UTC one. */
  protected _dayNumber(day: Date): number {
    return this._adapter.getDate(day);
  }

  /**
   * The panel opened: put focus on the day the grid is sitting on.
   *
   * `setFocusedDate` is brain's own way of moving the grid's roving tabindex and
   * the DOM focus together, and re-asking for the day it already holds is the
   * cheapest way to say "focus what is current". It is `BrnCalendarBase` API, so
   * this reads the interface the token publishes rather than a concrete class.
   */
  protected _opened(state: BrnOverlayState): void {
    if (state !== 'open') {
      return;
    }
    const calendar = this._calendar() as BrnCalendarBase<Date> | undefined;
    calendar?.setFocusedDate(calendar.focusedDate());
  }

  /**
   * A maker clicked a day, or clicked the day that was already chosen.
   *
   * The second case is brain's own toggle — `selectDate` clears a selection that
   * is picked again — and it arrives here as `undefined`, which becomes `null`.
   * That is the only way to empty this control, and it is deliberate: a separate
   * clear button would be a second affordance for something the grid already
   * does, and a control that cannot be emptied is a control that turns "I picked
   * the wrong day" into "I cannot un-pick it".
   *
   * The conversion back to a string happens here and nowhere else. Everything
   * downstream of this line is a `YYYY-MM-DD`.
   */
  protected _pick(date: Date | undefined): void {
    const next = toDateOnly(date ?? null);
    if (next === this._chosen()) {
      return;
    }

    this._chosen.set(next);
    this.valueChange.emit(next);

    // Choosing is the end of the interaction, so the panel shuts and brain
    // restores focus to the trigger. Clearing is not: a maker who has just
    // emptied the field is still looking at the month they were in.
    if (next !== null) {
      this._popover()?.close();
    }
  }
}
