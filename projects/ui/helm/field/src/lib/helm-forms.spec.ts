import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCheckboxImports } from '@lore/ui/helm/checkbox';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { HlmInput } from '@lore/ui/helm/input';
import { HlmRadioGroupImports } from '@lore/ui/helm/radio-group';
import { HlmSwitchImports } from '@lore/ui/helm/switch';
import { HlmTextarea } from '@lore/ui/helm/textarea';

/**
 * Tests our *composition* of the form primitives — CVA round-trips, Field
 * label/error wiring, disabled propagation. Brain's internals (focus-trap
 * order, typeahead timing) are upstream-tested and deliberately not covered.
 */
@Component({
  imports: [
    ReactiveFormsModule,
    HlmFieldImports,
    HlmInput,
    HlmTextarea,
    HlmRadioGroupImports,
    HlmCheckboxImports,
    HlmSwitchImports,
  ],
  template: `
    <form [formGroup]="form">
      <div hlmField>
        <label hlmFieldLabel for="name">Name</label>
        <input hlmInput id="name" formControlName="name" />
        <p hlmFieldDescription>Shown wherever the asset is listed.</p>
        <hlm-field-error validator="required">A name is required.</hlm-field-error>
      </div>

      <hlm-checkbox formControlName="archived" aria-label="Archived" />
      <hlm-switch formControlName="notify" aria-label="Notify on ingest" />

      <!-- A control the author describes by hand, outside any Field. -->
      <p id="slug-hint">Lowercase, no spaces.</p>
      <input hlmInput id="slug" formControlName="slug" aria-describedby="slug-hint" />

      <!-- Both at once: hand-written ids AND a Field that generates its own. -->
      <div hlmField>
        <label hlmFieldLabel for="caption">Caption</label>
        <input hlmInput id="caption" formControlName="caption" aria-describedby="caption-legal" />
        <p hlmFieldDescription>Shown under the image.</p>
      </div>
      <p id="caption-legal">Captions are published verbatim.</p>

      <!-- The other two controls that own the attribute the same way. -->
      <textarea hlmTextarea id="bio" formControlName="bio" aria-describedby="slug-hint"></textarea>
      <hlm-radio-group formControlName="vis" aria-describedby="slug-hint"></hlm-radio-group>
    </form>
  `,
})
class Host {
  readonly form = new FormGroup({
    name: new FormControl('', Validators.required),
    archived: new FormControl(false),
    notify: new FormControl(true),
    slug: new FormControl(''),
    caption: new FormControl(''),
    bio: new FormControl(''),
    vis: new FormControl(''),
  });
}

describe('helm form primitives (composition)', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, form: fixture.componentInstance.form };
  }

  it('wires the label to the input via a real for/id pair', async () => {
    const { el } = await setup();
    const label = el.querySelector('label')!;
    const input = el.querySelector('input#name')!;

    expect(label.getAttribute('for')).toBe('name');
    expect(input.id).toBe('name');
  });

  it('round-trips the input through the control (both directions)', async () => {
    const { fixture, el, form } = await setup();
    const input = el.querySelector<HTMLInputElement>('input#name')!;

    form.controls.name.setValue('coastline');
    await fixture.whenStable();
    expect(input.value).toBe('coastline');

    input.value = 'edited';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(form.controls.name.value).toBe('edited');
  });

  it('exposes checkbox/switch by role with the right ARIA state, and round-trips them', async () => {
    const { fixture, el, form } = await setup();

    // Query by role + accessible name — brain's contract, not our class strings.
    const checkbox = el.querySelector('[role="checkbox"]')!;
    const toggle = el.querySelector('[role="switch"]')!;

    expect(checkbox.getAttribute('aria-label')).toBe('Archived');
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    form.controls.archived.setValue(true);
    await fixture.whenStable();
    expect(checkbox.getAttribute('aria-checked')).toBe('true');

    (checkbox as HTMLElement).click();
    await fixture.whenStable();
    expect(form.controls.archived.value).toBe(false);
  });

  it('keeps a hand-written aria-describedby on hlmInput', async () => {
    const { el } = await setup();
    const input = el.querySelector('input#slug')!;

    // BrnFieldControlDescribedBy binds [attr.aria-describedby] on the host, so it
    // wins over anything the template wrote. hlm-input must expose its input or
    // the attribute is silently cleared.
    expect(input.getAttribute('aria-describedby')).toBe('slug-hint');
    expect(el.querySelector('[id="slug-hint"]')!.textContent).toContain('Lowercase');
  });

  it('merges the Field-generated description with the hand-written one', async () => {
    const { el } = await setup();
    const input = el.querySelector('input#caption')!;

    const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    expect(ids).toContain('caption-legal');

    // The Field's description id is generated; find it by what it points at.
    const generated = ids.filter((id) => id !== 'caption-legal');
    expect(generated.length).toBe(1);
    expect(el.querySelector(`[id="${generated[0]}"]`)!.textContent).toContain(
      'Shown under the image.',
    );
  });

  it('keeps a hand-written aria-describedby on hlmTextarea and hlm-radio-group too', async () => {
    const { el } = await setup();

    expect(el.querySelector('textarea#bio')!.getAttribute('aria-describedby')).toBe('slug-hint');
    // BrnRadioGroup puts role="radiogroup" on this very element, so the
    // description belongs on the host, not on an inner node.
    expect(el.querySelector('[role="radiogroup"]')!.getAttribute('aria-describedby')).toBe(
      'slug-hint',
    );
  });

  it('links the Field description to its control even with nothing hand-written', async () => {
    const { el } = await setup();
    const input = el.querySelector('input#name')!;

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(el.querySelector(`[id="${describedBy}"]`)!.textContent).toContain(
      'Shown wherever the asset is listed.',
    );
  });

  it('shows the Field error only once the control is touched + invalid, with role=alert', async () => {
    const { fixture, el, form } = await setup();

    expect(el.textContent).not.toContain('A name is required.');

    form.controls.name.markAsTouched();
    form.controls.name.updateValueAndValidity();
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert!.textContent).toContain('A name is required.');
  });

  it('propagates control.disable() to the DOM without a parallel [disabled] binding', async () => {
    const { fixture, el, form } = await setup();
    const input = el.querySelector<HTMLInputElement>('input#name')!;

    expect(input.disabled).toBe(false);

    form.disable();
    await fixture.whenStable();

    expect(input.disabled).toBe(true);

    // brain renders the checkbox as <button role="checkbox">, so disabling
    // surfaces as data-disabled + the native disabled attribute — not
    // aria-disabled. data-disabled is also what the preset's `data-disabled:`
    // style variant keys off, so appearance tracks it automatically.
    const checkbox = el.querySelector('[role="checkbox"]')!;
    expect(checkbox.getAttribute('data-disabled')).toBe('true');
    expect(checkbox.hasAttribute('disabled')).toBe(true);
  });
});

/** The two `HlmFieldError` forms side by side, so any divergence between them fails. */
@Component({
  imports: [ReactiveFormsModule, HlmFieldImports, HlmInput],
  template: `
    <div hlmField>
      <label hlmFieldLabel for="title">Title</label>
      <input hlmInput id="title" [formControl]="title" />
      <p hlmFieldError id="title-error" validator="required">A title is required.</p>
    </div>

    <div hlmField>
      <label hlmFieldLabel for="alt">Alt text</label>
      <input hlmInput id="alt" [formControl]="alt" />
      <hlm-field-error id="alt-error" validator="required">Alt text is required.</hlm-field-error>
    </div>
  `,
})
class ErrorFormsHost {
  readonly title = new FormControl('', Validators.required);
  readonly alt = new FormControl('', Validators.required);
}

describe('HlmFieldError, attribute and element forms', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [ErrorFormsHost] }).compileComponents();
    const fixture = TestBed.createComponent(ErrorFormsHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, host: fixture.componentInstance };
  }

  it('upgrades <p hlmFieldError> into the same error the element form is', async () => {
    const { el } = await setup();
    const error = el.querySelector('p#title-error')!;

    expect(error.getAttribute('data-slot')).toBe('field-error');
    expect(error.getAttribute('role')).toBe('alert');
    expect([...error.classList]).toContain('text-destructive');
    // Hidden, and its content not rendered, until the control is touched + invalid.
    expect(error.hasAttribute('hidden')).toBe(true);
    expect(error.textContent).not.toContain('A title is required.');
  });

  it('shows on touched + invalid and links itself into the control aria-describedby, like the element', async () => {
    const { fixture, el, host } = await setup();
    const describedBy = (id: string) =>
      (el.querySelector(`input#${id}`)!.getAttribute('aria-describedby') ?? '').split(/\s+/);

    expect(describedBy('title')).not.toContain('title-error');

    for (const control of [host.title, host.alt]) {
      control.markAsTouched();
      control.updateValueAndValidity();
    }
    await fixture.whenStable();

    const attr = el.querySelector('p#title-error')!;
    const element = el.querySelector('hlm-field-error#alt-error')!;
    expect(attr.hasAttribute('hidden')).toBe(false);
    expect(attr.textContent).toContain('A title is required.');
    expect(element.hasAttribute('hidden')).toBe(false);
    expect(describedBy('title')).toContain('title-error');
    expect(describedBy('alt')).toContain('alt-error');

    host.title.setValue('Coastline');
    await fixture.whenStable();
    expect(attr.hasAttribute('hidden')).toBe(true);
    expect(describedBy('title')).not.toContain('title-error');
  });
});
