import { HlmCombobox } from './lib/hlm-combobox';

export * from './lib/hlm-combobox';

/**
 * One component, so the array is a formality — it exists because every other
 * primitive here exposes one and a caller should not have to remember which.
 *
 * There is deliberately no multi-select variant beside it. Brain ships
 * `BrnComboboxMultiple` and the chip primitives, so it stays one file away
 * whenever a screen needs it; no screen in `140` does — choosing *one* material
 * out of hundreds is the case — and building it now would be designing from zero
 * consumers, which is what `030` C5 and `130`'s first open question both refuse.
 */
export const HlmComboboxImports = [HlmCombobox] as const;
