import { HlmToaster } from './lib/hlm-toaster';

export * from './lib/hlm-toaster';

/**
 * One component, so the array is a formality — it exists because every other
 * primitive here exposes one and a caller should not have to remember which.
 *
 * The *service* that fires toasts is deliberately not re-exported through this
 * barrel: `LoreToast` (ui/toast/lore-toast.ts) is lore's convention layer over
 * brain, not a vendored helm primitive, and it is where 130 D6's ruling lives.
 */
export const HlmToasterImports = [HlmToaster] as const;
