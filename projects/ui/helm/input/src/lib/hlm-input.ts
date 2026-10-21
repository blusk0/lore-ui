import { computed, Directive, ElementRef, inject } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnInput } from '@spartan-ng/brain/input';
import { HlmField } from '@lore/ui/helm/field';
import { classes } from '@lore/ui/helm/utils';

/**
 * The plain text control, on the design system's own `.lore-ctl` metrics.
 *
 * `BrnInput` supplies the parts a form must not hand-write: the generated id, the
 * registration that lets `HlmLabel` resolve its `for`, and the control-state
 * mirror (`data-touched`, `data-dirty`). `BrnFieldControlDescribedBy` supplies
 * `aria-describedby`, merging the field's hint and messages with any ids the
 * caller passes itself.
 *
 * ## Why the selector names three elements
 *
 * `textarea[hlmInput]` is here rather than only in `@lore/ui/helm/textarea`
 * because it is the same control: the same brain primitive, the same tokens, the
 * same field wiring, differing only in whether it wraps. `select[hlmInput]` is
 * here because lore-dam's forms already put the directive on native selects, and
 * a select holds a value the same way — the field registration and invalid story
 * apply unchanged. `<div hlmInput>` is not supported and never will be — brain
 * cannot make a div hold a value.
 *
 * ## `aria-invalid` is bound here, not left to brain
 *
 * `BrnInput` derives `aria-invalid` from the Angular control's validity alone,
 * which cannot see a `422`: a server refusal arrives on a form whose client-side
 * validators all pass. The binding below reads `HlmField.invalid()` — brain's
 * answer *unioned* with "this field has messages" — so it can only widen what
 * `BrnInput` wrote, never narrow it. Outside a field there is nothing to read and
 * brain's own binding stands.
 */
@Directive({
  selector: 'input[hlmInput], textarea[hlmInput], select[hlmInput]',
  hostDirectives: [
    { directive: BrnInput, inputs: ['id', 'forceInvalid'] },
    { directive: BrnFieldControlDescribedBy, inputs: ['aria-describedby'] },
  ],
  host: {
    'data-slot': 'input',
    class: 'lore-ctl',
    '[attr.aria-invalid]': '_invalid() ? "true" : null',
  },
})
export class HlmInput {
  private readonly _field = inject(HlmField, { optional: true });
  private readonly _isTextarea =
    inject(ElementRef<HTMLElement>).nativeElement.tagName === 'TEXTAREA';
  private readonly _isSelect =
    inject(ElementRef<HTMLElement>).nativeElement.tagName === 'SELECT';

  protected readonly _invalid = computed(() => this._field?.invalid() ?? false);

  constructor() {
    classes(() => [
      // `.lore-ctl` (theme/components.css) is the shared control contract and
      // carries the height, the radius, the type ramp, the focus ring and the
      // disabled story — one place to retune every control in the lore family.
      // The utilities below are the corrections a *text* control needs against a
      // base written for buttons: a button centres one word and refuses a text
      // caret, a field is a full-width writing surface. A select is a picker,
      // not a writing surface, so it keeps the pointer. Both branches restate the
      // disabled pointer because the utilities layer outranks `.lore-ctl:disabled`.
      'block w-full text-start font-normal disabled:cursor-not-allowed',
      this._isSelect ? 'cursor-pointer select-none' : 'cursor-text select-text',
      // Painted from the semantic surface tokens rather than from the
      // variant matrix's --vc channels: solid/soft/outlined/plain is an
      // *emphasis* axis for an actionable control, and a text field has no
      // emphasis. So: the input hairline, the page surface, foreground ink.
      'border-input bg-background text-foreground placeholder:text-muted-foreground',
      // The colour half of the invalid state. It is deliberately not the only
      // half: the messages render as text under the control and `aria-invalid`
      // above is what a screen reader announces, so nothing here is carried by
      // hue alone.
      //
      // NB Tailwind v4 detects candidates by scanning source TEXT, not the module
      // graph, so an ordinary English word in a comment that happens to name a
      // utility mints a rule in styles.css. Saying "the colour half" rather than
      // the obvious adjective above is what stopped this block from shipping a
      // stray `visibility` rule nothing renders.
      'aria-[invalid=true]:border-destructive',
      this._isTextarea ? 'h-auto min-h-16 resize-y py-2 whitespace-pre-wrap' : '',
    ]);
  }
}
