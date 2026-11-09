import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrnAccordionContent } from '@spartan-ng/brain/accordion';
import { classes } from '@lore/ui/helm/utils';

/**
 * Always mounted: brain only marks a closed panel `inert` and this clamps it to
 * zero height, so its children keep their state and reads while closed. Brain
 * measures the first child into `--brn-accordion-content-height`, hence the wrapper.
 */
@Component({
  selector: 'hlm-accordion-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BrnAccordionContent],
  host: { 'data-slot': 'accordion-content' },
  template: `
    <div class="text-(length:--text-ui-md) pb-[calc(var(--space)*4)]">
      <ng-content />
    </div>
  `,
})
export class HlmAccordionContent {
  constructor() {
    classes(() => [
      'block h-(--brn-accordion-content-height) data-closed:h-0',
      'duration-(--motion-base) ease-(--ease) motion-safe:transition-[height]',
    ]);
  }
}
