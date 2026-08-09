/**
 * jsdom gap-fillers for the design system's tests.
 *
 * jsdom implements no layout engine, so a handful of DOM APIs that brain/CDK
 * legitimately call simply do not exist there. These are stubs for *jsdom's*
 * missing surface — not workarounds for spartan bugs, and not a licence to
 * assert on layout in unit tests (that is the visual/e2e layer's job).
 */

// brain's command item scrolls the active descendant into view on keyboard nav.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    /* no layout in jsdom — nothing to scroll */
  };
}

// CDK overlay/menu position strategies probe this on some paths.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function scrollTo(): void {
    /* no layout in jsdom */
  };
}

// brain measures a popover's trigger with one, so the panel can take its width.
// It reports nothing, which is correct: jsdom computes no geometry, so any size
// it invented would be a number a test could accidentally believe.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class NoopResizeObserver implements ResizeObserver {
    observe(): void {
      /* no layout in jsdom — nothing to measure */
    }
    unobserve(): void {
      /* no layout in jsdom */
    }
    disconnect(): void {
      /* no layout in jsdom */
    }
  };
}

// tw-animate / CDK transition helpers read computed animation state.
if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof globalThis.matchMedia;
}

// Accessibility assertions (vitest-axe). axe-core needs a DOM; jsdom has no
// layout engine, so color-contrast (which reads computed geometry) cannot run
// here — it belongs to the visual/e2e layer. Structural rules (labels, roles,
// ARIA names, alt text) run fine and are what unit-level a11y checks cover.
import * as axeMatchers from 'vitest-axe/matchers';
import { expect } from 'vitest';
expect.extend(axeMatchers);
