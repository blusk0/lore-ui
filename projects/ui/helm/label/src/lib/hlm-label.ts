import { Directive } from '@angular/core';
import { BrnLabel } from '@spartan-ng/brain/label';
import { classes } from '@lore/ui/helm/utils';

/**
 * A form label, on a real `<label>`.
 *
 * The selector is narrowed to `label[hlmLabel]` on purpose — the same narrowing
 * `LoreButton` applies to `button`/`a`. A label's whole job is the programmatic
 * association between a name and a control, and a `<div hlmLabel>` cannot carry
 * it: `for` is not an attribute a div honours, and brain cannot fix that.
 *
 * `BrnLabel` supplies the association in both directions:
 *
 *   · inside an `<hlm-field>` it resolves `for` from the field's registered
 *     labelable — the control's generated id — so a form writes no ids at all;
 *   · outside one, or when a caller wants to be explicit, `for` is an input and
 *     wins over the field's answer.
 *
 * There is deliberately no second `hlmFieldLabel` directive beside this one, as
 * upstream ships. Upstream's exists to add field-aware styling; ours would be a
 * duplicate selector wrapping the identical BrnLabel, because the association is
 * already automatic — `HlmFieldImports` re-exports this one instead.
 */
@Directive({
  selector: 'label[hlmLabel]',
  hostDirectives: [{ directive: BrnLabel, inputs: ['id', 'for'] }],
  host: { 'data-slot': 'label' },
})
export class HlmLabel {
  constructor() {
    // `w-fit` so the click target is the text, not the field's full width — a
    // label that spans the row swallows clicks meant for the surface beside it.
    // No disabled treatment here: brain's field emits data-invalid/touched/dirty
    // and NOT data-disabled, so a `data-disabled:` variant would be a selector
    // that never matches. The control carries its own disabled story from
    // `.lore-ctl` (theme/components.css).
    classes(() => 'text-foreground w-fit text-sm leading-none font-medium select-none');
  }
}
