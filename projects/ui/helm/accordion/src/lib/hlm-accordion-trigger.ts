import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { BrnAccordionTrigger } from '@spartan-ng/brain/accordion';
import { classes } from '@lore/ui/helm/utils';

/**
 * A full-width row and never a `.lore-ctl`, so the press does not move it. Hover is the
 * plain neutral button's fill; its side padding is taken back by an equal negative
 * margin, so the label starts at the panel's left edge. Focus is drawn as `.lore-ctl` draws it.
 */
@Component({
  selector: 'button[hlmAccordionTrigger]',
  imports: [NgIcon],
  providers: [provideIcons({ lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BrnAccordionTrigger],
  host: { 'data-slot': 'accordion-trigger', 'data-color': 'neutral' },
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
      'group/accordion-trigger flex flex-1 items-center justify-between gap-[calc(var(--space)*4)] py-[calc(var(--space)*4)]',
      '-mx-[calc(var(--space)*2)] px-[calc(var(--space)*2)]',
      'text-foreground text-start text-(length:--text-ui-md) font-medium',
      'cursor-pointer select-none rounded-md enabled:hover:bg-(--vc)/10',
      'duration-(--motion-fast) ease-(--ease) motion-safe:transition-colors',
      'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ]);
  }
}
