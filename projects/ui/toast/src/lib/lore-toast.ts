import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

/**
 * What a toast may carry besides its message. Deliberately not brain's
 * `ExternalToast`: `duration`, `important`, `action` and `id` are decisions this
 * service makes on the caller's behalf (see below), and an options bag that
 * forwarded them would be a way to route around every rule in this file.
 */
export interface LoreToastOptions {
  /** One short line of detail under the message. Not a place for a stack trace. */
  readonly description?: string;
}

/** A success is confirmation of something the maker already expects. */
const SUCCESS_DURATION_MS = 4000;

/**
 * A failure has to survive being read late — a maker who pressed Save and
 * looked away needs the message still there when they look back. Long, and
 * still finite: see the durable-channel rule below for why it may end.
 */
const FAILURE_DURATION_MS = 8000;

/**
 * The one way the application speaks about a **command** (plan 130 D6).
 *
 * ## One failure convention, three placements — 105's open question 1, closed
 *
 * The placement is decided by *what failed*, never by which surface is handy:
 *
 *   · **A read that fails renders its failure where the data would have been.**
 *     That is `LoreTable`'s error body (105 P1.1) — the message, the trace id,
 *     and a retry when the feature says the failure is worth re-asking. A toast
 *     over an empty table repeats what the empty table has already said, and
 *     then disappears. **Do not fire a toast from a resource loader, a route
 *     resolver or an HTTP interceptor**; that is the second convention this
 *     ruling exists to prevent.
 *   · **A command the maker issued speaks — here.** They pressed a button and
 *     moved on; saved / archived / restored, and the transient failures of
 *     those, are exactly the messages that are right to vanish.
 *   · **A refusal a maker must fix stays on the form.** A `422` lands as field
 *     messages beside the inputs that caused it (`HlmField`, 130 D3 — which is
 *     why 020 keys them by field name) plus one `LoreAlert` summarising that the
 *     save was refused. It does **not** come here: a maker cannot fix six fields
 *     from a message that has already faded.
 *
 * ## The durable-channel rule, which is what makes a disappearing message safe
 *
 * **A toast is never the only channel for anything.** Every message this
 * service sends has somewhere permanent to be read:
 *
 *   · a success is confirmed by the data itself — the row, the detail panel or
 *     the list the command changed now shows the new state, and a maker who
 *     never saw the toast loses nothing;
 *   · a command failure is confirmed by the *absence* of the change — the record
 *     still reads as it did, and the button that failed is still there to press
 *     again;
 *   · anything a maker must act on to recover is not a toast at all. It is a
 *     `LoreAlert` on the surface it concerns, or field messages on the form.
 *
 * Adding a case that breaks that rule means the case is in the wrong channel,
 * not that the toast needs a longer duration.
 *
 * ## Politeness, which is the part that is usually got wrong
 *
 * Brain renders each toast as `role="status"`/`aria-atomic`, with `aria-live`
 * following the toast's `important` flag. So:
 *
 *   · **a success is polite.** The maker asked for it and is looking at the
 *     surface that changed; cutting off whatever their screen reader is reading
 *     to confirm the expected is noise, and polite still gets announced.
 *   · **a failure is assertive.** The thing the maker asked for did not happen,
 *     and the next thing they do — navigate away, close the tab, tell someone
 *     the batch is recorded — is chosen on the belief that it did. That is the
 *     definition of a message that has earned an interruption.
 *
 * Neither takes focus. Brain never moves it on its own; `alt+T` moves it *into*
 * the region when a maker asks, which is the correct shape — the announcement
 * comes to them, and the region is reachable if they want it.
 *
 * ## It takes a message and never an `ApiError`
 *
 * The caller decides what a failure says, for the same reason `HlmField` takes
 * strings and `LoreTable` takes its `retryable` flag from the feature (D1, and
 * 105 C2's inversion): a problem document's `title` is written for an operator
 * reading a log, and `ui/` importing `core/api` points the dependency backwards.
 *
 * **There is no `Retry-After` here, and no timer** (105 C4, ruled again by D6).
 * `ApiError` discards the response headers, so the advisory copy does not exist
 * to render; the retry is the maker pressing the button again. If a later plan
 * wants "try again in a few seconds", the order is unchanged: preserve the
 * header on `ApiError` **first**, then render it as **copy only, never as a
 * delay** — an automatic retry against a server that has just said "not right
 * now" is how a blip becomes an outage (105 D2).
 *
 * ## Using it
 *
 * ```ts
 * private readonly toast = inject(LoreToast);
 *
 * this.toast.success('Material saved.');
 * this.toast.failure("Couldn't archive this material.", { description: 'Try again.' });
 * ```
 *
 * Requires exactly one `<hlm-toaster />` mounted in the application shell.
 */
@Injectable({ providedIn: 'root' })
export class LoreToast {
  /**
   * A command the maker issued succeeded. Announced politely.
   *
   * Say what happened in the past tense and name the thing — "Material saved."
   * beats "Success". The screen behind it is the durable record.
   */
  success(message: string, options?: LoreToastOptions): void {
    toast.success(message, {
      description: options?.description,
      duration: SUCCESS_DURATION_MS,
      important: false,
    });
  }

  /**
   * A command the maker issued failed, transiently — the kind of failure whose
   * fix is pressing the button again. Announced assertively.
   *
   * **A validation refusal is not this.** A `422` goes to the form (see the
   * ruling above); sending one here would hide the only information that can
   * resolve it behind an eight-second timer.
   */
  failure(message: string, options?: LoreToastOptions): void {
    toast.error(message, {
      description: options?.description,
      duration: FAILURE_DURATION_MS,
      important: true,
    });
  }
}
