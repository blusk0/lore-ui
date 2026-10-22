import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { axe } from 'vitest-axe';
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { LoreLink, type LoreLinkVariant } from './lore-link';

/**
 * The three places lore-inventory and lore-dam put a text link: a code in a
 * table cell, a secondary column, and a link inside a sentence of muted text.
 */
@Component({
  imports: [LoreLink, RouterLink],
  template: `
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Supplier</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><a loreLink data-testid="code" routerLink="/materials/1">MAT-0001</a></td>
          <td>
            <a
              loreLink
              data-testid="supplier"
              variant="plain"
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
              >Acme</a
            >
          </td>
        </tr>
      </tbody>
    </table>
    <p class="text-muted-foreground">
      Counted as of 1 March.
      <a loreLink data-testid="sentence" [variant]="sentenceVariant()" routerLink="/settings"
        >Change the lead time</a
      >
    </p>
  `,
})
class Host {
  readonly sentenceVariant = signal<LoreLinkVariant>('prose');
}

// A layout utility the app adds (a lot code that must not break) rides beside
// the directive's class rather than replacing it.
@Component({
  imports: [LoreLink],
  template: `<a loreLink class="whitespace-nowrap" href="/lots/7">LOT-7</a>`,
})
class ClassHost {}

describe('LoreLink', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const link = (id: string) => el.querySelector<HTMLAnchorElement>(`a[data-testid="${id}"]`)!;
    return {
      fixture,
      el,
      code: link('code'),
      supplier: link('supplier'),
      sentence: link('sentence'),
    };
  }

  it('puts the link class on the host and defaults to the strong variant', async () => {
    const { code } = await setup();
    expect(code.classList).toContain('lore-link');
    expect(code.getAttribute('data-variant')).toBe('strong');
  });

  it('reflects each variant onto data-variant, and follows a bound one', async () => {
    const { fixture, code, supplier, sentence } = await setup();

    expect(supplier.getAttribute('data-variant')).toBe('plain');
    expect(sentence.getAttribute('data-variant')).toBe('prose');

    fixture.componentInstance.sentenceVariant.set('plain');
    await fixture.whenStable();
    expect(sentence.getAttribute('data-variant')).toBe('plain');
  });

  it('is never a control: no .lore-ctl, no size, no colour axis', async () => {
    const { el } = await setup();

    // .lore-ctl is what gives a[loreBtn] its height and padding — the box a
    // link inside a sentence must not draw.
    for (const link of Array.from(el.querySelectorAll('a'))) {
      expect(link.classList).not.toContain('lore-ctl');
      expect(link.hasAttribute('data-size')).toBe(false);
      expect(link.hasAttribute('data-color')).toBe(false);
    }
  });

  it('adds only its own class, so the ink comes from the text around it', async () => {
    const { el, code, supplier, sentence } = await setup();

    for (const link of [code, supplier, sentence]) {
      expect(Array.from(link.classList)).toEqual(['lore-link']);
    }
    expectOnlyTokenColours(el);
  });

  it('keeps a consumer class beside its own', async () => {
    await TestBed.configureTestingModule({
      imports: [ClassHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ClassHost);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;

    expect(link.classList).toContain('lore-link');
    expect(link.classList).toContain('whitespace-nowrap');
  });

  it('leaves native link semantics alone: a real href, no role, no tabindex', async () => {
    const { code, supplier, sentence } = await setup();

    // routerLink writes the href, which is what makes an <a> focusable and
    // announced as a link; the directive must not stand in for any of that.
    expect(code.getAttribute('href')).toBe('/materials/1');
    expect(sentence.getAttribute('href')).toBe('/settings');
    expect(supplier.getAttribute('target')).toBe('_blank');
    for (const link of [code, supplier, sentence]) {
      expect(link.hasAttribute('role')).toBe(false);
      expect(link.hasAttribute('tabindex')).toBe(false);
      expect(link.hasAttribute('type')).toBe(false);
    }
  });

  it('is reachable by keyboard focus', async () => {
    const { code, sentence } = await setup();

    code.focus();
    expect(document.activeElement).toBe(code);
    sentence.focus();
    expect(document.activeElement).toBe(sentence);
  });

  it('reports no axe violations', async () => {
    const { el } = await setup();

    const result = await axe(el);
    expect(
      result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`),
    ).toEqual([]);
  });
});
