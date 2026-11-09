import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { BrnAccordionTrigger } from '@spartan-ng/brain/accordion';
import { classes } from '@lore/ui/helm/utils';

/**
 * A full-width row and never a `.lore-ctl`, so the press does not move it. Its text
 * starts at the panel's left edge; focus is drawn as `.lore-ctl` draws it.
 */
@Component({
  selector: 'button[hlmAccordionTrigger]',
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BrnAccordionTrigger],
  host: { 'data-slot': 'accordion-trigger' },
  template: `
    <span class="min-w-0 flex-1"><ng-content /></span>
    <ng-icon
      name="lucideChevronDown"
      aria-hidden="true"
      class="text-muted-foreground pointer-events-none shrink-0 text-[length:--spacing(4)] duration-(--motion-base) ease-(--ease) group-data-[state=open]/accordion-trigger:rotate-180 motion-safe:transition-transform"
    />
  `,
})
export class HlmAccordionTrigger {
  constructor() {
    classes(() => [
      'group/accordion-trigger flex w-full items-center justify-between gap-[calc(var(--space)*4)] py-[calc(var(--space)*4)]',
      'text-foreground text-start text-(length:--text-ui-md) font-medium',
      'cursor-pointer select-none rounded-sm underline-offset-4 hover:underline',
      'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50',
    ]);
  }
}
