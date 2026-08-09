import type { NumberInput } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { BrnSonnerImports, type ToastOptions, type ToasterProps } from '@spartan-ng/brain/sonner';
import { hlm } from '@lore/ui/helm/utils';
import type { ClassValue } from 'clsx';

/**
 * The toast surface, mounted **once** for the whole application (plan 130 D6).
 *
 * This is the render half only. What may be said through it, and when, is
 * `LoreToast`'s (ui/toast/lore-toast.ts) — read that file first, because the
 * rule it carries is the one this component cannot enforce.
 *
 * `BrnSonnerToaster` supplies everything that is hard about a toast queue:
 * the stacking and lift arithmetic, the hover-to-expand and swipe-to-dismiss
 * gestures, the per-toast timer that pauses while a pointer is over the stack,
 * the `alt+T` hotkey that moves focus *into* the region on request, and the
 * live-region markup on each toast. None of that is re-implemented here.
 *
 * ## What a toast announces, and how loudly, is decided per toast
 *
 * Brain renders every toast as `role="status"` + `aria-atomic="true"` with
 * `aria-live` bound to the toast's own `important` flag — `assertive` when it is
 * set, `polite` when it is not. So politeness is a property of the *message*,
 * not of the toaster, and `LoreToast` is where the two cases are ruled on. This
 * component deliberately provides no toaster-wide politeness input: one would be
 * a way to make every success interrupt.
 *
 * *Unverified here, not verified-clean* (030 C1/C2): brain writes `aria-live`
 * onto an element whose `role="status"` already implies `polite`. The explicit
 * attribute wins per ARIA, but the role/live pairing is a screen-reader
 * behaviour and jsdom cannot observe it — it belongs to the browser-axe layer,
 * along with whether a bottom-right stack overlaps a control. Brain owns that
 * markup and is an npm dependency, so the fix if one is ever needed is upstream,
 * never a patch under node_modules.
 *
 * ## Restyled onto the lore token layer, through brain's own hooks
 *
 * Brain ships its toast CSS with a light/dark palette of its own (hex and hsl
 * literals, inside the package). Every surface it actually paints is read
 * through a `var(--brn-sonner-*, fallback)` hook, so the whole of it is
 * re-pointed at the semantic tokens by the inline custom properties below —
 * which is why no colour literal appears in this file and why the toast follows
 * `.dark` without a second theme knob to keep in sync.
 *
 * `richColors` is deliberately left off. It would swap in brain's own green/red
 * toast palette — colours from outside tokens.css, and a channel a maker with a
 * colour-vision deficiency does not receive. A success and a failure are told
 * apart here by brain's icon *shape* and by the words in the message; the error
 * icon takes the destructive ink as a third, redundant channel and nothing is
 * carried by hue alone.
 */
@Component({
  selector: 'hlm-toaster',
  imports: [BrnSonnerImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-slot': 'toaster' },
  template: `
    <brn-sonner-toaster
      [class]="_computedClass()"
      [position]="position()"
      [duration]="duration()"
      [visibleToasts]="visibleToasts()"
      [toastOptions]="_computedToastOptions()"
      [style]="userStyle()"
    />
  `,
})
export class HlmToaster {
  /**
   * Where the stack sits. Bottom-right by default, as upstream — the far corner
   * from the rail and the breadcrumbs, and the corner a maker's eye is not
   * reading. Whether it lands on top of anything is a geometry question and
   * therefore not one this repository's unit layer can answer (030 C1).
   */
  readonly position = input<ToasterProps['position']>('bottom-right');

  /**
   * The default lifetime, in milliseconds. A toast that says something a maker
   * must *act* on sets its own longer one (see `LoreToast.failure`), and a toast
   * that is the only place some information exists is a bug rather than a
   * duration problem.
   */
  readonly duration = input<ToasterProps['duration'], NumberInput>(4000, {
    transform: numberAttribute,
  });

  /** How many stack before the rest queue underneath. */
  readonly visibleToasts = input<ToasterProps['visibleToasts'], NumberInput>(3, {
    transform: numberAttribute,
  });

  readonly userClass = input<ClassValue>('', { alias: 'class' });

  /**
   * The token bridge: brain's internal appearance variables, re-pointed at the
   * lore semantics. Every one of these is one of brain's documented
   * `--brn-sonner-*` hooks or the variable that hook feeds, so this is
   * composition rather than an override of package internals.
   *
   * The surface is `--popover` and not `--card`: a toast is an overlay above the
   * page, which is the same call the dialog, the menu and the sheet already make
   * (030 D7). `--border` is the hairline every other surface in the app draws,
   * and `--radius-lg` matches the table's and the dialog's corners.
   */
  readonly userStyle = input<Record<string, string>>(
    {
      '--brn-sonner-font-family': 'var(--font-sans)',
      '--brn-sonner-toast-normal-background': 'var(--popover)',
      '--brn-sonner-toast-normal-color': 'var(--popover-foreground)',
      '--brn-sonner-toast-normal-border-color': 'var(--border)',
      '--brn-sonner-border-radius': 'var(--radius-lg)',
    },
    { alias: 'style' },
  );

  /**
   * Type styling is applied to the toast element by brain's per-type class map.
   *
   * Only the *icon* takes the destructive ink, not the whole toast: the message
   * has to stay as legible as any other, and `--destructive-soft-fg` is the ink
   * the token layer already ranges over a danger surface — `text-destructive`
   * measures 4.38:1 on this surface and fails AA, which is the trap that token
   * exists for (tokens.css, and 130 P1.2 measured it).
   */
  protected readonly _computedToastOptions = computed<ToastOptions>(() => ({
    classes: {
      title: 'font-medium',
      description: 'text-xs',
      error: '[&_[data-icon]]:text-(--destructive-soft-fg)',
    },
  }));

  protected readonly _computedClass = computed(() => hlm(this.userClass()));
}
