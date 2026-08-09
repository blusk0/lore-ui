import { Directive, computed, effect, input, untracked } from '@angular/core';
import { injectCustomClassSettable } from '@spartan-ng/brain/core';
import { BrnSheetOverlay } from '@spartan-ng/brain/sheet';
import { hlm } from '@lore/ui/helm/utils';
import type { ClassValue } from 'clsx';

@Directive({
  selector: '[hlmSheetOverlay],hlm-sheet-overlay',
  hostDirectives: [BrnSheetOverlay],
})
export class HlmSheetOverlay {
  private readonly _classSettable = injectCustomClassSettable({ optional: true, host: true });
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  // Same scrim as the dialog's, and for the same reason — see the comment on
  // `hlmDialogOverlayClass`. Kept literal rather than imported from the dialog
  // lib so the two helm entry points stay independent of one another.
  protected readonly _computedClass = computed(() =>
    hlm(
      'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 isolate bg-foreground/10 dark:bg-background/60 duration-100 supports-backdrop-filter:backdrop-blur-xs',
      this.userClass(),
    ),
  );

  constructor() {
    effect(() => {
      const classValue = this._computedClass();
      untracked(() => this._classSettable?.setClassToCustomElement(classValue));
    });
  }
}
