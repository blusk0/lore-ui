import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { axe } from 'vitest-axe';
import { LoreButton } from '@lore/ui/button';
import { expectOnlyTokenColours } from '@lore/ui/testing';
import { LoreAlert, type LoreAlertTone } from './lore-alert';

/**
 * The host composes the alert as 140's form will: a refusal summary that appears
 * beside the field messages, and an informational condition on the same page —
 * two tones at once, because the property that matters is not "an alert renders"
 * but "the loud one is the failure and the quiet one is not". The advisory and
 * the confirmation sit beside them: coloured, and still quiet.
 */
@Component({
  imports: [LoreAlert, LoreButton],
  template: `
    @if (refused()) {
      <lore-alert [tone]="tone()" heading="This material wasn't saved.">
        Fix the fields marked below and try again.
        <button loreBtn variant="outlined" size="sm">Try again</button>
      </lore-alert>
    }

    <lore-alert tone="info" heading="This material is archived." />
    <lore-alert tone="warning" heading="This material is used by 3 open orders." />
    <lore-alert tone="success" heading="All 12 rows were imported." />
  `,
})
class Host {
  readonly refused = signal(false);
  readonly tone = signal<LoreAlertTone>('danger');
}

/**
 * lore-dam's shapes: explanatory boxes written into the template as
 * `role="note"`, a box whose role the feature decides at runtime, and the four
 * tones left to choose their own role.
 */
@Component({
  imports: [LoreAlert],
  template: `
    <lore-alert tone="info" role="note" heading="Archived materials stay readable." />
    <lore-alert tone="warning" role="note" heading="Imports skip rows without a SKU." />
    <lore-alert data-testid="bound" tone="info" [role]="role()" heading="Session ending." />
    @for (tone of tones; track tone) {
      <lore-alert data-testid="default" [tone]="tone" />
    }
  `,
})
class RoleHost {
  readonly role = signal<string | null>('alert');
  readonly tones: LoreAlertTone[] = ['danger', 'warning', 'success', 'info'];
}

async function setupRoles() {
  await TestBed.configureTestingModule({
    imports: [RoleHost],
    providers: [provideZonelessChangeDetection()],
  }).compileComponents();

  const fixture = TestBed.createComponent(RoleHost);
  await fixture.whenStable();

  const el = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    el,
    notes: () => [...el.querySelectorAll<HTMLElement>('lore-alert[data-tone]')].slice(0, 2),
    bound: () => el.querySelector<HTMLElement>('lore-alert[data-testid="bound"]')!,
    defaults: () => [...el.querySelectorAll<HTMLElement>('lore-alert[data-testid="default"]')],
  };
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
    notice: () => el.querySelector<HTMLElement>('lore-alert[data-tone="info"]')!,
    advisory: () => el.querySelector<HTMLElement>('lore-alert[data-tone="warning"]')!,
    confirmation: () => el.querySelector<HTMLElement>('lore-alert[data-tone="success"]')!,
    refusal: () => el.querySelector<HTMLElement>('lore-alert[data-tone="danger"]'),
    async refuse() {
      fixture.componentInstance.refused.set(true);
      await fixture.whenStable();
    },
  };
}

describe('LoreAlert', () => {
  it('announces a refusal assertively, as role="alert"', async () => {
    const { refusal, refuse } = await setup();

    // Not present until the server refuses — and inserted *with* its content, so
    // the live region has something to announce at the moment it appears.
    expect(refusal()).toBeNull();

    await refuse();

    // role="alert" is implicitly assertive and implicitly atomic. This is the one
    // assertion the tone axis exists to make true: a maker who must fix something
    // is interrupted, and a maker reading a notice is not.
    expect(refusal()!.getAttribute('role')).toBe('alert');
  });

  it('announces an informational condition politely, as role="status"', async () => {
    const { notice } = await setup();

    expect(notice().getAttribute('role')).toBe('status');
    // …and emphatically not the assertive role. An ordinary page condition that
    // cuts off whatever a screen reader is reading is the same defect as a silent
    // failure, in the other direction.
    expect(notice().getAttribute('role')).not.toBe('alert');
  });

  it('announces an advisory politely too — it advises, it reports no failure', async () => {
    const { advisory } = await setup();

    // Coloured like a caution, but nothing has failed and nothing must be done
    // this second, so it does not earn an interruption.
    expect(advisory().getAttribute('role')).toBe('status');
  });

  it('announces a confirmation politely, as role="status"', async () => {
    const { confirmation } = await setup();

    expect(confirmation().getAttribute('role')).toBe('status');
  });

  it('renders its heading and its projected body, heading first', async () => {
    const { refusal, refuse } = await setup();
    await refuse();

    const alert = refusal()!;
    expect(alert.querySelector('[data-slot="alert-heading"]')!.textContent).toContain(
      "This material wasn't saved.",
    );
    expect(alert.querySelector('[data-slot="alert-body"]')!.textContent).toContain(
      'Fix the fields marked below and try again.',
    );

    // A recovery affordance is projected content, not an output on this
    // component: the button is the same lore control as everywhere else, and the
    // feature owns what pressing it does.
    expect(alert.querySelector('button.lore-ctl')).toBeTruthy();

    // The heading is read before the body — an atomic live region announces the
    // whole subtree in document order, so the order is the message.
    const slots = [...alert.querySelectorAll('[data-slot^="alert-"]')].map((node) =>
      node.getAttribute('data-slot'),
    );
    expect(slots).toEqual(['alert-heading', 'alert-body']);
  });

  it('paints the danger wash and its ink from the token layer', async () => {
    const { el, refusal, refuse } = await setup();
    await refuse();

    const classes = refusal()!.getAttribute('class') ?? '';
    // The pairing tokens.css measured for the table's failure body: 8% of
    // --destructive under --destructive-soft-fg. `text-destructive` on the same
    // wash is 4.06:1 and fails AA — the trap that token was created for.
    expect(classes).toContain('bg-destructive/8');
    expect(classes).toContain('text-(--destructive-soft-fg)');

    expectOnlyTokenColours(el);
  });

  it('paints the informational tone from the neutral surface tokens', async () => {
    const { notice } = await setup();

    const classes = notice().getAttribute('class') ?? '';
    expect(classes).toContain('bg-muted');
    expect(classes).toContain('text-foreground');
    // Not a weaker failure: no destructive ink anywhere on the quiet tone.
    expect(classes).not.toContain('destructive');
  });

  it('paints the warning wash and its measured soft ink', async () => {
    const { el, advisory } = await setup();

    const classes = advisory().getAttribute('class') ?? '';
    // --warning itself on its 8% wash is 3.24:1; --warning-soft-fg is the ink
    // tokens.css measured for that wash.
    expect(classes).toContain('border-warning/30');
    expect(classes).toContain('bg-warning/8');
    expect(classes).toContain('text-(--warning-soft-fg)');
    expect(classes).not.toContain('destructive');

    expectOnlyTokenColours(el);
  });

  it('paints the success wash and its measured soft ink', async () => {
    const { el, confirmation } = await setup();

    const classes = confirmation().getAttribute('class') ?? '';
    expect(classes).toContain('border-success/30');
    expect(classes).toContain('bg-success/8');
    expect(classes).toContain('text-(--success-soft-fg)');
    expect(classes).not.toContain('destructive');

    expectOnlyTokenColours(el);
  });

  it('keeps a static role="note" — it reaches the input, and is no live region', async () => {
    const { fixture, notes } = await setupRoles();

    // The static attribute is the input's value, not just an attribute the host
    // binding would overwrite after first render.
    const first = fixture.debugElement.query(By.directive(LoreAlert));
    expect(first.componentInstance.role()).toBe('note');

    for (const note of notes()) {
      expect(note.getAttribute('role')).toBe('note');
      expect(note.hasAttribute('aria-live')).toBe(false);
    }

    // The tone still paints: a note is not a colourless box.
    expect(notes()[1].getAttribute('class')).toContain('text-(--warning-soft-fg)');
  });

  it('follows a bound [role], and falls back to the tone when it clears', async () => {
    const { fixture, bound } = await setupRoles();

    // A neutral tone that must still interrupt.
    expect(bound().getAttribute('role')).toBe('alert');

    fixture.componentInstance.role.set('note');
    await fixture.whenStable();
    expect(bound().getAttribute('role')).toBe('note');

    fixture.componentInstance.role.set(null);
    await fixture.whenStable();
    expect(bound().getAttribute('role')).toBe('status');
  });

  it('leaves the tone-derived role alone when no role is given', async () => {
    const { defaults } = await setupRoles();

    expect(defaults().map((alert) => alert.getAttribute('role'))).toEqual([
      'alert',
      'status',
      'status',
      'status',
    ]);
  });

  it('reports no axe violations, in any tone', async () => {
    const { el, refuse } = await setup();
    await refuse();

    const result = await axe(el);
    expect(
      result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`),
    ).toEqual([]);
  });
});
