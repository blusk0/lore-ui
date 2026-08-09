import {
  booleanAttribute,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
} from '@angular/core';

export type LoreVariant = 'solid' | 'soft' | 'outlined' | 'plain';
export type LoreColor = 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
export type LoreSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md' | 'icon-lg';

/**
 * lore's button: a native <button>/<a> opted into the design system's
 * global variant matrix (variant × color × size). All appearance comes
 * from the token layer (src/theme) — this directive only sets the axes.
 *
 * Icon-only sizes (`icon-sm|icon-md|icon-lg`) render a square control and
 * always need an accessible name — `aria-label` or an `.sr-only` span.
 */
@Directive({
  selector: 'button[loreBtn], a[loreBtn]',
  host: {
    class: 'lore-ctl',
    '[attr.data-variant]': 'variant()',
    '[attr.data-color]': 'color()',
    '[attr.data-size]': 'size()',
    // Disabled story. <button> keeps the native attribute (so it is really
    // inert and un-focusable); <a> has no native disabled, so it gets
    // aria-disabled + tabindex=-1 and the pointer-events guard in
    // components.css. data-disabled drives appearance for both.
    '[attr.data-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': '_isButton && disabled() ? "" : null',
    '[attr.tabindex]': '!_isButton && disabled() ? "-1" : null',
    // Default to type="button" so a button inside a form doesn't submit it by
    // accident. A consumer-set type (e.g. type="submit") is preserved.
    '[attr.type]': '_type',
  },
})
export class LoreButton {
  protected readonly _isButton = inject(ElementRef<HTMLElement>).nativeElement.tagName === 'BUTTON';
  private readonly _typeAttr = inject(new HostAttributeToken('type'), { optional: true });
  protected readonly _type = this._isButton ? (this._typeAttr ?? 'button') : null;

  readonly variant = input<LoreVariant>('solid');
  readonly color = input<LoreColor>('neutral');
  readonly size = input<LoreSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
}
