import { Directive } from '@angular/core';
import { BrnAccordionItem } from '@spartan-ng/brain/accordion';
import { classes } from '@lore/ui/helm/utils';

@Directive({
  selector: '[hlmAccordionItem],hlm-accordion-item',
  hostDirectives: [
    {
      directive: BrnAccordionItem,
      inputs: ['isOpened', 'disabled'],
      outputs: ['openedChange', 'stateChange'],
    },
  ],
  host: { 'data-slot': 'accordion-item' },
})
export class HlmAccordionItem {
  constructor() {
    classes(() => 'border-border block border-b last:border-b-0');
  }
}
