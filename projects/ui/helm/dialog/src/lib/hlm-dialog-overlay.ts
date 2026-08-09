import { computed, Directive, effect, input, untracked } from '@angular/core';
import { injectCustomClassSettable } from '@spartan-ng/brain/core';
import { BrnDialogOverlay } from '@spartan-ng/brain/dialog';
import { hlm } from '@lore/ui/helm/utils';
import type { ClassValue } from 'clsx';

/**
 * The scrim. Generated as `bg-black/10`; retuned onto the lore semantics —
 * a scrim has to *darken* in both themes, and there is no single token that
 * does, so each theme dims toward its own darkest value: light toward
 * --foreground (warm gray-900), dark toward --background (gray-950, darker
 * than the --popover the dialog itself sits on, which is what makes the
 * dialog lift). The `dark:` variant is the preset's own
 * `@custom-variant dark (&:is(.dark *))`, so this tracks the same `dark`
 * class on <html> that ThemeStore toggles — no second mechanism.
 */
export const hlmDialogOverlayClass = hlm(
  'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 isolate bg-foreground/10 dark:bg-background/60 duration-100 supports-backdrop-filter:backdrop-blur-xs',
);

@Directive({
  selector: '[hlmDialogOverlay],hlm-dialog-overlay',
  hostDirectives: [BrnDialogOverlay],
})
export class HlmDialogOverlay {
  private readonly _classSettable = injectCustomClassSettable({ optional: true, host: true });

  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() => hlm(hlmDialogOverlayClass, this.userClass()));

  constructor() {
    effect(() => {
      const newClass = this._computedClass();
      untracked(() => this._classSettable?.setClassToCustomElement(newClass));
    });
  }
}
