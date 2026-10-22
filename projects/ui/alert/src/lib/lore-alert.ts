import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { classes } from '@lore/ui/helm/utils';

/**
 * How loud the alert is, and — because the two are the same decision — what it
 * is about. `danger` is the only tone that interrupts.
 */
export type LoreAlertTone = 'danger' | 'warning' | 'success' | 'info';

/** Complete literals, one per tone: Tailwind finds them by scanning this source. */
const TONE_CLASSES: Record<LoreAlertTone, string> = {
  // The wash and the ink are the pairing the token layer already measured for
  // the table's failure body: 8% of --destructive under --destructive-soft-fg is
  // 7.28:1 in light and 7.80:1 in dark. Plain `text-destructive` on the same
  // wash is 4.06:1 and fails AA, which is the trap --destructive-soft-fg was
  // created for (tokens.css).
  danger: 'border-destructive/30 bg-destructive/8 text-(--destructive-soft-fg)',
  // The same idiom on the amber hue: --warning-soft-fg on an 8% --warning wash
  // is 4.91:1 in light and 10.98:1 in dark; --warning itself there is 3.24:1.
  warning: 'border-warning/30 bg-warning/8 text-(--warning-soft-fg)',
  // --success-soft-fg on an 8% --success wash: 5.97:1 in light, 9.88:1 in dark.
  success: 'border-success/30 bg-success/8 text-(--success-soft-fg)',
  // Neutral, and deliberately not a second colour: an informational condition
  // on --muted reads as part of the page rather than as a weaker failure.
  // --foreground on --muted is the highest-contrast pair in the token set.
  info: 'border-border bg-muted text-foreground',
};

/**
 * A condition that belongs to a **page or a section**, stated in place and
 * staying there (plan 130 D6).
 *
 * It is the third of the three feedback placements, and it exists for the cases
 * the other two cannot hold:
 *
 *   · a **read** that fails renders inside the surface that failed — that is
 *     `LoreTable`'s error body, which is already built and is not replaced by
 *     this. A screen with no table (a detail page, a form) has no such body, and
 *     this is what it uses instead.
 *   · a **command** that succeeds or fails speaks and goes — `LoreToast`.
 *   · a **refusal a maker must fix stays on the form**: field messages beside
 *     the inputs that caused them (`HlmField`, D3), plus **one** of these
 *     summarising that the save was refused. The summary says *that* it was
 *     refused; the fields say *what* to fix. Do not restate the field messages
 *     here — a maker would then have to work out whether the two lists agree.
 *
 * ## The tone is an ARIA decision before it is a colour one
 *
 * `danger` renders `role="alert"` (implicitly assertive, implicitly atomic);
 * `warning`, `success` and `info` render `role="status"` (implicitly polite).
 * `warning` stays polite because it advises: it does not report a failure the
 * user must act on now, and only that earns an interruption.
 *
 * That is the whole reason this component does not simply take the lore variant
 * matrix's `color` axis like `LoreButton` and `LoreBadge` do:
 * `data-color="warning"` is a hue, and this input decides whether a
 * screen-reader user's current sentence is cut off. A component with only the
 * danger tone would be a component asserting that every page-level condition is
 * an emergency, which is the same mistake in the other direction.
 *
 * Both roles are native live regions, so **the element must be in the DOM at the
 * moment its content appears** for a screen reader to announce it. Both of the
 * shapes a caller reaches for do that:
 *
 * ```html
 * <!-- created with its content — the usual form case -->
 * @if (refused()) {
 *   <lore-alert heading="This material wasn't saved.">
 *     Fix the fields marked below and try again.
 *   </lore-alert>
 * }
 *
 * <!-- or kept mounted and filled later; the role announces the change -->
 * <lore-alert tone="info" [heading]="notice()"></lore-alert>
 *
 * <!-- advice and confirmation are coloured, but still polite -->
 * <lore-alert tone="warning" heading="This material is used by 3 open orders.">
 *   Changes apply to those orders too.
 * </lore-alert>
 * <lore-alert tone="success" heading="All 12 rows were imported." />
 * ```
 *
 * An always-mounted alert that renders *nothing* is inert and costs a maker
 * nothing, so a caller who cannot be sure of the insertion order should prefer
 * the second shape.
 *
 * ### When the caller overrides the role
 *
 * `role` replaces the tone's role on the host; the tone still picks the colour.
 * Reach for it when the box is not reporting a condition at all:
 *
 *   · `role="note"` — a static explanation that is part of the page from first
 *     render. It is not a live region, so nothing is announced; a screen reader
 *     meets it in reading order like any other paragraph. Most informational
 *     boxes that are written into the template, not inserted, are this.
 *   · `role="alert"` / `role="status"` — the live roles, for a box whose tone's
 *     colour and urgency disagree: a neutral box that must still interrupt.
 *   · `role="none"` — no role; the box is presentation around its content.
 *
 * ```html
 * <lore-alert tone="info" role="note" heading="Archived materials stay readable.">
 *   They drop out of pickers but keep their history.
 * </lore-alert>
 * <lore-alert tone="info" role="alert" heading="Your session expires in 1 minute." />
 * ```
 *
 * Unset, the tone decides, as above.
 *
 * ## State in, nothing out
 *
 * There is no retry output and no dismiss button (D1: state in, event out — and
 * here there is no state at all). A recovery affordance is projected content, so
 * it is the same `<button loreBtn>` the rest of the app uses and the feature
 * owns what it does:
 *
 * ```html
 * <lore-alert heading="Couldn't load this material.">
 *   <button loreBtn variant="outlined" size="sm" (click)="reload()">Try again</button>
 * </lore-alert>
 * ```
 */
@Component({
  selector: 'lore-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'alert',
    '[attr.role]': '_role()',
    '[attr.data-tone]': 'tone()',
  },
  template: `
    @if (heading(); as heading) {
      <p data-slot="alert-heading" class="font-medium">{{ heading }}</p>
    }

    <!--
      The body is one flex row under the heading, and carries no type of its
      own: heading and body separate by weight rather than by size, so a
      projected control (a retry button) is not sitting in text a size smaller
      than the sentence above it.
    -->
    <div data-slot="alert-body">
      <ng-content />
    </div>
  `,
})
export class LoreAlert {
  /** Danger by default: the two cases D6 names for this component are failures. */
  readonly tone = input<LoreAlertTone>('danger');

  /**
   * The one line that says what happened. Optional, because an alert whose whole
   * message is a sentence of projected content is a legitimate shape — but a
   * heading is what a maker scanning the page actually reads.
   */
  readonly heading = input<string | null>(null);

  /**
   * Overrides the tone's role — `'note'`, `'alert'`, `'status'` or `'none'`. A
   * static `role="note"` on the host binds here, so the host binding keeps it.
   */
  readonly role = input<string | null>(null);

  protected readonly _role = computed(
    () => this.role() ?? (this.tone() === 'danger' ? 'alert' : 'status'),
  );

  constructor() {
    classes(() => [
      'flex w-full flex-col gap-1 rounded-lg border p-3 text-sm',
      TONE_CLASSES[this.tone()],
    ]);
  }
}
