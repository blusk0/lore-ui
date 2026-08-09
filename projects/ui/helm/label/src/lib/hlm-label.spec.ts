import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { HlmLabel } from './hlm-label';

@Component({
  imports: [HlmLabel],
  template: `
    <label hlmLabel for="loose-control">Batch size</label>
    <input id="loose-control" />
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

  return { el: fixture.nativeElement as HTMLElement };
}

describe('HlmLabel', () => {
  it('honours an explicit `for` outside a field, and carries an id of its own', async () => {
    const { el } = await setup();
    const label = el.querySelector('label')!;

    // Outside `<hlm-field>` there is no labelable to resolve, so the caller says
    // what the label names — and the association is still a real `for`/`id`
    // pair on a real `<label>`, not an aria-label bolted on afterwards.
    expect(label.getAttribute('for')).toBe('loose-control');
    expect(label.control).toBe(el.querySelector('#loose-control'));
    expect(label.id).toBeTruthy();
  });

  it('paints from the token layer', async () => {
    const { el } = await setup();

    expect([...el.querySelector('label')!.classList]).toContain('text-foreground');
    expectOnlyTokenColours(el);
  });
});
