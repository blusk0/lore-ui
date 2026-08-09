import { Directive, effect, inject, input } from '@angular/core';
import { BrnFieldA11yService } from '@spartan-ng/brain/field';
import { classes } from '@lore/ui/helm/utils';

/**
 * The field's hint — the standing "what goes in here" text, as opposed to the
 * messages, which are what came back when it was wrong.
 *
 * It registers its own id with the field's `BrnFieldA11yService`, which is what
 * puts it in the control's `aria-describedby`. Registration is the reason this
 * is a directive at all rather than a bare `<p class="…">`: a hint a sighted
 * maker can read and a screen-reader user cannot is the failure mode.
 *
 * Projected content is declared inside `<hlm-field>` in the *consumer's*
 * template, so its element injector's parent is the field's — which is how this
 * reaches the service `BrnField` provides one element up.
 */
@Directive({
  selector: '[hlmFieldDescription]',
  host: {
    'data-slot': 'field-description',
    '[id]': 'id()',
  },
})
export class HlmFieldDescription {
  private static _id = 0;

  private readonly _a11y = inject(BrnFieldA11yService, { optional: true });

  /** Overridable, but the generated default is what a form should normally use. */
  readonly id = input(`hlm-field-description-${++HlmFieldDescription._id}`);

  constructor() {
    classes(() => 'text-muted-foreground text-xs');

    const a11y = this._a11y;
    if (a11y) {
      effect((onCleanup) => {
        const id = this.id();
        a11y.registerDescription(id);
        onCleanup(() => a11y.unregisterDescription(id));
      });
    }
  }
}
