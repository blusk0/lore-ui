import { fromDateOnly, toDateOnly } from './date-only';

/**
 * The boundary, tested as arithmetic rather than through a rendered calendar
 * (130 D4).
 *
 * Every assertion in this file is written so that it is **wrong in both
 * directions** if the anchoring is wrong: the plan's acceptance runs this same
 * spec under `TZ=Pacific/Kiritimati` (+14) and `TZ=Pacific/Honolulu` (−10), and
 * a naive implementation using the local accessors reports the *next* day in one
 * and the *previous* day in the other. There is no assertion here that reads the
 * process timezone, and there must not be one — a spec that adjusts for the
 * timezone it is running under cannot fail in the way this file exists to fail.
 *
 * Node and jsdom both honour `process.env.TZ` at start, so this is one spec run
 * twice rather than two specs.
 */

/** Days chosen so that an off-by-one crosses a month, a year and a leap day. */
const DAYS = [
  '2026-08-03',
  '2026-01-01',
  '2026-12-31',
  '2026-03-01',
  '2024-02-29',
  '2026-06-30',
  '2026-07-01',
  '2026-01-05',
  '1999-11-09',
];

describe('fromDateOnly', () => {
  it('anchors the day at UTC midnight, exactly', () => {
    // The instant is asserted rather than the accessors, because it is the one
    // claim that cannot be satisfied by a coincidence of the running timezone:
    // there is exactly one number here, and a local-midnight anchoring produces
    // a different one everywhere except UTC itself.
    expect(fromDateOnly('2026-08-03')!.getTime()).toBe(Date.UTC(2026, 7, 3));
    expect(fromDateOnly('2026-01-01')!.getTime()).toBe(Date.UTC(2026, 0, 1));
    expect(fromDateOnly('2024-02-29')!.getTime()).toBe(Date.UTC(2024, 1, 29));
  });

  it('reports the digits it was given through its UTC accessors', () => {
    const date = fromDateOnly('2026-08-03')!;

    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(7);
    expect(date.getUTCDate()).toBe(3);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
    expect(date.getUTCMilliseconds()).toBe(0);
  });

  it('refuses a day that is not a day rather than repairing it', () => {
    // `Date.UTC(2026, 1, 30)` is the 2nd of March, and a control that accepted
    // it would format back a different day from the one that arrived — a value
    // that changed itself between being written and being read.
    expect(fromDateOnly('2026-02-30')).toBeNull();
    expect(fromDateOnly('2026-13-01')).toBeNull();
    expect(fromDateOnly('2026-04-31')).toBeNull();
    expect(fromDateOnly('2026-00-10')).toBeNull();
    expect(fromDateOnly('2026-01-00')).toBeNull();
    // 2026 is not a leap year; 2024 is, and it is accepted above.
    expect(fromDateOnly('2026-02-29')).toBeNull();
  });

  it('refuses anything that is not exactly a `DateOnly`', () => {
    expect(fromDateOnly(null)).toBeNull();
    expect(fromDateOnly(undefined)).toBeNull();
    expect(fromDateOnly('')).toBeNull();
    expect(fromDateOnly('2026-8-3')).toBeNull();
    expect(fromDateOnly('26-08-03')).toBeNull();
    expect(fromDateOnly('2026/08/03')).toBeNull();
    expect(fromDateOnly('03-08-2026')).toBeNull();
    expect(fromDateOnly(' 2026-08-03 ')).toBeNull();
    expect(fromDateOnly('yesterday')).toBeNull();

    // An instant is refused rather than truncated. Which calendar day it fell on
    // is a question only a timezone can answer, and this function is for the
    // value that has none.
    expect(fromDateOnly('2026-08-03T00:00:00Z')).toBeNull();
    expect(fromDateOnly('2026-08-03T23:30:00-10:00')).toBeNull();
  });
});

describe('toDateOnly', () => {
  it('reads the UTC calendar day, not the local one', () => {
    // A single instant, and the same answer everywhere. Under Honolulu the local
    // accessors say the 2nd; under Kiritimati they say the 4th.
    expect(toDateOnly(new Date(Date.UTC(2026, 7, 3)))).toBe('2026-08-03');
    expect(toDateOnly(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
    expect(toDateOnly(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-12-31');
  });

  it('pads to `YYYY-MM-DD` rather than emitting a shorter string', () => {
    // `020`'s wire shape is fixed-width, and `2026-1-5` is a different string
    // from the one a server parses.
    expect(toDateOnly(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
    expect(toDateOnly(new Date(Date.UTC(999, 8, 9)))).toBe('0999-09-09');
  });

  it('drops a time of day and keeps the UTC day it belongs to', () => {
    // brain's adapter hands out a full instant for "now", so this path is live
    // rather than defensive: the first calendar a maker opens with nothing
    // chosen is focused on one of these.
    expect(toDateOnly(new Date(Date.UTC(2026, 7, 3, 23, 59, 59, 999)))).toBe('2026-08-03');
    expect(toDateOnly(new Date(Date.UTC(2026, 7, 3, 0, 0, 0, 1)))).toBe('2026-08-03');
  });

  it('has nothing to say about an absent or unparseable date', () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
    expect(toDateOnly(new Date(Number.NaN))).toBeNull();
    expect(toDateOnly(new Date('nonsense'))).toBeNull();
  });
});

describe('the two together', () => {
  it('round-trips every day unchanged, in both directions', () => {
    // The property the control's model rests on: what a caller writes is what it
    // reads back, with a `Date` existing only in between.
    for (const day of DAYS) {
      expect(toDateOnly(fromDateOnly(day))).toBe(day);
    }
  });

  it('round-trips a `Date` through the string and back to the same instant', () => {
    for (const day of DAYS) {
      const first = fromDateOnly(day)!;
      const second = fromDateOnly(toDateOnly(first));

      expect(second!.getTime()).toBe(first.getTime());
    }
  });

  it('moves a day only when a day was asked for', () => {
    // Adding 24 hours to a UTC-anchored date crosses exactly one calendar day,
    // including across a month end and a leap day — the arithmetic the calendar
    // grid does when a maker presses an arrow key.
    const boundaries: [string, string][] = [
      ['2026-08-03', '2026-08-04'],
      ['2026-01-31', '2026-02-01'],
      ['2026-12-31', '2027-01-01'],
      ['2024-02-28', '2024-02-29'],
      ['2026-02-28', '2026-03-01'],
    ];

    for (const [today, tomorrow] of boundaries) {
      const next = new Date(fromDateOnly(today)!.getTime() + 24 * 60 * 60 * 1000);
      expect(toDateOnly(next)).toBe(tomorrow);
    }
  });
});
