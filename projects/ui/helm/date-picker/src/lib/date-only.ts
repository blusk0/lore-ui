/**
 * The boundary between a business date and a `Date`, in two pure functions
 * (plan 130 D4).
 *
 * ## Why this is a file of its own rather than two methods on the control
 *
 * A wrong answer here does not throw. It produces a batch record dated the day
 * before, which looks entirely ordinary until a maker is holding the jar — the
 * same failure shape as baseline B4, in a different unit. So the arithmetic is
 * separated from the component that uses it and tested directly, under the two
 * process timezones the plan names, rather than only through a rendered
 * calendar where a passing assertion could be passing for the wrong reason.
 *
 * ## The rule these two functions exist to hold
 *
 * **A `DateOnly` is a calendar day, not a point in time.** `2026-08-03` is the
 * third of August for the tenant, and it is the third of August in Honolulu, in
 * Kiritimati and on a server in Frankfurt. It has no timezone because there is
 * nothing to convert: converting it is the bug, not the feature.
 *
 * A `Date`, by contrast, is an instant, and every one of its accessors asks a
 * timezone what day that instant fell on. `new Date('2026-08-03')` parses as UTC
 * midnight and reports `getDate() === 2` anywhere west of Greenwich —
 * `BusinessDatePipe`'s class comment spells out the same trap from the render
 * side, and these two functions are the entry side of it.
 *
 * So the `Date` these functions produce is **anchored at UTC midnight and only
 * ever read through its UTC accessors**, which is the identical anchoring
 * `BusinessDatePipe` performs. The two agree because they do the same thing, not
 * because someone remembered to keep them in step.
 *
 * `BusinessDatePipe` is deliberately **not** imported here even though the rule
 * is shared: it lives in `core/api`, and 130 D1 keeps every type and every
 * dependency these components face inside `ui/`. What is shared is the rule, and
 * a rule is shared by being written down in both places.
 */

/** `DateOnly` on the wire: exactly `YYYY-MM-DD`, no time and no offset. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `YYYY-MM-DD` → the `Date` a calendar grid can work with, or `null`.
 *
 * The result is anchored at UTC midnight, so its UTC accessors report exactly
 * the digits that went in, whatever timezone the process is running under.
 *
 * **Refuses rather than repairs.** `2026-02-30` is not a date, and `Date.UTC`
 * would silently turn it into the 2nd of March — a value that then formats back
 * as a different day from the one that arrived. So the constructed date is
 * checked component by component against the digits it was built from, and
 * anything that did not survive that round trip is `null`. The same check
 * disposes of `2026-13-01` and of a 31st that a month does not have.
 *
 * Anything that is not exactly ten digits-and-dashes is `null` too — an ISO
 * instant (`2026-08-03T00:00:00Z`) included, because a control whose model is a
 * calendar day should not quietly accept a point in time and drop the part it
 * cannot hold.
 */
export function fromDateOnly(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parts = DATE_ONLY.exec(value);
  if (parts === null) {
    return null;
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);

  const anchored = new Date(Date.UTC(year, month - 1, day));
  const survived =
    anchored.getUTCFullYear() === year &&
    anchored.getUTCMonth() === month - 1 &&
    anchored.getUTCDate() === day;

  return survived ? anchored : null;
}

/**
 * A `Date` → the `YYYY-MM-DD` the model holds, or `null`.
 *
 * Read through the **UTC** accessors, which is what makes this the exact inverse
 * of `fromDateOnly` and what stops the day moving. The local accessors would
 * hand back the 2nd for a date the calendar highlighted as the 3rd, in every
 * timezone west of Greenwich, and would do it silently.
 *
 * A time of day is dropped rather than refused: brain's adapter hands out a full
 * instant for "now", and the calendar day that instant fell on **in UTC** is the
 * honest answer for a value that has no timezone of its own. Which day it was
 * for the tenant is a question about an instant, and `BusinessDatePipe` already
 * owns it — see this file's header, and 130 D4's last paragraph.
 */
export function toDateOnly(date: Date | null | undefined): string | null {
  if (date === null || date === undefined || Number.isNaN(date.getTime())) {
    return null;
  }

  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
