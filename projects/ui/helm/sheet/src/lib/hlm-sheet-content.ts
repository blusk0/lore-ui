import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { injectExposedSideProvider, injectExposesStateProvider } from '@spartan-ng/brain/core';

import { classes } from '@lore/ui/helm/utils';
// Plan 030 D7: buttons stay lore-owned — see the same note in hlm-dialog-content.
import { LoreButton } from '@lore/ui/button';
import { HlmSheetClose } from './hlm-sheet-close';

@Component({
  selector: 'hlm-sheet-content',
  imports: [LoreButton, HlmSheetClose, NgIcon],
  providers: [provideIcons({ lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'sheet-content',
    '[attr.data-side]': '_sideProvider.side()',
    '[attr.data-state]': 'state()',
  },
  template: `
    <ng-content />

    @if (showCloseButton()) {
      <button
        loreBtn
        variant="plain"
        color="neutral"
        size="icon-sm"
        class="absolute end-3 top-3"
        hlmSheetClose
      >
        <span class="sr-only">Close</span>
        <ng-icon name="lucideX" />
      </button>
    }
  `,
})
export class HlmSheetContent {
  private readonly _stateProvider = injectExposesStateProvider({ host: true });
  protected readonly _sideProvider = injectExposedSideProvider({ host: true });
  public readonly state = this._stateProvider.state ?? signal('closed');
  private readonly _renderer = inject(Renderer2);
  private readonly _element = inject(ElementRef);

  public readonly showCloseButton = input<boolean, BooleanInput>(true, {
    transform: booleanAttribute,
  });

  constructor() {
    // Side-anchored surface. Everything here is already on the semantic layer —
    // `bg-popover`/`text-popover-foreground` are lore tokens, and the anchored
    // edge's `border-r`/`border-l`/... take --border from the base rule in
    // theme/index.css — so nothing needed recolouring.
    //
    // Sizing is left at spartan's default (3/4 of the viewport, capped at
    // `sm:max-w-sm`). Plan 030 P4.2 uses a left-anchored sheet as the mobile
    // navigation rail; to pin it to the rail token instead, pass the width on
    // the element and let tailwind-merge drop the default — the modifier has to
    // match for the merge to win:
    //
    //   <hlm-sheet-content *hlmSheetPortal class="data-[side=left]:w-(--rail-w-expanded)">
    //
    // The width is deliberately NOT hard-wired to --rail-w-expanded here: this
    // sheet is the app's general side surface (filters, detail panes), not the
    // rail's private component.
    classes(() => [
      'bg-popover text-popover-foreground fixed flex flex-col gap-4 bg-clip-padding text-sm shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
      'data-open:animate-in data-closed:animate-out',
      'data-[side=top]:data-closed:slide-out-to-top data-[side=top]:data-open:slide-in-from-top',
      'data-[side=bottom]:data-closed:slide-out-to-bottom data-[side=bottom]:data-open:slide-in-from-bottom',
      'data-[side=left]:data-closed:slide-out-to-left data-[side=left]:data-open:slide-in-from-left',
      'data-[side=right]:data-closed:slide-out-to-right data-[side=right]:data-open:slide-in-from-right',
    ]);
    effect(() => {
      this._renderer.setAttribute(this._element.nativeElement, 'data-state', this.state());
    });
  }
}
