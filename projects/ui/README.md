# Ui

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.0.

## Accordion (`@lore/ui/helm/accordion`)

Import `HlmAccordionImports`. It is built on `@spartan-ng/brain/accordion`, which supplies
`aria-expanded`, `aria-controls`, a `region` labelled by its trigger, and the keyboard.

```html
<hlm-accordion type="multiple">
  <hlm-accordion-item [isOpened]="historyOpen()" (openedChange)="historyOpen.set($event)">
    <h2 hlmAccordionHeader><button hlmAccordionTrigger>History</button></h2>
    <hlm-accordion-content>…</hlm-accordion-content>
  </hlm-accordion-item>
</hlm-accordion>
```

- **`type`** defaults to brain's `single`, where opening one item closes the others. Pass
  `type="multiple"` to keep several open.
- **`[isOpened]` is one-way.** A user's toggle is reported on `(openedChange)` but is not
  written back to your state. Bind `(openedChange)` to the same state. Otherwise, if the
  user closes the item, setting it to `true` later is no change and does not reopen it. A
  change made through `[isOpened]` does not fire `(openedChange)`.
- **Wrap the trigger in a heading.** Brain throws if the trigger's parent is not `h1`–`h6`
  (or `role="heading"` with `aria-level`), so the caller picks the level. Put
  `hlmAccordionHeader` on that heading.
- **The chevron is built in.** Do not add an icon to the trigger. It draws
  `lucideChevronDown` itself and rotates it when open, only under motion-safe.
- **Hover is the plain neutral button's fill** (`.lore-ctl[data-variant='plain']`), with no
  underline and no fill kept while open. The trigger has `calc(var(--space) * 2)` of inline
  padding and an equal negative margin. Its label lines up with the panel's text, and the
  fill extends that far into the gutter on each side, so give the container at least that
  much inline padding.
- **Content stays mounted.** A closed panel is `inert` and clamped to zero height but never
  destroyed, so its children keep their state and data reads while closed.
- The trigger is not a `.lore-ctl`, so it never moves on press.

## Autocomplete (`@lore/ui/helm/autocomplete`)

Import `HlmAutocompleteImports`. `HlmAutocomplete` is a free-text input that offers
completions for text **you** own: the control renders `[text]` and never changes it.

```html
<label hlmLabel [for]="textId">What do you want to do?</label>
<hlm-autocomplete
  #box
  [inputId]="textId"
  [text]="text()"
  [options]="rows()"
  [(open)]="listOpen"
  [loading]="asking()"
  listboxLabel="Unit suggestions"
  (textChange)="text.set($event)"
  (caretChange)="caret.set($event)"
  (accept)="take($event, box)"
  (keydown)="key($event)"
/>
```

```ts
take(option: AutocompleteOption, box: HlmAutocomplete) {
  const next = before + option.value + after; // your splice
  this.text.set(next);
  box.setCaret(before.length + option.value.length);
}
```

- **Inputs:** `text`, `options` (`{ value, label, detail? }[]`), `open` (two-way),
  `loading` (`aria-busy` on the list), `listboxLabel` (default `Suggestions`), `acceptOnTab`
  (default `true`), `disabled`, `inputId`, and `aria-label` for use outside a field.
- **Outputs:** `textChange(string)`, `caretChange(number)`, `accept(option)`,
  `openChange(boolean)`.
- **`setCaret(position)`** focuses the input and places the caret once the current `text`
  has rendered. It does not emit `caretChange`, and until the caret lands no caret is
  reported, so a key released before your new `text` renders does not report the old one.
- **Options render verbatim.** They are not sorted, de-duplicated or narrowed, and nothing
  is matched against the text. Filtering is the server's job.
- **The list shows** while `open` is `true` and there is at least one option. Opening it is
  up to you. Escape and leaving the input set `open` to `false`.
- **Keys, while the list shows:** ArrowDown/ArrowUp/Home/End move the highlight and wrap;
  Enter takes the highlighted row; Tab takes the highlighted row, or the first if none is
  highlighted (`acceptOnTab`); Escape closes the list. A key the control takes has its
  default prevented and propagation stopped, so a dialog stays open on the first Escape and
  your `(keydown)` never sees that key. Enter with nothing highlighted, every key while the
  list is closed, and any key with a modifier pass through untouched.
- **Nothing is highlighted until an arrow key is pressed**, and a new `options` array clears
  the highlight. Pointer hover does not highlight a row, so Enter after typing always
  reaches you. It paints a neutral `--muted` fill, and only the highlighted row takes
  `--accent`, so the pointer's row and the keyboard's row never look alike.
- **ARIA:** the input has `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`,
  and `aria-controls` only while a listbox is on the page. `aria-activedescendant` points at
  the highlighted row. The listbox is named by `listboxLabel`, and each row is
  `role="option"`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the library, run:

```bash
ng build ui
```

This command will compile your project, and the build artifacts will be placed in the `dist/` directory.

### Publishing the Library

Once the project is built, you can publish your library by following these steps:

1. Navigate to the `dist` directory:

   ```bash
   cd dist/ui
   ```

2. Run the `npm publish` command to publish your library to the npm registry:
   ```bash
   npm publish
   ```

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
