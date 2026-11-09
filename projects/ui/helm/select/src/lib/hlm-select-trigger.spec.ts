import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmSelectImports } from '../index';

@Component({
  imports: [HlmSelectImports],
  template: `
    <hlm-select>
      <hlm-select-trigger>
        <hlm-select-value placeholder="Choose one" />
      </hlm-select-trigger>
    </hlm-select>
  `,
})
class Host {}

describe('HlmSelectTrigger', () => {
  it('marks its button as a field, so no press ever moves it', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-slot="select-trigger"]',
    )!;

    // The bare attribute theme/components.css excludes from the .lore-ctl press.
    expect(button.getAttribute('data-field')).toBe('');
    // Nor does it carry HlmButton's own press utility.
    expect([...button.classList].some((c) => c.includes('translate'))).toBe(false);
  });
});
