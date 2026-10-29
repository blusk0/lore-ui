import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoreBadge, type LoreBadgeSize, LoreChip } from './lore-badge';

@Component({
  imports: [LoreBadge, LoreChip],
  template: `
    <span loreBadge [suggested]="suggested()">landscape</span>
    <button loreChip color="primary" [suggested]="suggested()" [disabled]="disabled()">
      golden hour
    </button>
  `,
})
class Host {
  // Signals: the app is zoneless, so plain-field writes would never flush.
  readonly suggested = signal(false);
  readonly disabled = signal(false);
}

@Component({
  imports: [LoreBadge],
  template: `
    <span loreBadge [size]="size()" variant="solid" color="danger" [suggested]="suggested()">
      12
    </span>
  `,
})
class SizedHost {
  readonly size = signal<LoreBadgeSize>('md');
  readonly suggested = signal(false);
}

describe('LoreBadge / LoreChip', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, badge: el.querySelector('span')!, chip: el.querySelector('button')! };
  }

  it('puts both matrix classes on the badge and defaults to a soft neutral', async () => {
    const { badge } = await setup();
    expect(badge.classList).toContain('lore-ctl');
    expect(badge.classList).toContain('lore-chip');
    expect(badge.getAttribute('data-variant')).toBe('soft');
    expect(badge.getAttribute('data-color')).toBe('neutral');
  });

  it('only marks data-suggested when suggested is set', async () => {
    const { fixture, badge, chip } = await setup();

    // Absent, not "false" — the dashed AI-suggested treatment keys off presence.
    expect(badge.hasAttribute('data-suggested')).toBe(false);

    fixture.componentInstance.suggested.set(true);
    await fixture.whenStable();

    expect(badge.getAttribute('data-suggested')).toBe('true');
    expect(chip.getAttribute('data-suggested')).toBe('true');
  });

  it('renders the interactive chip as a real button so it is focusable', async () => {
    const { chip } = await setup();
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.getAttribute('type')).toBe('button');
    expect(chip.getAttribute('data-color')).toBe('primary');
  });

  it('disables the chip natively', async () => {
    const { fixture, chip } = await setup();
    expect(chip.hasAttribute('disabled')).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(chip.hasAttribute('disabled')).toBe(true);
    expect(chip.getAttribute('data-disabled')).toBe('true');
  });

  describe('size', () => {
    async function setupSized() {
      await TestBed.configureTestingModule({
        imports: [SizedHost],
        providers: [provideZonelessChangeDetection()],
      }).compileComponents();
      const fixture = TestBed.createComponent(SizedHost);
      await fixture.whenStable();
      return { fixture, badge: (fixture.nativeElement as HTMLElement).querySelector('span')! };
    }

    it('renders no data-size by default, so existing markup is unchanged', async () => {
      const { badge } = await setup();
      expect(badge.hasAttribute('data-size')).toBe(false);
    });

    it('renders no data-size for an explicit md', async () => {
      const { badge } = await setupSized();
      expect(badge.hasAttribute('data-size')).toBe(false);
    });

    it('marks data-size="sm" and drops it again on the way back to md', async () => {
      const { fixture, badge } = await setupSized();

      fixture.componentInstance.size.set('sm');
      await fixture.whenStable();
      expect(badge.getAttribute('data-size')).toBe('sm');

      fixture.componentInstance.size.set('md');
      await fixture.whenStable();
      expect(badge.hasAttribute('data-size')).toBe(false);
    });

    it('composes with variant, color and suggested', async () => {
      const { fixture, badge } = await setupSized();

      fixture.componentInstance.size.set('sm');
      fixture.componentInstance.suggested.set(true);
      await fixture.whenStable();

      expect(badge.classList).toContain('lore-chip');
      expect(badge.getAttribute('data-size')).toBe('sm');
      expect(badge.getAttribute('data-variant')).toBe('solid');
      expect(badge.getAttribute('data-color')).toBe('danger');
      expect(badge.getAttribute('data-suggested')).toBe('true');
    });

    it('leaves the chip without a size axis', async () => {
      const { chip } = await setup();
      expect(chip.hasAttribute('data-size')).toBe(false);
    });
  });
});
