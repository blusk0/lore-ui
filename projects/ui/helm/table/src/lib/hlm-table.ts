import { Directive } from '@angular/core';
import { classes } from '@lore/ui/helm/utils';

@Directive({
  selector: 'div[hlmTableContainer]',
  host: { 'data-slot': 'table-container' },
})
export class HlmTableContainer {
  constructor() {
    classes(() => 'relative w-full overflow-x-auto');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <table> element.
 */
@Directive({
  selector: 'table[hlmTable]',
  host: { 'data-slot': 'table' },
})
export class HlmTable {
  constructor() {
    // lore restyle: table type rides --text-ui-md.
    classes(() => 'w-full caption-bottom text-(length:--text-ui-md)');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <thead> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'thead[hlmTHead],thead[hlmTableHeader]',
  host: { 'data-slot': 'table-header' },
})
export class HlmTHead {
  constructor() {
    classes(() => '[&_tr]:border-b');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tbody> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tbody[hlmTBody],tbody[hlmTableBody]',
  host: { 'data-slot': 'table-body' },
})
export class HlmTBody {
  constructor() {
    classes(() => '[&_tr:last-child]:border-0');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tfoot> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tfoot[hlmTFoot],tfoot[hlmTableFooter]',
  host: { 'data-slot': 'table-footer' },
})
export class HlmTFoot {
  constructor() {
    classes(() => 'bg-muted/50 border-t font-medium [&>tr]:last:border-b-0');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tr> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tr[hlmTr],tr[hlmTableRow]',
  host: { 'data-slot': 'table-row' },
})
export class HlmTr {
  constructor() {
    classes(
      () =>
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors has-aria-expanded:bg-muted/50',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <th> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'th[hlmTh],th[hlmTableHead]',
  host: { 'data-slot': 'table-head' },
})
export class HlmTh {
  constructor() {
    // lore restyle: header row height rides the density scale (lg step). The
    // band, the padding and the micro-label type are the `.lore-table` header's
    // tokens (theme/tokens.css, tier 3), so the two tables read as one family:
    // --muted-foreground on --table-head-bg is measured there (5.12:1 / 6.22:1).
    classes(
      () =>
        'bg-(--table-head-bg) text-muted-foreground h-(--control-h-lg) px-(--table-cell-px) first:ps-(--table-edge-px) last:pe-(--table-edge-px) text-start align-middle text-(length:--table-head-text) font-semibold tracking-(--table-head-tracking) uppercase whitespace-nowrap [&:has([role=checkbox])]:pe-0',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <td> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'td[hlmTd],td[hlmTableCell]',
  host: { 'data-slot': 'table-cell' },
})
export class HlmTd {
  constructor() {
    // lore restyle: cell padding + row height ride the density scale; the
    // padding is the `.lore-table` cell's (--table-cell-*), wider at the edges so
    // a row action in the last column clears the container's border.
    // Numeric cells opt into aligned figures with the global `.tabular` class
    // (mono + tabular-nums, defined in theme/index.css) — DAM tables live on
    // aligned figures: <td hlmTd class="tabular text-right">24.6 MB</td>
    classes(
      () =>
        'px-(--table-cell-px) py-(--table-cell-py) first:ps-(--table-edge-px) last:pe-(--table-edge-px) h-(--control-h-md) align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <caption> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'caption[hlmCaption],caption[hlmTableCaption]',
  host: { 'data-slot': 'table-caption' },
})
export class HlmCaption {
  constructor() {
    classes(() => 'text-muted-foreground mt-4 text-sm');
  }
}
