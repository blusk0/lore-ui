import { Directive } from '@angular/core';
import {
  BrnTooltip,
  BrnTooltipPosition,
  provideBrnTooltipDefaultOptions,
} from '@spartan-ng/brain/tooltip';
import { hlm } from '@lore/ui/helm/utils';
import { cva } from 'class-variance-authority';

/**
 * The tooltip is the one overlay in the D7 set that is deliberately NOT on
 * --popover: it is a transient, non-interactive label, so it inverts
 * (--foreground surface, --background ink) to separate itself from the
 * actionable overlays — dialog, menu and sheet — that do sit on --popover.
 * Both halves are lore semantics already, so the swatch needed no retuning;
 * the arrow below takes the same fill so it can never drift from the bubble.
 *
 * The generated constant carried the animation block twice (the nova style map
 * inlines `.spartan-tooltip-content`, whose rules the template already listed).
 * tailwind-merge collapsed the duplicates at runtime; they are removed here so
 * the source reads as one list.
 */
export const DEFAULT_TOOLTIP_SVG_CLASS =
  'bg-foreground fill-foreground z-50 block size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px]';

export const DEFAULT_TOOLTIP_CONTENT_CLASSES = hlm(
  'bg-foreground text-background z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance origin-(--radix-tooltip-content-transform-origin) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
);

export const tooltipPositionVariants = cva('absolute', {
  variants: {
    position: {
      top: 'bottom-0 left-[calc(50%-5px)] translate-y-full',
      bottom: '-top-2.5 left-[calc(50%-5px)] translate-y-0 rotate-180',
      left: '-end-2.5 top-[calc(50%-5px)] translate-y-0 rotate-270 rtl:-rotate-270',
      right: '-start-2.5 top-[calc(50%-5px)] translate-y-0 rotate-90 rtl:-rotate-90',
    },
  },
});

@Directive({
  selector: '[hlmTooltip]',
  providers: [
    provideBrnTooltipDefaultOptions({
      svgClasses: DEFAULT_TOOLTIP_SVG_CLASS,
      tooltipContentClasses: DEFAULT_TOOLTIP_CONTENT_CLASSES,
      arrowClasses: (position: BrnTooltipPosition) => hlm(tooltipPositionVariants({ position })),
    }),
  ],
  hostDirectives: [
    {
      directive: BrnTooltip,
      inputs: ['brnTooltip: hlmTooltip', 'position', 'hideDelay', 'showDelay', 'tooltipDisabled'],
    },
  ],
})
export class HlmTooltip {}
