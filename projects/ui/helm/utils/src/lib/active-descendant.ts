import { computed, type Signal } from '@angular/core';

/**
 * The one answer to "which option is the caret on?", for every listbox in this
 * design system (plan 130 C2).
 *
 * ## The gap this closes, stated exactly
 *
 * `BrnSelectTrigger` and `BrnComboboxInput` both carry the whole listbox
 * keyboard contract — `role="combobox"`, `aria-haspopup="listbox"`,
 * `aria-expanded`, arrows/Home/End/wrap, Enter to commit, Escape to dismiss,
 * `role="option"` with `aria-selected` per item — and **neither binds
 * `aria-activedescendant`**. So while a maker arrows down the list, a screen
 * reader announces the *chosen* option rather than the *caret's*: the list moves
 * and the announcement does not. It is not an axe finding, because the attribute
 * is optional in the pattern, which is precisely why it needs writing down
 * rather than leaving to be discovered.
 *
 * ## The route taken, and what it costs
 *
 * Both primitives publish the caret through an `ActiveDescendantKeyManager` on
 * the object their injection token hands out — `BrnSelectBase.keyManager` and
 * `BrnComboboxBase.keyManager`. Those two interfaces are exported, and are what
 * `injectBrnSelectBase()` / `injectBrnComboboxBase()` are documented to return.
 * The manager itself is `@angular/cdk/a11y`, where `activeItem` is public API,
 * and it is signal-backed, so the `computed` below tracks it without a
 * subscription to unwind.
 *
 * **The honest caveat:** the concrete classes tag `keyManager` `@internal` even
 * though the interfaces do not, so this reads something upstream would rather we
 * did not. Two things bound the risk. Nothing here writes — the caret is moved
 * only by brain, from the key events brain already handles. And the day either
 * interface drops the member, this stops **compiling**, which is the loud
 * failure rather than the quiet one. The alternative was to leave a typeahead
 * whose caret is silent, which is a control that cannot be used without sight.
 * When brain binds the attribute itself, delete this file and the two callers.
 *
 * ## Why membership is checked rather than assumed
 *
 * `ListKeyManager` does not clear its caret when the item it points at is
 * destroyed — it only re-indexes items it still finds. A combobox re-stocked
 * from the server while its panel is open therefore leaves the manager holding
 * an option that is no longer on the page, and pointing `aria-activedescendant`
 * at an id that is not in the document is worse than pointing at nothing. So the
 * caret is reported only while the item is among the ones the caller is actually
 * rendering. That check also covers the closed panel for free: overlay content is
 * torn down on close, so the rendered set is empty and this answers `null`.
 */

/** What both brain listbox items give us: a DOM id, as a signal. */
export interface HlmActiveDescendantItem {
  readonly id: Signal<string>;
}

/** The shape `BrnSelectBase` and `BrnComboboxBase` both already satisfy. */
export interface HlmActiveDescendantSource<TItem> {
  readonly keyManager: { readonly activeItem: TItem | null };
}

/**
 * The id to publish as `aria-activedescendant`, or `null` when the caret is
 * nowhere.
 *
 * @param source the brain listbox, as a `viewChild` of its base token
 * @param rendered the options currently on the page, as a `viewChildren` of the
 *   item token — identity-compared, so no id scheme has to be invented
 */
export function activeDescendantId<TItem extends HlmActiveDescendantItem>(
  source: Signal<HlmActiveDescendantSource<TItem> | undefined>,
  rendered: Signal<readonly TItem[]>,
): Signal<string | null> {
  return computed(() => {
    const caret = source()?.keyManager.activeItem ?? null;
    if (caret === null) {
      return null;
    }
    return rendered().includes(caret) ? caret.id() : null;
  });
}
