import { booleanAttribute, Directive, input } from '@angular/core';
import type { LoreColor, LoreVariant } from '@lore/ui/button';

/**
 * lore's badge: a non-interactive status/label pill on the global variant
 * matrix. Renders on a <span> — if it does something when clicked it is a
 * chip, not a badge (see LoreChip).
 *
 * Spartan's badge primitive is deliberately not generated: it would introduce
 * a second variant vocabulary (default/secondary/destructive/outline) for a
 * component the matrix already solves.
 */
@Directive({
  selector: 'span[loreBadge]',
  host: {
    class: 'lore-ctl lore-chip',
    '[attr.data-variant]': 'variant()',
    '[attr.data-color]': 'color()',
    '[attr.data-suggested]': 'suggested() ? "true" : null',
  },
})
export class LoreBadge {
  readonly variant = input<LoreVariant>('soft');
  readonly color = input<LoreColor>('neutral');

  /**
   * Marks the badge as machine-suggested and not yet confirmed by a human —
   * renders the dashed border that means "reviewable" across lore.
   */
  readonly suggested = input(false, { transform: booleanAttribute });
}

/**
 * lore's chip: the interactive sibling of LoreBadge (filter chips, accept /
 * reject of AI suggestions). Always a native <button> so it is focusable and
 * keyboard-operable for free.
 */
@Directive({
  selector: 'button[loreChip]',
  host: {
    class: 'lore-ctl lore-chip',
    '[attr.data-variant]': 'variant()',
    '[attr.data-color]': 'color()',
    '[attr.data-suggested]': 'suggested() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.type]': '"button"',
  },
})
export class LoreChip {
  readonly variant = input<LoreVariant>('outlined');
  readonly color = input<LoreColor>('neutral');
  readonly suggested = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
}
