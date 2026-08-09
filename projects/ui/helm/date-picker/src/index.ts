import { HlmDatePicker } from './lib/hlm-date-picker';

export * from './lib/date-only';
export * from './lib/hlm-date-picker';

/**
 * One component, so the array is a formality — it exists because every other
 * primitive here exposes one and a caller should not have to remember which.
 *
 * ## Why this entry point exists and `@lore/ui/helm/calendar` does not
 *
 * P1.1 provisioned nine `paths` aliases in anticipation, and two of them were
 * this task's to settle: `date-picker` and `calendar`. **This task vendors
 * `date-picker/` and does not vendor `calendar/`** — the grid is composed from
 * brain's calendar directives inside this component's own panel, exactly as the
 * unit select and the combobox compose brain's select and popover rather than
 * vendoring wrappers around them.
 *
 * There is no `HlmCalendar` beside this because nothing has asked for a calendar
 * on its own. `030` C5's precedent is to leave a shape unbuilt until it has a
 * consumer rather than design it from zero, and the pieces to lift are all in
 * `hlm-date-picker.ts` when one arrives. So `@lore/ui/helm/calendar` still
 * resolves to a folder that does not exist, which makes it **false
 * documentation** — it tells a reader this repository vendors a component it
 * does not have — and it is P3.3's to prune, on exactly the same ground as
 * `popover`.
 *
 * ## Why the barrel is its own rather than an existing one
 *
 * The barrel a component is exported from is a chunking decision, which P3.1
 * learned by nearly shipping the opposite: exported from `@lore/ui/helm/input`
 * for the sake of its left half, the quantity control pulled brain's select and
 * popover into the module graph of every route that imports a text input, and
 * esbuild hoisted 33.4 kB out of one route's chunk into the set they all load —
 * while the reported initial total went *down*.
 *
 * This component reaches brain's calendar, which itself reaches brain's select,
 * so it is the heaviest single import in this directory. Its own entry point is
 * therefore the narrowest possible edge: a route pays for the date picker if and
 * only if it imports the date picker. The alias was already provisioned, so this
 * costs no change to `client/tsconfig.json` — which is `build-tooling`'s file
 * and not this agent's.
 */
export const HlmDatePickerImports = [HlmDatePicker] as const;
