import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toast, toastState } from '@spartan-ng/brain/sonner';
import { axe } from 'vitest-axe';
import { LoreButton } from '@lore/ui/button';
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { HlmToasterImports } from '../index';

/**
 * The shell's shape: one toaster for the whole application, mounted beside the
 * controls a maker is actually using. The button is not decoration — it is what
 * holds focus while a toast arrives, which is half of what this file asserts.
 */
@Component({
  imports: [HlmToasterImports, LoreButton],
  template: `
    <button loreBtn data-testid="save">Save</button>
    <hlm-toaster />
  `,
})
class Host {}

/**
 * The two axe rules brain's toast markup breaks, and nothing else may be added
 * to this list. See the test at the bottom of the file, which fails if either
 * one is ever fixed upstream.
 */
const BRAIN_LIST_MARKUP_RULES = ['aria-allowed-role', 'list'];

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    el,
    save: el.querySelector<HTMLButtonElement>('[data-testid="save"]')!,
    regions: () => el.querySelectorAll('section[aria-label^="Notifications"]'),
    lists: () => el.querySelectorAll('[data-sonner-toaster]'),
    toasts: () => el.querySelectorAll<HTMLElement>('[data-sonner-toast]'),
    async speak(fire: () => void) {
      fire();
      await fixture.whenStable();
    },
  };
}

describe('HlmToaster', () => {
  afterEach(() => {
    // brain's toast store is module-global, so a toast outlives the fixture that
    // fired it and would otherwise be counted by the next test.
    toastState.reset();
  });

  it('renders one notification region, and only one, for the mounted toaster', async () => {
    const { regions, lists, speak } = await setup();

    // Nothing at rest: brain renders no region until there is something to say,
    // so an idle application has no stray landmark in its accessibility tree.
    expect(regions().length).toBe(0);

    await speak(() => toast('Material saved.'));

    // The one that D6 asks for, and the reason the mount belongs in the shell
    // rather than on a screen: two toasters would announce every message twice.
    expect(regions().length).toBe(1);
    expect(lists().length).toBe(1);
  });

  it('announces a toast without taking focus off the control the maker is using', async () => {
    const { save, toasts, speak } = await setup();

    save.focus();
    expect(document.activeElement).toBe(save);

    await speak(() => toast('Material saved.'));

    // The single most common way a toast is got wrong. Brain never moves focus
    // on its own — `alt+T` moves it *into* the region when a maker asks — so the
    // announcement comes to them and the keyboard stays where they left it.
    expect(toasts().length).toBe(1);
    expect(document.activeElement).toBe(save);
    expect(toasts()[0].contains(document.activeElement)).toBe(false);
  });

  it('carries the live-region markup on the toast itself', async () => {
    const { toasts, speak } = await setup();

    await speak(() => toast('Material saved.'));

    const announced = toasts()[0];
    expect(announced.getAttribute('role')).toBe('status');
    // Atomic: the message is read as one utterance rather than as whichever
    // words changed since the last toast.
    expect(announced.getAttribute('aria-atomic')).toBe('true');
    expect(announced.textContent).toContain('Material saved.');
  });

  it("bridges brain's appearance variables onto the lore token layer", async () => {
    const { lists, speak } = await setup();
    await speak(() => toast('Material saved.'));

    const list = lists()[0] as HTMLElement;
    // Brain ships its own light/dark toast palette as literals inside the
    // package. Every surface it paints is read through a --brn-sonner-* hook, so
    // re-pointing the hooks is what puts the toast on the same tokens as the
    // dialog and the sheet — and is why it follows `.dark` with no second knob.
    expect(list.style.getPropertyValue('--brn-sonner-toast-normal-background')).toBe(
      'var(--popover)',
    );
    expect(list.style.getPropertyValue('--brn-sonner-toast-normal-color')).toBe(
      'var(--popover-foreground)',
    );
    expect(list.style.getPropertyValue('--brn-sonner-toast-normal-border-color')).toBe(
      'var(--border)',
    );
    expect(list.style.getPropertyValue('--brn-sonner-border-radius')).toBe('var(--radius-lg)');
    expect(list.style.getPropertyValue('--brn-sonner-font-family')).toBe('var(--font-sans)');
  });

  it("inks a failure's icon from the destructive token, and paints nothing off-token", async () => {
    const { el, toasts, speak } = await setup();
    await speak(() => toast.error("Couldn't archive this material."));

    // The type is carried by brain's icon *shape* and by the words; the ink is a
    // third, redundant channel rather than the only one. `richColors` is off for
    // exactly that reason — it would paint from brain's palette, not from ours.
    expect(toasts()[0].getAttribute('class')).toContain(
      '[&_[data-icon]]:text-(--destructive-soft-fg)',
    );

    expectOnlyTokenColours(el);
  });

  it('reports no axe violations of its own while a toast is showing', async () => {
    const { el, speak } = await setup();
    await speak(() => toast.error("Couldn't archive this material."));

    const result = await axe(el);
    const violations = result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`,
    );

    // Everything this repository owns is clean. The two exceptions below are
    // brain's own markup and are named, not swept up.
    expect(
      violations.filter((v) => !BRAIN_LIST_MARKUP_RULES.some((r) => v.startsWith(`${r}:`))),
    ).toEqual([]);
  });

  it("leaves exactly the two structural findings brain's own markup carries", async () => {
    const { el, speak } = await setup();
    await speak(() => toast.error("Couldn't archive this material."));

    const result = await axe(el);

    // `BrnSonnerToaster` renders `<ol><brn-sonner-toast><li role="status">…`, so
    // the list's children are custom elements rather than list items (`list`) and
    // the item carries a role `li` does not allow (`aria-allowed-role`). Both are
    // inside a package under node_modules, which this repository never patches
    // (030 C3, 130 D2) — the fix is upstream, and until it lands this is the
    // honest record of it rather than a silently narrowed axe run.
    //
    // Neither finding is on the announcement path: the toast is still an atomic
    // live region with the right politeness, which the tests above assert
    // directly, and a screen reader announces it through that region and not
    // through the list. The impact is that the stack does not report "1 of 3".
    //
    // This assertion is deliberately an equality and not a subset: when a brain
    // upgrade fixes either one, this test fails and the allowance above is
    // deleted rather than outliving the defect it excuses.
    expect([...new Set(result.violations.map((v) => v.id))].sort()).toEqual(
      BRAIN_LIST_MARKUP_RULES,
    );
  });
});
