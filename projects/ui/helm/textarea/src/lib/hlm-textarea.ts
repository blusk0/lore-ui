import { BooleanInput } from '@angular/cdk/coercion';
import {
  afterRenderEffect,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  Renderer2,
} from '@angular/core';
import { BrnFieldControl, BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnTextarea } from '@spartan-ng/brain/textarea';
import { HlmField } from '@lore/ui/helm/field';
import { classes } from '@lore/ui/helm/utils';

/**
 * @deprecated Use `<textarea hlmInput>` from `@lore/ui/helm/input`: the same control on the
 * `.lore-ctl` contract. Kept for `HlmInputGroupTextarea` and existing imports.
 *
 * `aria-invalid` follows `HlmInput`'s rule: pass `[aria-invalid]`, not `[attr.aria-invalid]`.
 */
@Directive({
  selector: '[hlmTextarea]',
  hostDirectives: [
    { directive: BrnTextarea, inputs: ['id', 'forceInvalid'] },
    // Exposed for the same reason as hlm-input: the directive owns the attribute.
    { directive: BrnFieldControlDescribedBy, inputs: ['aria-describedby'] },
  ],
  host: { 'data-slot': 'textarea' },
})
export class HlmTextarea {
  private readonly _field = inject(HlmField, { optional: true });
  private readonly _control = inject(BrnFieldControl);

  /** The caller's invalid state; outside a field it wins over brain's. Unset defers. */
  readonly ariaInvalid = input<boolean | undefined, BooleanInput>(undefined, {
    alias: 'aria-invalid',
    transform: (value: BooleanInput) => (value == null ? undefined : booleanAttribute(value)),
  });

  protected readonly _invalid = computed(() => {
    const own = this.ariaInvalid();
    if (this._field) return this._field.invalid() || own === true;
    return own ?? this._control.invalid() ?? false;
  });

  constructor() {
    const renderer = inject(Renderer2);
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    afterRenderEffect({
      write: () => {
        // Tracked so brain's own rewrite of the attribute re-triggers this one.
        this._control.invalid();
        if (this._invalid()) renderer.setAttribute(host, 'aria-invalid', 'true');
        else renderer.removeAttribute(host, 'aria-invalid');
      },
    });

    classes(
      () =>
        // lore restyle: type/motion/padding ride the density + motion tokens.
        // Height is intentionally left to field-sizing-content + min-h.
        'border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 data-[matches-spartan-invalid=true]:ring-destructive/20 dark:data-[matches-spartan-invalid=true]:ring-destructive/40 data-[matches-spartan-invalid=true]:border-destructive dark:data-[matches-spartan-invalid=true]:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-lg border bg-transparent px-[calc(var(--space)*2.5)] py-[calc(var(--space)*2)] text-(length:--text-ui-md) transition-colors duration-(--motion-fast) focus-visible:ring-3 data-[matches-spartan-invalid=true]:ring-3 placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50',
    );
  }
}
