import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { HlmTextarea } from './hlm-textarea';

/** Deprecated, but it must not be a trap: the same caller-owned ARIA as `HlmInput`. */
@Component({
  imports: [HlmTextarea, HlmFieldImports, ReactiveFormsModule],
  template: `
    <textarea hlmTextarea data-testid="loose" aria-label="Comment" [aria-invalid]="looseInvalid()"
      [aria-describedby]="hint()"></textarea>
    <textarea hlmTextarea data-testid="loose-control" aria-label="Comment, with a control"
      [formControl]="required" [aria-invalid]="controlOverride()"></textarea>
    <p id="hint-a">First hint.</p>
    <p id="hint-b">Second hint.</p>

    <hlm-field [messages]="messages()">
      <label hlmLabel>Reason</label>
      <textarea hlmTextarea data-testid="fielded" [formControl]="reason"></textarea>
    </hlm-field>
  `,
})
class CallerHost {
  readonly looseInvalid = signal<boolean | null>(true);
  readonly controlOverride = signal<boolean | null>(null);
  readonly hint = signal('hint-a');
  readonly messages = signal<readonly string[]>([]);
  readonly required = new FormControl('', Validators.required);
  readonly reason = new FormControl('A0', Validators.required);
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [CallerHost],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(CallerHost);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  return {
    host: fixture.componentInstance,
    at: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
    settle: () => fixture.whenStable(),
  };
}

describe('HlmTextarea, ARIA the caller owns', () => {
  it("outside a field, the caller's [aria-invalid] survives first render and tracks updates", async () => {
    const { host, at, settle } = await setup();

    // BrnTextarea's host binding writes null here on the first pass.
    expect(at('loose').getAttribute('aria-invalid')).toBe('true');

    host.looseInvalid.set(false);
    await settle();
    expect(at('loose').getAttribute('aria-invalid')).toBeNull();

    host.looseInvalid.set(true);
    await settle();
    expect(at('loose').getAttribute('aria-invalid')).toBe('true');

    host.looseInvalid.set(null);
    await settle();
    expect(at('loose').getAttribute('aria-invalid')).toBeNull();
  });

  it("outside a field, brain's control validity stands until the caller says otherwise", async () => {
    const { host, at, settle } = await setup();

    host.required.markAsTouched();
    host.required.updateValueAndValidity();
    await settle();
    expect(at('loose-control').getAttribute('aria-invalid')).toBe('true');

    host.controlOverride.set(false);
    await settle();
    expect(at('loose-control').getAttribute('aria-invalid')).toBeNull();

    host.controlOverride.set(true);
    await settle();
    host.required.setValue('filled');
    await settle();
    expect(at('loose-control').getAttribute('aria-invalid')).toBe('true');
  });

  it("inside a field, the field's invalid state drives aria-invalid", async () => {
    const { host, at, settle } = await setup();

    expect(at('fielded').getAttribute('aria-invalid')).toBeNull();

    host.messages.set(['A reason is required.']);
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBe('true');

    host.reason.setValue('');
    await settle();
    host.reason.setValue('A1');
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBe('true');

    host.messages.set([]);
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBeNull();
  });

  it("outside a field, the caller's [aria-describedby] survives first render and tracks updates", async () => {
    const { host, at, settle } = await setup();

    expect(at('loose').getAttribute('aria-describedby')).toBe('hint-a');

    host.hint.set('hint-b');
    await settle();
    expect(at('loose').getAttribute('aria-describedby')).toBe('hint-b');
  });
});
