import { Directive, input } from '@angular/core';

/**
 * strong — weight 500, the default: an identifier that opens its record (a
 *          code in a list row, a lot in a detail list).
 * plain  — the surrounding weight: a secondary column, a breadcrumb trail, an
 *          external address.
 * prose  — underlined at rest: a link inside a running sentence.
 */
export type LoreLinkVariant = 'strong' | 'plain' | 'prose';

/**
 * lore's text link: a native <a> that sits in a line of text — no height, no
 * padding, no box — where `a[loreBtn]` draws a control. All appearance comes
 * from `.lore-link` in the token layer; this directive only sets the variant.
 *
 * The link takes its ink from the text around it, so it inherits whatever
 * contrast that text already measured on its surface. Inside a sentence that
 * same ink means colour cannot mark the link, so use `prose` there (WCAG
 * 1.4.1); `strong` and `plain` rely on their position — a cell, a list, a
 * trail — and are marked only on hover.
 */
@Directive({
  selector: 'a[loreLink]',
  host: {
    class: 'lore-link',
    '[attr.data-variant]': 'variant()',
  },
})
export class LoreLink {
  readonly variant = input<LoreLinkVariant>('strong');
}
