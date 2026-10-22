# CLAUDE.md — lore-ui

Guidance for Claude Code working in this repository. See `README.md` for the consumer
workflow (pack → install).

## What this is

The shared **lore design system**, extracted 2026-08-08 from `lore-inventory` and `lore-dam`
under the owner's Q14 ruling (recorded in `lore-inventory/plans/DECISIONS.md`). One Angular 22
ng-packagr workspace, one library: **`@lore/ui`**, consumed by both apps as a packed tarball
(`npm run pack` → `dist/lore-ui-<version>.tgz`). Never let the apps consume `dist/ui` as a
symlinked `file:` directory — that was tried and rejected with evidence (dual `@angular/core`
identities: TS2345 / NG3004 / NG0203); the tarball is the fix, not an inconvenience.

## Layout

- `projects/ui/theme/` — the token layer. `tokens.css` (three tiers, OKLCH, **measured WCAG
  ratios in comments — every color change must re-measure and restate its ratio**),
  `components.css` (the `.lore-*` component layer incl. `.lore-table`), `decor.css` (the
  additive enrichment layer: elevation, glass, gradients, motion; all colors color-mix-derived
  from existing tokens — it must never introduce a color literal or a new text-contrast pairing).
  Consumers import these by path (`@lore/ui/theme/tokens.css`); the entry sheet `index.css`
  stays **per-app** because it carries the sanctioned per-app divergences (inventory keys dark
  off `.dark`, dam off `html.dark`).
- `projects/ui/helm/<primitive>/` — 26 Spartan helm secondary entries (`@lore/ui/helm/<x>`),
  generated-then-owned, built against `@spartan-ng/brain` 1.3. Regeneration:
  `ng g @spartan-ng/cli:ui <primitive>` guided by `components.json` here (the apps no longer
  have one). `projects/ui/helm/README.md` carries the restyle checklist.
- `projects/ui/{button,badge,link,alert,toast,proof}/` — the lore tier (`LoreButton`, `LoreBadge`/
  `LoreChip`, `LoreLink`, `LoreAlert`, `LoreToast`, and the `UiProof` styleguide page both apps
  route to).
- `projects/ui/testing/` — `@lore/ui/testing`, the token-contract vitest helpers (no helm
  component may emit a stock Tailwind ramp or color literal; the specs enforce it).

## Rules that came with the extraction

- **What deliberately did NOT move here** (do not "complete" the extraction): `LoreTable` and
  `HlmUnitSelect`/`HlmQuantityInput` stay in lore-inventory — they are typed against that app's
  server wire contracts. The shared `.lore-table` CSS + markup contract live here; the component
  does not.
- **The `lore-` prefix is family-level.** No re-prefixing, no app-specific names.
- **A release is a real step.** Version bumps in `projects/ui/package.json` per meaningful
  change; consumers pick changes up only on re-pack + re-install. A contrast fix that is not
  re-packed has not shipped.
- Tests: `ng test ui` (vitest/jsdom; hostile-timezone reruns are the family's discipline).

## Agent routing

No enforcement hook here yet; route by the same concerns as the app repos: theme CSS →
`tailwind`, `projects/ui/helm/**` and `components.json` → `spartan-ui`, lore-tier components →
`angular`, workspace config (`package.json`, `angular.json`, `tsconfig*.json`, `ng-package.json`)
→ `build-tooling`. Specialists should read `lore-inventory/.blusk/practices/tailwind/` before
theme work — it holds the measured contrast floor and scanner traps until this repo grows its
own practices layer.
