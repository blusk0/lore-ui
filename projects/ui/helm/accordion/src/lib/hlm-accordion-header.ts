import { Directive } from '@angular/core';
import { BrnAccordionHeader } from '@spartan-ng/brain/accordion';
import { classes } from '@lore/ui/helm/utils';

/** Goes on the h1–h6 that wraps the trigger; brain refuses a trigger outside a heading. */
@Directive({
  selector: '[hlmAccordionHeader]',
  hostDirectives: [BrnAccordionHeader],
  host: { 'data-slot': 'accordion-header' },
})
export class HlmAccordionHeader {
  constructor() {
    classes(() => 'flex');
  }
}
