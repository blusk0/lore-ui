import { Component, type OnDestroy, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { axe } from 'vitest-axe';
// @ts-expect-error the builder's text loader yields the sheet as a string; there is no type for it.
import componentsCss from '../../../../theme/components.css' with { loader: 'text' };
import { HlmAccordionImports } from '../index';

/** A panel body that counts its own lifetimes, so a spec can tell hidden from destroyed. */
@Component({ selector: 'probe-panel', template: `<p>Probe</p>` })
class ProbePanel implements OnDestroy {
  static created = 0;
  static destroyed = 0;

  constructor() {
    ProbePanel.created++;
  }

  ngOnDestroy(): void {
    ProbePanel.destroyed++;
  }
}

@Component({
  imports: [HlmAccordionImports, ProbePanel],
  template: `
    <hlm-accordion [type]="type()">
      <hlm-accordion-item data-testid="cost">
        <h2 hlmAccordionHeader>
          <button hlmAccordionTrigger data-testid="cost-trigger">Cost</button>
        </h2>
        <hlm-accordion-content data-testid="cost-content">
          <probe-panel />
        </hlm-accordion-content>
      </hlm-accordion-item>

      <hlm-accordion-item data-testid="outputs">
        <h2 hlmAccordionHeader>
          <button hlmAccordionTrigger data-testid="outputs-trigger">Outputs</button>
        </h2>
        <hlm-accordion-content data-testid="outputs-content">Two jars.</hlm-accordion-content>
      </hlm-accordion-item>

      <hlm-accordion-item
        data-testid="history"
        [isOpened]="historyOpen()"
        (openedChange)="changes.update((all) => [...all, $event])"
      >
        <h2 hlmAccordionHeader>
          <button hlmAccordionTrigger data-testid="history-trigger">History</button>
        </h2>
        <hlm-accordion-content data-testid="history-content">Page 2.</hlm-accordion-content>
      </hlm-accordion-item>
    </hlm-accordion>
  `,
})
class Host {
  readonly type = signal<'single' | 'multiple'>('multiple');
  readonly historyOpen = signal(false);
  readonly changes = signal<readonly boolean[]>([]);
}

async function setup(init: (host: Host) => void = () => undefined) {
  ProbePanel.created = 0;
  ProbePanel.destroyed = 0;
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  init(fixture.componentInstance);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  const at = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  return {
    el,
    at,
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
    async toggle(section: string) {
      at(`${section}-trigger`).click();
      await fixture.whenStable();
    },
    expanded: (section: string) => at(`${section}-trigger`).getAttribute('aria-expanded'),
  };
}

describe('HlmAccordion', () => {
  it('opens and closes an item from its trigger', async () => {
    const { at, toggle, expanded } = await setup();

    expect(expanded('cost')).toBe('false');
    expect(at('cost').getAttribute('data-state')).toBe('closed');

    await toggle('cost');
    expect(expanded('cost')).toBe('true');
    expect(at('cost').getAttribute('data-state')).toBe('open');
    expect(at('cost-content').getAttribute('data-state')).toBe('open');
    expect(at('cost-content').hasAttribute('inert')).toBe(false);

    await toggle('cost');
    expect(expanded('cost')).toBe('false');
    expect(at('cost-content').getAttribute('data-state')).toBe('closed');
  });

  it('keeps several items open at once when type is multiple', async () => {
    const { toggle, expanded } = await setup();

    await toggle('cost');
    await toggle('outputs');
    await toggle('history');
    expect([expanded('cost'), expanded('outputs'), expanded('history')]).toEqual([
      'true',
      'true',
      'true',
    ]);

    await toggle('outputs');
    expect([expanded('cost'), expanded('outputs'), expanded('history')]).toEqual([
      'true',
      'false',
      'true',
    ]);
  });

  it("keeps brain's single default when type is not multiple", async () => {
    const { toggle, expanded } = await setup((host) => host.type.set('single'));

    await toggle('cost');
    await toggle('outputs');
    expect([expanded('cost'), expanded('outputs')]).toEqual(['false', 'true']);
  });

  it('keeps a closed panel mounted: hidden from use, never destroyed', async () => {
    const { at, toggle } = await setup();

    // Closed from the first render, and the body was still built.
    expect(ProbePanel.created).toBe(1);
    expect(at('cost-content').querySelector('probe-panel')).not.toBeNull();
    expect(at('cost-content').hasAttribute('inert')).toBe(true);
    expect(at('cost-content').classList).toContain('data-closed:h-0');

    await toggle('cost');
    await toggle('cost');
    expect(ProbePanel.created).toBe(1);
    expect(ProbePanel.destroyed).toBe(0);
    expect(at('cost-content').querySelector('probe-panel')).not.toBeNull();
    expect(at('cost-content').hasAttribute('inert')).toBe(true);
  });

  it('opens an item from state through [isOpened], and reports a user toggle back', async () => {
    const { host, settle, toggle, expanded } = await setup((h) => h.historyOpen.set(true));

    // Open on the first render, as when the URL names a page of the history.
    expect(expanded('history')).toBe('true');

    host.historyOpen.set(false);
    await settle();
    expect(expanded('history')).toBe('false');

    host.historyOpen.set(true);
    await settle();
    expect(expanded('history')).toBe('true');
    // A state-driven change is not echoed as a user event.
    expect(host.changes()).toEqual([]);

    await toggle('history');
    expect(expanded('history')).toBe('false');
    expect(host.changes()).toEqual([false]);
  });

  it('wires the WAI-ARIA accordion pattern: heading, button, controlled region', async () => {
    const { at } = await setup();
    const trigger = at('cost-trigger');
    const content = at('cost-content');

    expect(trigger.parentElement!.tagName).toBe('H2');
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.id).toBeTruthy();
    expect(content.id).toBeTruthy();
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('role')).toBe('region');
    expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    // Every item gets its own pair.
    expect(at('outputs-trigger').getAttribute('aria-controls')).not.toBe(content.id);
  });

  it('refuses a trigger that is not inside a heading', async () => {
    @Component({
      imports: [HlmAccordionImports],
      template: `
        <hlm-accordion>
          <hlm-accordion-item>
            <div><button hlmAccordionTrigger>Cost</button></div>
            <hlm-accordion-content>Body</hlm-accordion-content>
          </hlm-accordion-item>
        </hlm-accordion>
      `,
    })
    class Unheaded {}

    await TestBed.configureTestingModule({
      imports: [Unheaded],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    expect(() => TestBed.createComponent(Unheaded)).toThrow(/heading/);
  });

  it('draws its chevron, rotating with the open state and only under motion-safe', async () => {
    const { at } = await setup();
    const icon = at('cost-trigger').querySelector('ng-icon')!;

    expect(icon.getAttribute('name')).toBe('lucideChevronDown');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(at('cost-trigger').classList).toContain('group/accordion-trigger');
    expect(icon.classList).toContain('group-data-[state=open]/accordion-trigger:rotate-180');

    // Nothing animates outside motion-safe: the panel height and the chevron both.
    for (const node of [icon, at('cost-content')]) {
      const transitions = [...node.classList].filter((c) => c.includes('transition'));
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.every((c) => c.startsWith('motion-safe:'))).toBe(true);
    }
    expect(at('cost-content').classList).toContain('h-(--brn-accordion-content-height)');
  });

  it('is a pointer row that the .lore-ctl press never reaches', async () => {
    const { at } = await setup();
    const trigger = at('cost-trigger');
    const pressSelectors = [
      ...(componentsCss as string).matchAll(/([^{}]*:active[^{}]*)\{([^{}]*)\}/g),
    ]
      .filter(([, , body]) => /\btranslate\s*:/.test(body))
      .map(([, selector]) => selector.replace(/\/\*[\s\S]*?\*\//g, '').trim());

    expect(pressSelectors.length).toBeGreaterThan(0);
    expect(pressSelectors.some((s) => trigger.matches(s.replaceAll(':active', '')))).toBe(false);
    const classes = [...trigger.classList];
    expect(classes).toEqual(
      expect.arrayContaining(['cursor-pointer', 'w-full', 'hover:underline']),
    );
    expect(classes).not.toContain('lore-ctl');
    expect(classes.some((c) => c.includes('translate'))).toBe(false);
  });

  it("lines the panel's text up with the trigger's: neither pads the inline axis", async () => {
    const { at } = await setup();
    const inline = (node: Element) =>
      [...node.classList].filter((c) => /^(p[xsel]|ps|pe)-/.test(c) || /^-?m[xsel]-/.test(c));

    expect(inline(at('cost-trigger'))).toEqual([]);
    expect(inline(at('cost-content'))).toEqual([]);
    expect(inline(at('cost-content').firstElementChild!)).toEqual([]);
    expect(at('cost-content').firstElementChild!.classList).toContain('pb-[calc(var(--space)*4)]');
  });

  it('paints only from the token layer and reports no axe violations', async () => {
    const { el, toggle } = await setup();

    expectOnlyTokenColours(el);
    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);

    await toggle('cost');
    expect((await axe(el)).violations.map((v) => v.id)).toEqual([]);
  });
});
