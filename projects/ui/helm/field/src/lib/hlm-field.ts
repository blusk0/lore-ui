import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { BrnField, BrnFieldA11yService } from '@spartan-ng/brain/field';
import { classes } from '@lore/ui/helm/utils';

/**
 * The one wrapper every control in this design system sits inside: a label, the
 * control, an optional hint, and zero or more messages (plan 130 D3).
 *
 * ```html
 * <hlm-field [messages]="errors()['code'] ?? []">
 *   <label hlmLabel>Code</label>
 *   <input hlmInput formControlName="code" />
 *   <p hlmFieldDescription>Unique within the tenant.</p>
 * </hlm-field>
 * ```
 *
 * ## `messages` is `readonly string[]`, and that is the whole seam
 *
 * It is deliberately NOT an `ApiError` and NOT a `FieldErrors` map. `020` D3
 * sends a `422`'s validation failures as a map **keyed by field name**, and the
 * key is the contract — a client branches on keys and never on message text. So
 * the feature does the one lookup (`errors()['code']`) and this component does
 * none, which is what makes a server refusal land on the input that caused it
 * rather than in a banner at the top of the form. A wrapper that took the whole
 * map would have to be told which key it owns, i.e. the same lookup written
 * twice, and a wrapper that took an `ApiError` would drag `core/api` into `ui/`
 * — the inversion `105` C2 already calls backwards.
 *
 * ## A message is text, not a live region
 *
 * There is no `role="alert"` and no `aria-live` here, on purpose. A field
 * message appears after a server round trip, not while typing; a live region
 * would re-announce the whole field on every keystroke of the correction. The
 * message is reachable because the control points at it through
 * `aria-describedby` (brain's `BrnFieldA11yService`), which is what a screen
 * reader reads when focus lands on the control. The *form-level* alert that
 * says "this save was refused" is the live region, and it belongs to 130 P1.3.
 *
 * ## Invalidity is wider here than it is in brain
 *
 * `BrnField` derives `data-invalid` from the Angular control's own validity.
 * That cannot see a server refusal: a `422` on a form whose client-side
 * validators all pass leaves every control valid. So this component unions
 * brain's answer with "there are messages", and `HlmInput` reads the union for
 * its `aria-invalid`. The union is a superset of brain's, so the host binding
 * below can only ever widen what `BrnField` wrote, never narrow it.
 *
 * `BrnField`'s `data-invalid` *input* is deliberately not forwarded — it would
 * be a second, quieter way to say what `messages` and `forceInvalid` already
 * say, under a name identical to the attribute this component writes.
 */
@Component({
  // The attribute form (`<div hlmField>`) is lore-dam's call-site idiom for the
  // same wrapper; both forms host the same BrnField and render the same
  // messages block, so the two apps' templates meet on one class.
  selector: 'hlm-field, [hlmField]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: BrnField, inputs: ['forceInvalid'] }],
  host: {
    'data-slot': 'field',
    '[attr.data-invalid]': 'invalid() ? "true" : null',
  },
  template: `
    <ng-content />

    @if (messages().length > 0) {
      <div [id]="messagesId" data-slot="field-messages" class="flex flex-col gap-1">
        @for (message of messages(); track $index) {
          <p class="text-(--destructive-soft-fg) text-xs">{{ message }}</p>
        }
      </div>
    }
  `,
})
export class HlmField {
  private static _id = 0;

  private readonly _brnField = inject(BrnField);
  private readonly _a11y = inject(BrnFieldA11yService);

  /**
   * The messages for this field, exactly as `020` keyed them — one lookup in the
   * feature, none here. Empty is the normal case, not an error case.
   */
  readonly messages = input<readonly string[]>([]);

  /** Referenced by the control's `aria-describedby` while messages are showing. */
  readonly messagesId = `hlm-field-messages-${++HlmField._id}`;

  /**
   * Brain's invalidity ∪ "a server refused this field". Read by `HlmInput` (and,
   * later, by the select and combobox triggers) for `aria-invalid`, so exactly
   * one thing in the tree decides what invalid means.
   */
  readonly invalid = computed(
    () =>
      this.messages().length > 0 ||
      this._brnField.forceInvalid() ||
      (this._brnField.controlState()?.invalid ?? false),
  );

  constructor() {
    classes(() => 'flex w-full flex-col gap-1.5');

    // Registering the *container* id rather than one id per message keeps
    // `aria-describedby` stable while a maker fixes a field: the token list does
    // not churn as the server's answer shrinks from three messages to one.
    effect(() => {
      if (this.messages().length > 0) {
        this._a11y.registerError(this.messagesId);
      } else {
        this._a11y.unregisterError(this.messagesId);
      }
    });
  }
}
