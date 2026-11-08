import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { expectOnlyTokenColours } from '@lore/ui/testing';
// @ts-expect-error the builder's text loader yields the sheet as a string; there is no type for it.
import componentsCss from '../../../../theme/components.css' with { loader: 'text' };
import { HlmInput } from './hlm-input';

@Component({
  imports: [HlmInput, HlmFieldImports],
  template: `
    <hlm-field [messages]="messages()">
      <label hlmLabel>Notes</label>
      <input hlmInput data-testid="text" placeholder="SKU" />
      <textarea hlmInput data-testid="multiline"></textarea>
      <select hlmInput data-testid="picker"><option>Each</option></select>
    </hlm-field>

    <input hlmInput data-testid="bare" aria-label="Loose" [aria-describedby]="'external-hint'" />
    <p id="external-hint">Set by the caller.</p>
  `,
})
class Host {
  readonly messages = signal<readonly string[]>([]);
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    at: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
  };
}

describe('HlmInput', () => {
  it('sits on the shared .lore-ctl control contract, corrected for text entry', async () => {
    const { at } = await setup();
    const classes = [...at('text').classList];

    // The metrics, radius, focus ring and disabled story come from
    // theme/components.css, so every control in the lore family retunes at once.
    expect(classes).toContain('lore-ctl');
    // …and the corrections a writing surface needs against a base written for
    // buttons: full width, left-aligned, a text caret rather than a pointer.
    expect(classes).toEqual(
      expect.arrayContaining(['block', 'w-full', 'text-start', 'cursor-text', 'select-text']),
    );
  });

  it('gives a select the pointer of a picker, not the caret of a text field', async () => {
    const { at } = await setup();
    const classes = [...at('picker').classList];

    expect(at('picker').tagName).toBe('SELECT');
    expect(classes).toEqual(
      expect.arrayContaining(['lore-ctl', 'cursor-pointer', 'select-none']),
    );
    expect(classes).not.toContain('cursor-text');
    expect(classes).not.toContain('select-text');
    // Utilities outrank `.lore-ctl:disabled`, so the disabled pointer is restated.
    expect(classes).toContain('disabled:cursor-not-allowed');
    // The text controls keep their caret.
    expect([...at('text').classList]).not.toContain('cursor-pointer');
    expect([...at('multiline').classList]).toContain('cursor-text');
  });

  it('restates the disabled pointer on every control, since utilities outrank .lore-ctl', async () => {
    const { at } = await setup();

    for (const id of ['text', 'multiline', 'picker']) {
      expect([...at(id).classList]).toContain('disabled:cursor-not-allowed');
    }
  });

  it('paints from the semantic surface tokens, not the variant matrix', async () => {
    const { el, at } = await setup();
    const classes = [...at('text').classList];

    // solid/soft/outlined/plain is an *emphasis* axis for an actionable control;
    // a text field has none, so it takes the input hairline and the page surface
    // rather than a --vc channel.
    expect(classes).toEqual(
      expect.arrayContaining(['border-input', 'bg-background', 'text-foreground']),
    );
    expect(at('text').hasAttribute('data-variant')).toBe(false);
    expect(at('text').hasAttribute('data-color')).toBe(false);

    expectOnlyTokenColours(el);
  });

  it('accepts a textarea as the same control, unpinned from the one-line height', async () => {
    const { at } = await setup();

    expect(at('multiline').tagName).toBe('TEXTAREA');
    expect([...at('multiline').classList]).toEqual(
      expect.arrayContaining(['lore-ctl', 'h-auto', 'field-sizing-content', 'resize-y']),
    );
    // The single-line control must NOT pick the textarea metrics up.
    expect([...at('text').classList]).not.toContain('h-auto');
  });

  it('marks itself invalid only through the field, and only when the field is', async () => {
    const { fixture, at } = await setup();

    expect(at('text').getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.messages.set(['Notes are too long.']);
    await fixture.whenStable();

    // A 422 leaves the Angular control valid, so brain's own aria-invalid stays
    // silent; HlmField's union is what reaches the control.
    expect(at('text').getAttribute('aria-invalid')).toBe('true');

    // A control with no field around it has nothing to read and stays quiet.
    expect(at('bare').getAttribute('aria-invalid')).toBeNull();
  });

  it("merges the caller's aria-describedby rather than replacing it", async () => {
    const { at } = await setup();

    // BrnFieldControlDescribedBy is forwarded with its `aria-describedby` input,
    // so an id the caller supplies survives alongside the field's own.
    expect(at('bare').getAttribute('aria-describedby')).toBe('external-hint');
  });

  it('generates an id so a form never has to invent one', async () => {
    const { at } = await setup();

    expect(at('text').id).toBeTruthy();
    expect(at('multiline').id).toBeTruthy();
    expect(at('text').id).not.toBe(at('multiline').id);
  });
});

/**
 * The caller-owned half of the ARIA story: a control that is NOT inside a field
 * computes its own invalid state and description (lore-dam's rules-panel rows),
 * and a control inside one must still be driven by the field.
 */
@Component({
  imports: [HlmInput, HlmFieldImports, ReactiveFormsModule],
  template: `
    <input hlmInput data-testid="loose" aria-label="Loose" [aria-invalid]="looseInvalid()"
      [aria-describedby]="hint()" />
    <input hlmInput data-testid="loose-control" aria-label="Loose, with a control"
      [formControl]="required" [aria-invalid]="controlOverride()" />
    <p id="hint-a">First hint.</p>
    <p id="hint-b">Second hint.</p>

    <hlm-field [messages]="messages()">
      <label hlmLabel>Code</label>
      <input hlmInput data-testid="fielded" [formControl]="code" [aria-describedby]="hint()" />
      <p hlmFieldDescription>Unique within the tenant.</p>
    </hlm-field>
  `,
})
class CallerHost {
  readonly looseInvalid = signal<boolean | null>(true);
  readonly controlOverride = signal<boolean | null>(null);
  readonly hint = signal('hint-a');
  readonly messages = signal<readonly string[]>([]);
  readonly required = new FormControl('', Validators.required);
  readonly code = new FormControl('A0', Validators.required);
}

async function setupCaller() {
  await TestBed.configureTestingModule({
    imports: [CallerHost],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(CallerHost);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    at: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
    settle: () => fixture.whenStable(),
  };
}

describe('HlmInput, ARIA the caller owns', () => {
  it("outside a field, the caller's [aria-invalid] survives first render and tracks updates", async () => {
    const { host, at, settle } = await setupCaller();

    // Brain's BrnInput host binding writes null here on the first pass; the
    // caller's value must still be what lands.
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
    const { host, at, settle } = await setupCaller();

    host.required.markAsTouched();
    host.required.updateValueAndValidity();
    await settle();
    expect(at('loose-control').getAttribute('aria-invalid')).toBe('true');

    host.controlOverride.set(false);
    await settle();
    expect(at('loose-control').getAttribute('aria-invalid')).toBeNull();

    // The caller's true holds while brain's answer flips under it.
    host.controlOverride.set(true);
    await settle();
    host.required.setValue('filled');
    await settle();
    expect(at('loose-control').getAttribute('aria-invalid')).toBe('true');
  });

  it("inside a field, the field's invalid state drives aria-invalid", async () => {
    const { host, at, settle } = await setupCaller();

    expect(at('fielded').getAttribute('aria-invalid')).toBeNull();

    host.messages.set(['Code is taken.']);
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBe('true');

    // Brain rewrites the attribute when the control's validity flips; the
    // field's messages still hold it invalid.
    host.code.setValue('A1');
    await settle();
    host.code.setValue('');
    await settle();
    host.code.setValue('A2');
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBe('true');

    host.messages.set([]);
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBeNull();
  });

  it("outside a field, the caller's [aria-describedby] survives first render and tracks updates", async () => {
    const { host, at, settle } = await setupCaller();

    expect(at('loose').getAttribute('aria-describedby')).toBe('hint-a');

    host.hint.set('hint-b');
    await settle();
    expect(at('loose').getAttribute('aria-describedby')).toBe('hint-b');
  });

  it("inside a field, the caller's [aria-describedby] merges with the field's ids", async () => {
    const { host, at, settle } = await setupCaller();
    const ids = () => (at('fielded').getAttribute('aria-describedby') ?? '').split(/\s+/);

    expect(ids()).toContain('hint-a');
    expect(ids().length).toBe(2);

    host.hint.set('hint-b');
    host.messages.set(['Code is taken.']);
    await settle();
    expect(ids()).toContain('hint-b');
    expect(ids()).not.toContain('hint-a');
    expect(ids().length).toBe(3);
  });
});

/** The canonical textarea: `textarea[hlmInput]` takes the same caller-owned ARIA as an input. */
@Component({
  imports: [HlmInput, HlmFieldImports, ReactiveFormsModule],
  template: `
    <textarea hlmInput data-testid="loose" aria-label="Comment" [formControl]="comment"
      [aria-invalid]="showError()"></textarea>

    <hlm-field [messages]="messages()">
      <label hlmLabel>Reason</label>
      <textarea hlmInput data-testid="fielded" [formControl]="reason"></textarea>
    </hlm-field>
  `,
})
class TextareaHost {
  readonly showError = signal<boolean | null>(true);
  readonly messages = signal<readonly string[]>([]);
  readonly comment = new FormControl('');
  readonly reason = new FormControl('A0', Validators.required);
}

describe('HlmInput on a textarea, ARIA the caller owns', () => {
  async function setupTextarea() {
    await TestBed.configureTestingModule({
      imports: [TextareaHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(TextareaHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      host: fixture.componentInstance,
      at: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
      settle: () => fixture.whenStable(),
    };
  }

  it("outside a field, the caller's [aria-invalid] survives first render over a valid control", async () => {
    const { host, at, settle } = await setupTextarea();

    expect(at('loose').tagName).toBe('TEXTAREA');
    expect(at('loose').getAttribute('aria-invalid')).toBe('true');

    host.comment.setValue('typed');
    await settle();
    expect(at('loose').getAttribute('aria-invalid')).toBe('true');

    host.showError.set(false);
    await settle();
    expect(at('loose').getAttribute('aria-invalid')).toBeNull();
  });

  it("inside a field, the field's messages hold aria-invalid while the control's validity flips", async () => {
    const { host, at, settle } = await setupTextarea();

    expect(at('fielded').getAttribute('aria-invalid')).toBeNull();

    host.messages.set(['A reason is required for this transition.']);
    await settle();
    host.reason.setValue('');
    await settle();
    host.reason.setValue('A1');
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBe('true');

    host.messages.set([]);
    await settle();
    expect(at('fielded').getAttribute('aria-invalid')).toBeNull();
  });
});

/** `input[type=file]` is a picker: a pointer, and the browser's button painted as a quiet key. */
@Component({
  imports: [HlmInput, HlmFieldImports],
  template: `
    <hlm-field [messages]="messages()">
      <label hlmLabel>Certificate</label>
      <input hlmInput type="file" data-testid="file" />
    </hlm-field>
    <input hlmInput type="file" data-testid="file-off" aria-label="Locked" disabled />

    <input hlmInput data-testid="text" aria-label="Text" />
    <textarea hlmInput data-testid="multiline" aria-label="Notes"></textarea>
    <select hlmInput data-testid="picker" aria-label="Unit"><option>Each</option></select>
  `,
})
class FileHost {
  readonly messages = signal<readonly string[]>([]);
}

describe('HlmInput on a file input', () => {
  async function setupFile() {
    await TestBed.configureTestingModule({
      imports: [FileHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(FileHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      el,
      host: fixture.componentInstance,
      at: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
      classesOf: (id: string) => [...el.querySelector(`[data-testid="${id}"]`)!.classList],
      settle: () => fixture.whenStable(),
    };
  }

  it('takes the pointer of a picker and none of the text caret', async () => {
    const { classesOf } = await setupFile();
    const classes = classesOf('file');

    expect(classes).toEqual(
      expect.arrayContaining(['lore-ctl', 'block', 'w-full', 'cursor-pointer', 'select-none']),
    );
    expect(classes).not.toContain('cursor-text');
    expect(classes).not.toContain('select-text');
    // The disabled pointer is restated for the control and for its button.
    expect(classes).toEqual(
      expect.arrayContaining(['disabled:cursor-not-allowed', 'disabled:file:cursor-not-allowed']),
    );
  });

  it('paints the file button as an edged sm-height key from the semantic tokens', async () => {
    const { el, classesOf } = await setupFile();
    const classes = classesOf('file');

    expect(classes).toEqual(
      expect.arrayContaining([
        'file:h-(--control-h-sm)',
        'file:border-muted-foreground',
        'file:bg-secondary',
        'file:text-secondary-foreground',
        'enabled:hover:file:bg-accent',
        'enabled:hover:file:text-accent-foreground',
        'py-[calc((var(--control-h-md)-var(--control-h-sm))/2-1px)]',
      ]),
    );
    // The control around the button keeps the text field's surface and invalid hairline.
    expect(classes).toEqual(
      expect.arrayContaining([
        'border-input',
        'bg-background',
        'aria-[invalid=true]:border-destructive',
      ]),
    );

    expectOnlyTokenColours(el);
  });

  it('edges the file button with a token hairline that turns primary on hover, enabled only', async () => {
    const { el, classesOf } = await setupFile();
    const classes = classesOf('file');

    // The secondary fill alone is 1.03:1 on the light control; the edge carries the shape.
    expect(classes).toEqual(
      expect.arrayContaining([
        'file:border',
        'file:border-muted-foreground',
        'enabled:hover:file:border-primary',
      ]),
    );
    expect(classes.filter((c) => c.startsWith('hover:file:'))).toEqual([]);
    // Disabled dimming stays .lore-ctl's opacity: nothing repaints the button when disabled.
    expect(classesOf('file-off').filter((c) => c.startsWith('disabled:file:'))).toEqual([
      'disabled:file:cursor-not-allowed',
    ]);

    expectOnlyTokenColours(el);
  });

  it('is marked invalid through its field, like every hlmInput control', async () => {
    const { host, at, settle } = await setupFile();

    expect(at('file').id).toBeTruthy();
    expect(at('file').getAttribute('aria-invalid')).toBeNull();

    host.messages.set(['Only PDF files are accepted.']);
    await settle();
    expect(at('file').getAttribute('aria-invalid')).toBe('true');
    expect((at('file-off') as HTMLInputElement).disabled).toBe(true);
  });

  it('leaves the text input and select class for class as at 0.7.0, the textarea as at 0.9.4', async () => {
    const { classesOf } = await setupFile();
    const shared =
      'block w-full text-start font-normal disabled:cursor-not-allowed border-input ' +
      'bg-background text-foreground placeholder:text-muted-foreground ' +
      'aria-[invalid=true]:border-destructive lore-ctl';
    const sorted = (s: string) => s.split(' ').sort();

    expect(classesOf('text').sort()).toEqual(sorted(`${shared} cursor-text select-text`));
    expect(classesOf('multiline').sort()).toEqual(
      sorted(
        `${shared} cursor-text select-text h-auto field-sizing-content resize-y py-2 whitespace-pre-wrap ` +
          `${GROW_MIN} ${GROW_MAX}`,
      ),
    );
    expect(classesOf('picker').sort()).toEqual(sorted(`${shared} cursor-pointer select-none`));
    // None of them picks up the file button's rules.
    for (const id of ['text', 'multiline', 'picker']) {
      expect(classesOf(id).some((c) => c.includes('file:'))).toBe(false);
    }
  });
});

const GROW_MIN = 'min-h-[max(4rem,calc(var(--textarea-rows,2)*1lh+var(--spacing)*4+2px))]';
const GROW_MAX = 'max-h-[calc(12lh+var(--spacing)*4+2px)]';

/** A textarea grows with its text between a `rows` floor and a 12-line cap; jsdom has no layout, so this pins the contract. */
@Component({
  imports: [HlmInput],
  template: `
    <textarea hlmInput data-testid="rows" rows="3" aria-label="Notes"></textarea>
    <textarea hlmInput data-testid="no-rows" aria-label="Reason"></textarea>
    <textarea
      hlmInput
      data-testid="taller"
      rows="2"
      class="min-h-32 max-h-40"
      aria-label="Method"
    ></textarea>
    <input hlmInput data-testid="line" aria-label="Code" />
    <select hlmInput data-testid="picker" aria-label="Unit"><option>Each</option></select>
  `,
})
class GrowHost {}

describe('HlmInput on a textarea, growing with its content', () => {
  async function setupGrow() {
    await TestBed.configureTestingModule({
      imports: [GrowHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(GrowHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      at: (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
      classesOf: (id: string) => [...el.querySelector(`[data-testid="${id}"]`)!.classList],
    };
  }

  it('sizes to its content between a rows floor and a 12-line cap, keeping the drag handle', async () => {
    const { classesOf } = await setupGrow();

    expect(classesOf('rows')).toEqual(
      expect.arrayContaining(['field-sizing-content', 'h-auto', 'resize-y', GROW_MIN, GROW_MAX]),
    );
    // Padding, radius, focus ring and density stay on .lore-ctl and py-2.
    expect(classesOf('rows')).toEqual(expect.arrayContaining(['lore-ctl', 'py-2']));
  });

  it('carries its rows attribute into the min height, since field-sizing ignores rows', async () => {
    const { at } = await setupGrow();

    expect(at('rows').style.getPropertyValue('--textarea-rows')).toBe('3');
    expect(at('rows').getAttribute('rows')).toBe('3');
    // No rows attribute: the class falls back to the HTML default of 2.
    expect(at('no-rows').style.getPropertyValue('--textarea-rows')).toBe('');
  });

  it("lets the caller's min-h and max-h win over the growth bounds", async () => {
    const { classesOf } = await setupGrow();
    const classes = classesOf('taller');

    expect(classes).toEqual(
      expect.arrayContaining(['min-h-32', 'max-h-40', 'field-sizing-content']),
    );
    expect(classes).not.toContain(GROW_MIN);
    expect(classes).not.toContain(GROW_MAX);
  });

  it('leaves the single-line input and the select fixed-size', async () => {
    const { at, classesOf } = await setupGrow();

    for (const id of ['line', 'picker']) {
      const classes = classesOf(id);
      expect(classes.some((c) => c.startsWith('field-sizing'))).toBe(false);
      expect(classes.some((c) => c.startsWith('min-h-') || c.startsWith('max-h-'))).toBe(false);
      expect(classes).not.toContain('resize-y');
      expect(at(id).style.getPropertyValue('--textarea-rows')).toBe('');
    }
  });
});

describe('HlmInput under the pointer', () => {
  // Every selector in theme/components.css that moves an element while :active.
  const pressSelectors = [
    ...(componentsCss as string).matchAll(/([^{}]*:active[^{}]*)\{([^{}]*)\}/g),
  ]
    .filter(([, , body]) => /\btranslate\s*:/.test(body))
    .map(([, selector]) => selector.replace(/\/\*[\s\S]*?\*\//g, '').trim());

  it('never moves a field while the mouse is held on it, though a button still presses', async () => {
    const { el, at } = await setup();
    const button = document.createElement('button');
    button.className = 'lore-ctl';
    el.append(button);
    // :active is stripped so jsdom can answer "would this rule reach the element?".
    const reaches = (node: Element) =>
      pressSelectors.some((selector) => node.matches(selector.replaceAll(':active', '')));

    expect(pressSelectors.length).toBeGreaterThan(0);
    expect(reaches(button)).toBe(true);
    for (const id of ['text', 'multiline', 'picker', 'bare']) {
      expect(reaches(at(id))).toBe(false);
    }
  });
});
