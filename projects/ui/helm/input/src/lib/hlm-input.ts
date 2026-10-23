import { BooleanInput } from '@angular/cdk/coercion';
import {
  afterRenderEffect,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  Renderer2,
} from '@angular/core';
import { BrnFieldControl, BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
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
 * `textarea[hlmInput]` is the family's textarea (`hlmTextarea` is deprecated)
 * because it is the same control: the same brain primitive, the same tokens, the
 * same field wiring, differing only in whether it wraps. `select[hlmInput]` is
 * here because lore-dam's forms already put the directive on native selects, and
 * a select holds a value the same way — the field registration and invalid story
 * apply unchanged. `<div hlmInput>` is not supported and never will be — brain
 * cannot make a div hold a value.
 *
 * ## `aria-invalid` is written here, not left to brain
 *
 * `BrnInput` derives `aria-invalid` from the Angular control's validity alone,
 * which cannot see a `422`: a server refusal arrives on a form whose client-side
 * validators all pass. Inside a field this reads `HlmField.invalid()` — brain's
 * answer *unioned* with "this field has messages". Outside a field the caller's
 * `[aria-invalid]` input decides, falling back to brain's control validity.
 *
 * Pass it as `[aria-invalid]`, never `[attr.aria-invalid]`: an attribute binding
 * feeds no input, and brain's host binding overwrites it on first render. The
 * same holds for `[aria-describedby]`. The write is an after-render effect that
 * also tracks brain's signal, so it lands after brain's host binding every time
 * brain rewrites the attribute.
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
  },
})
export class HlmInput {
  private readonly _field = inject(HlmField, { optional: true });
  private readonly _control = inject(BrnFieldControl);
  private readonly _isTextarea =
    inject(ElementRef<HTMLElement>).nativeElement.tagName === 'TEXTAREA';
  private readonly _isSelect =
    inject(ElementRef<HTMLElement>).nativeElement.tagName === 'SELECT';
  // Read once, like the tag: a `[type]` binding that later turns to "file" is not followed.
  private readonly _isFile =
    (inject(ElementRef<HTMLElement>).nativeElement as HTMLInputElement).type === 'file';

  /** The caller's invalid state; outside a field it wins over brain's. Unset defers. */
  readonly ariaInvalid = input<boolean | undefined, BooleanInput>(undefined, {
    alias: 'aria-invalid',
    transform: (value: BooleanInput) => (value == null ? undefined : booleanAttribute(value)),
  });

  protected readonly _invalid = computed(() => {
    const own = this.ariaInvalid();
    if (this._field) return this._field.invalid() || own === true;
    return own ?? this._control.invalid() ?? false;
  });

  constructor() {
    const renderer = inject(Renderer2);
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    afterRenderEffect({
      write: () => {
        // Tracked so brain's own rewrite of the attribute re-triggers this one.
        this._control.invalid();
        if (this._invalid()) renderer.setAttribute(host, 'aria-invalid', 'true');
        else renderer.removeAttribute(host, 'aria-invalid');
      },
    });

    classes(() => [
      // `.lore-ctl` (theme/components.css) is the shared control contract and
      // carries the height, the radius, the type ramp, the focus ring and the
      // disabled story — one place to retune every control in the lore family.
      // The utilities below are the corrections a *text* control needs against a
      // base written for buttons: a button centres one word and refuses a text
      // caret, a field is a full-width writing surface. A select and a file input
      // are pickers, not writing surfaces, so they keep the pointer. Both branches
      // restate the disabled pointer because the utilities layer outranks
      // `.lore-ctl:disabled`.
      'block w-full text-start font-normal disabled:cursor-not-allowed',
      this._isSelect || this._isFile ? 'cursor-pointer select-none' : 'cursor-text select-text',
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
      // The browser's file button becomes a quiet sm-height key inset in the
      // control: the block padding centres it at either density (md less sm,
      // less the 1px hairline, halved). Secondary pair at rest, accent on hover.
      this._isFile
        ? 'ps-[calc(var(--space)*1)] py-[calc((var(--control-h-md)-var(--control-h-sm))/2-1px)] ' +
          'file:me-[calc(var(--space)*3)] file:h-(--control-h-sm) file:rounded-sm ' +
          'file:px-[calc(var(--space)*3)] file:font-medium file:cursor-pointer ' +
          'file:bg-secondary file:text-secondary-foreground ' +
          'enabled:hover:file:bg-accent enabled:hover:file:text-accent-foreground ' +
          'disabled:file:cursor-not-allowed'
        : '',
    ]);
  }
}
