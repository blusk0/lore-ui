# LoreUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

## Consuming `@lore/ui` (lore-inventory, lore-dam)

The apps install `@lore/ui` from a **packed tarball**, not from `dist/ui`
directly. A `file:` dependency on a directory installs as a symlink, and a
symlinked package resolves its peers (`@angular/core`, `@spartan-ng/brain`,
rxjs, …) from *this* workspace's `node_modules` instead of the consuming
app's — two `@angular/core` identities, which breaks types (TS2345 on
`Signal`), bundling (NG0203), and the unit-test builder. Installing the
tarball extracts a real directory into the app's `node_modules`, so peers
resolve from the app's own tree and no tsconfig `paths` pins,
`preserveSymlinks`, or vitest overrides are needed. The tarball is the
release artifact the Q14 extraction ruling priced in.

Workflow after changing the library:

1. Bump `projects/ui/package.json`'s version if the change is meaningful.
2. `npm run pack` — builds the library and packs it to
   `dist/lore-ui-<version>.tgz` (npm mangles the scoped name `@lore/ui` to
   `lore-ui`).
3. In each consuming app's `client/` directory:

   ```bash
   npm install ../../lore-ui/dist/lore-ui-<version>.tgz
   ```

Stale-artifact trap: the apps install a snapshot, not a live link. If the
version did not change, `npm install` may keep the previously extracted copy —
re-run the install (npm compares the tarball's integrity hash) and check
`node_modules/@lore/ui` is a real directory whose contents match. Rebuilding
`dist/ui` alone changes nothing in any app until you re-pack and re-install.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

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
