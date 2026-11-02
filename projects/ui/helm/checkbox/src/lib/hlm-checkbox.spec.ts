import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { HlmCheckbox } from './hlm-checkbox';

/**
 * jsdom has no layout and these specs compile no Tailwind, so the hit area is
 * pinned on the classes and its size worked out from them; the browser
 * measurement belongs to the consumers' e2e layer.
 */
@Component({
  imports: [HlmCheckbox],
  template: `
    <hlm-checkbox aria-label="Archived" />
    <hlm-checkbox aria-label="Selected" checked />
  `,
})
class Host {}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  return { el, boxes: [...el.querySelectorAll<HTMLElement>('[role="checkbox"]')] };
}

/** One px value per class shape the geometry depends on; throws when a shape is missing. */
function px(classes: string[], pattern: RegExp, toPx: (match: RegExpMatchArray) => number): number {
  const hits = classes.map((name) => name.match(pattern)).filter((m) => m !== null);
  expect(hits, `exactly one class matching ${pattern}`).toHaveLength(1);
  return toPx(hits[0]!);
}

describe('HlmCheckbox', () => {
  it('draws a 16px box with a 1px edge, unchanged', async () => {
    const { boxes } = await setup();

    for (const box of boxes) {
      expect([...box.classList]).toEqual(
        expect.arrayContaining(['size-4', 'border', 'rounded-[4px]', 'focus-visible:ring-3']),
      );
    }
  });

  it('answers a press across at least 24×24 CSS px, centred on the box (WCAG 2.5.8)', async () => {
    const { boxes } = await setup();

    for (const box of boxes) {
      const classes = [...box.classList];

      // The pseudo-element is the pointer target, positioned against the box.
      expect(classes).toEqual(
        expect.arrayContaining(['relative', 'before:absolute', 'before:content-[""]']),
      );
      // One uniform inset, so the bleed is equal on all four sides, i.e. centred.
      expect(
        classes.filter((name) =>
          /^before:-?inset-[xy]-|^before:-?(?:top|right|bottom|left)-/.test(name),
        ),
      ).toEqual([]);

      const size = px(classes, /^size-(\d+)$/, (m) => Number(m[1]) * 4);
      const edge = px(classes, /^border(?:-(\d+))?$/, (m) => (m[1] ? Number(m[1]) : 1));
      const bleed = px(classes, /^before:-inset-\[(\d+)px\]$/, (m) => Number(m[1]));

      // An absolute inset is measured from the padding box, inside the edge.
      const target = size - 2 * edge + 2 * bleed;
      expect(size).toBe(16);
      expect(target).toBeGreaterThanOrEqual(24);
    }
  });

  it('paints only through the token layer', async () => {
    const { el } = await setup();

    expectOnlyTokenColours(el);
  });
});
