import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { HlmInput } from '@lore/ui/helm/input';
import { axe } from 'vitest-axe';
type FieldErrors = Readonly<Record<string, readonly string[]>>;
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { HlmFieldImports } from '../index';

/**
 * The host composes the field exactly as a 140 form will: one lookup per field
 * against `020`'s `errors` map, keyed by the field name the server sent it
 * under. Two fields, because the property that matters is not "a message
 * renders" but "a message renders *on the input the server named*".
 */
@Component({
  imports: [HlmFieldImports, HlmInput, ReactiveFormsModule],
  template: `
    <hlm-field [messages]="errors()['code'] ?? []">
      <label hlmLabel>Code</label>
      <input hlmInput data-testid="code" [formControl]="code" />
      <p hlmFieldDescription>Unique within the tenant.</p>
    </hlm-field>

    <hlm-field [messages]="errors()['name'] ?? []">
      <label hlmLabel>Name</label>
      <input hlmInput data-testid="name" [formControl]="name" />
    </hlm-field>
  `,
})
class Host {
  readonly errors = signal<FieldErrors>({});
  readonly code = new FormControl('');
  readonly name = new FormControl('');
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  const field = (name: string) => el.querySelectorAll('hlm-field')[name === 'code' ? 0 : 1];

  return {
    fixture,
    el,
    field,
    input: (name: string) => el.querySelector<HTMLInputElement>(`[data-testid="${name}"]`)!,
    label: (name: string) => [...el.querySelectorAll('label')][name === 'code' ? 0 : 1],
    async refuse(errors: FieldErrors) {
      fixture.componentInstance.errors.set(errors);
      await fixture.whenStable();
    },
  };
}

/** The ids in an `aria-describedby`, as a list. */
function describedBy(control: Element): string[] {
  return (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
}

describe('HlmField', () => {
  it('associates the label with its control programmatically', async () => {
    const { input, label } = await setup();

    // The form writes no ids at all: brain generates the control's, registers it
    // as the field's labelable, and BrnLabel resolves `for` from it. This is the
    // single assertion the whole wrapper exists to make true — break the
    // registration and it is what fails.
    const id = input('code').id;
    expect(id).toBeTruthy();
    expect(label('code').getAttribute('for')).toBe(id);

    // …and the two fields do not share one, which is what keeps a click on the
    // second label off the first input.
    expect(input('name').id).not.toBe(id);
  });

  it('points the control at its hint through aria-describedby', async () => {
    const { el, input } = await setup();

    const hint = el.querySelector('[hlmFieldDescription]')!;
    expect(hint.id).toBeTruthy();
    expect(describedBy(input('code'))).toContain(hint.id);

    // The second field has no hint, so it describes nothing yet.
    expect(describedBy(input('name'))).toEqual([]);
  });

  it("lands a server refusal on the input the server's field key names", async () => {
    const { field, input, refuse } = await setup();

    // 020 D3's wire shape: a map keyed by field name. The client branches on the
    // key and never on the message text.
    await refuse({ code: ['Code is already in use.'] });

    const messages = field('code').querySelector('[data-slot="field-messages"]')!;
    expect(messages.textContent).toContain('Code is already in use.');
    expect(describedBy(input('code'))).toContain(messages.id);
    expect(input('code').getAttribute('aria-invalid')).toBe('true');
    expect(field('code').getAttribute('data-invalid')).toBe('true');

    // The untouched field is untouched — no message, no invalid state, and its
    // describedby is not extended by another field's failure.
    expect(field('name').querySelector('[data-slot="field-messages"]')).toBeNull();
    expect(input('name').getAttribute('aria-invalid')).toBeNull();
    expect(field('name').getAttribute('data-invalid')).toBeNull();
    expect(describedBy(input('name'))).toEqual([]);
  });

  it('renders every message it is given, in order, and keeps the hint described too', async () => {
    const { el, field, input, refuse } = await setup();

    await refuse({ code: ['Code is already in use.', 'Code must be uppercase.'] });

    const rendered = [...field('code').querySelectorAll('[data-slot="field-messages"] p')].map(
      (p) => p.textContent?.trim(),
    );
    expect(rendered).toEqual(['Code is already in use.', 'Code must be uppercase.']);

    // Hint and messages both, not one replacing the other.
    const hint = el.querySelector('[hlmFieldDescription]')!;
    const messages = field('code').querySelector('[data-slot="field-messages"]')!;
    expect(describedBy(input('code'))).toEqual(expect.arrayContaining([hint.id, messages.id]));
  });

  it('withdraws the invalid state and the description when the messages clear', async () => {
    const { el, field, input, refuse } = await setup();

    await refuse({ code: ['Code is already in use.'] });
    const messagesId = field('code').querySelector('[data-slot="field-messages"]')!.id;

    await refuse({});

    expect(field('code').querySelector('[data-slot="field-messages"]')).toBeNull();
    expect(input('code').getAttribute('aria-invalid')).toBeNull();
    expect(field('code').getAttribute('data-invalid')).toBeNull();
    expect(describedBy(input('code'))).not.toContain(messagesId);
    // The hint survives the round trip — only the error id is withdrawn.
    expect(describedBy(input('code'))).toContain(el.querySelector('[hlmFieldDescription]')!.id);
  });

  it('does not announce messages as a live region (130 D3)', async () => {
    const { field, refuse } = await setup();

    await refuse({ code: ['Code is already in use.'] });

    // A field message arrives after a round trip, not while typing. A status or
    // alert role here would re-announce the field on every keystroke of the
    // correction; the control's aria-describedby is what carries it instead. The
    // *form-level* refusal alert (130 P1.3) is the live region.
    const messages = field('code').querySelector('[data-slot="field-messages"]')!;
    expect(messages.getAttribute('role')).toBeNull();
    expect(messages.getAttribute('aria-live')).toBeNull();
    expect(messages.querySelector('[role="alert"], [role="status"], [aria-live]')).toBeNull();
  });

  it('still reflects the Angular control when nothing came back from the server', async () => {
    const { fixture, field, input } = await setup();

    // Brain's own path: a client-side validator failing must reach the same
    // attributes as a 422 does, or a form would have two invalid states.
    fixture.componentInstance.code.addValidators(Validators.required);
    fixture.componentInstance.code.updateValueAndValidity();
    await fixture.whenStable();

    expect(input('code').getAttribute('aria-invalid')).toBe('true');
    expect(field('code').getAttribute('data-invalid')).toBe('true');
  });

  it('reports no axe violations, refused or clean', async () => {
    const { el, refuse } = await setup();

    const clean = await axe(el);
    expect(
      clean.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`),
    ).toEqual([]);

    await refuse({ code: ['Code is already in use.'], name: ['Name is required.'] });

    const refused = await axe(el);
    expect(
      refused.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`,
      ),
    ).toEqual([]);
  });

  it('paints only from the token layer', async () => {
    const { el, refuse } = await setup();
    await refuse({ code: ['Code is already in use.'] });

    // The message ink is --destructive-soft-fg, read through var() rather than a
    // minted utility (tokens.css says that token is deliberately unregistered).
    // `text-destructive` would be the obvious choice and measures 4.38:1 on the
    // page surface — below AA, the same trap the token was created for.
    const messages = el.querySelector('[data-slot="field-messages"] p')!;
    expect(messages.getAttribute('class')).toContain('text-(--destructive-soft-fg)');

    expectOnlyTokenColours(el);
  });
});
