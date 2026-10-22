import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmAvatarImports } from '@lore/ui/helm/avatar';
import { HlmBreadcrumbImports } from '@lore/ui/helm/breadcrumb';
import { HlmCheckboxImports } from '@lore/ui/helm/checkbox';
import { HlmCommandImports } from '@lore/ui/helm/command';
import { HlmDialogImports } from '@lore/ui/helm/dialog';
import { HlmDropdownMenuImports } from '@lore/ui/helm/dropdown-menu';
import { HlmFieldImports } from '@lore/ui/helm/field';
import { HlmInput } from '@lore/ui/helm/input';
import { HlmProgressImports } from '@lore/ui/helm/progress';
import { HlmRadioGroupImports } from '@lore/ui/helm/radio-group';
import { HlmSelectImports } from '@lore/ui/helm/select';
import { HlmSheetImports } from '@lore/ui/helm/sheet';
import { HlmSkeletonImports } from '@lore/ui/helm/skeleton';
import { HlmSwitchImports } from '@lore/ui/helm/switch';
import { HlmTableImports } from '@lore/ui/helm/table';
import { HlmTabsImports } from '@lore/ui/helm/tabs';
import { HlmTextarea } from '@lore/ui/helm/textarea';
import { HlmTooltipImports } from '@lore/ui/helm/tooltip';
import { LoreBadge, LoreChip } from '@lore/ui/badge';
import { LoreButton, type LoreColor, type LoreVariant } from '@lore/ui/button';
import { LoreLink } from '@lore/ui/link';

/**
 * The design-system proof page: every primitive 120 delivers, rendered once so
 * it can be eyeballed in both themes and both densities. This is the visual
 * regression surface until plan 110 replaces it with the real shell — it is a
 * self-contained component precisely so that removal is a one-line change.
 */
@Component({
  selector: 'lore-ui-proof',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    LoreButton,
    LoreBadge,
    LoreChip,
    LoreLink,
    HlmAvatarImports,
    HlmBreadcrumbImports,
    HlmCheckboxImports,
    HlmCommandImports,
    HlmDialogImports,
    HlmDropdownMenuImports,
    HlmFieldImports,
    HlmInput,
    HlmProgressImports,
    HlmRadioGroupImports,
    HlmSelectImports,
    HlmSheetImports,
    HlmSkeletonImports,
    HlmSwitchImports,
    HlmTableImports,
    HlmTabsImports,
    HlmTextarea,
    HlmTooltipImports,
  ],
  template: `
    <!-- Cards: .lore-card is the raised surface; data-color adds the top accent. -->
    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      @for (stat of stats; track stat.label) {
        <div class="lore-card" [attr.data-color]="stat.color">
          <p class="lore-microlabel">{{ stat.label }}</p>
          <p class="tabular mt-1 text-2xl font-semibold">{{ stat.value }}</p>
        </div>
      }
    </div>

    <section class="lore-card p-6">
      <h2 class="mb-4 text-sm font-medium text-muted-foreground">
        Buttons — the global variant matrix
      </h2>
      <div class="flex flex-col gap-3">
        @for (variant of variants; track variant) {
          <div class="flex flex-wrap items-center gap-2">
            <span class="w-20 text-xs text-muted-foreground">{{ variant }}</span>
            @for (color of colors; track color) {
              <button loreBtn [variant]="variant" [color]="color">{{ color }}</button>
            }
          </div>
        }
      </div>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Sizes — incl. square icon sizes
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <button loreBtn color="primary" size="sm">small</button>
        <button loreBtn color="primary" size="md">medium</button>
        <button loreBtn color="primary" size="lg">large</button>
        <button loreBtn color="primary" disabled>disabled</button>
        <a loreBtn variant="outlined" href="#proof">link</a>
        <a loreBtn variant="outlined" [disabled]="true">disabled link</a>
        <button loreBtn variant="soft" size="icon-sm" aria-label="Small icon action">+</button>
        <button loreBtn variant="soft" size="icon-md" aria-label="Medium icon action">+</button>
        <button loreBtn variant="soft" size="icon-lg" aria-label="Large icon action">+</button>
      </div>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Badges & chips — same matrix, pill metrics (dashed = AI-suggested, reviewable)
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <span loreBadge>landscape</span>
        <span loreBadge color="primary">campaign-2026</span>
        <button loreChip color="primary" [suggested]="true">✨ golden hour</button>
        <button loreChip color="primary" [suggested]="true">✨ coastline</button>
        <button loreChip color="danger">needs review</button>
      </div>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Links — strong opens a record, plain sits beside it, prose lives in a sentence
      </h2>
      <dl class="grid w-fit grid-cols-[auto_auto] gap-x-8 gap-y-1 text-sm">
        <dt class="text-muted-foreground">Material</dt>
        <dd><a loreLink href="#proof-links">MAT-0001</a></dd>
        <dt class="text-muted-foreground">Supplier</dt>
        <dd><a loreLink variant="plain" href="#proof-links">Acme Botanicals</a></dd>
      </dl>
      <p id="proof-links" class="pt-3 text-muted-foreground">
        Reorder points assume a 14-day lead time.
        <a loreLink variant="prose" href="#proof-links">Change the lead time</a> in settings.
      </p>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">Overlays & navigation</h2>
      <div class="flex flex-wrap items-center gap-2">
        <!-- Tooltip: trigger is focusable, content is never essential info -->
        <button loreBtn variant="outlined" [hlmTooltip]="'Renames the selected asset'">
          Hover me
        </button>

        <!-- Dialog: title + description are mandatory (a11y contract) -->
        <hlm-dialog>
          <button loreBtn variant="outlined" hlmDialogTrigger>Open dialog</button>
          <hlm-dialog-content *hlmDialogPortal>
            <div hlmDialogHeader>
              <h3 hlmDialogTitle>Delete 3 assets?</h3>
              <p hlmDialogDescription>
                Confirm dialogs are for true irreversibles only — everything else gets undo.
              </p>
            </div>
            <div hlmDialogFooter>
              <button loreBtn variant="plain" hlmDialogClose>Cancel</button>
              <button loreBtn variant="solid" color="danger">Delete</button>
            </div>
          </hlm-dialog-content>
        </hlm-dialog>

        <!-- Sheet: 110's inspector on narrow viewports, 130's upload tray -->
        <hlm-sheet>
          <button loreBtn variant="outlined" hlmSheetTrigger>Open sheet</button>
          <hlm-sheet-content *hlmSheetPortal>
            <div hlmSheetHeader>
              <h3 hlmSheetTitle>Inspector</h3>
              <p hlmSheetDescription>Asset metadata lives here.</p>
            </div>
          </hlm-sheet-content>
        </hlm-sheet>

        <!-- Dropdown menu: helm builds on CDK menu (not brain), so the panel is
             an ng-template the trigger points at. Typeahead + submenus included. -->
        <button loreBtn variant="outlined" [hlmDropdownMenuTrigger]="menu">Actions</button>
        <ng-template #menu>
          <div hlmDropdownMenu>
            <button hlmDropdownMenuItem>Rename</button>
            <button hlmDropdownMenuItem>Duplicate</button>
            <hlm-dropdown-menu-separator />
            <button hlmDropdownMenuItem>Delete</button>
          </div>
        </ng-template>
      </div>

      <!-- hlmBreadcrumbLink wraps Angular's RouterLink (host directive), so it
           takes [link], not href — and needs a router context to exist. -->
      <nav hlmBreadcrumb class="mt-6">
        <ol hlmBreadcrumbList>
          <li hlmBreadcrumbItem><a hlmBreadcrumbLink [link]="['/']">Library</a></li>
          <li hlmBreadcrumbSeparator></li>
          <li hlmBreadcrumbItem><a hlmBreadcrumbLink [link]="['/']">2026</a></li>
          <li hlmBreadcrumbSeparator></li>
          <li hlmBreadcrumbItem><span hlmBreadcrumbPage>Coastline shoot</span></li>
        </ol>
      </nav>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Avatar, skeleton, progress
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <hlm-avatar>
          <span hlmAvatarFallback>BL</span>
        </hlm-avatar>
        <div class="flex flex-col gap-2">
          <div hlmSkeleton class="h-3 w-40"></div>
          <div hlmSkeleton class="h-3 w-24"></div>
        </div>
        <!-- W4: progress is 130's upload-tray primitive -->
        <div class="w-56">
          <hlm-progress [value]="progress()" aria-label="Upload progress">
            <hlm-progress-indicator />
          </hlm-progress>
        </div>
        <span class="tabular text-xs text-muted-foreground">{{ progress() }}%</span>
      </div>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Tabs (underline is the house style)
      </h2>
      <hlm-tabs tab="details">
        <hlm-tabs-list class="w-full" aria-label="Inspector sections">
          <button hlmTabsTrigger="details">Details</button>
          <button hlmTabsTrigger="metadata">Metadata</button>
        </hlm-tabs-list>
        <div hlmTabsContent="details" class="pt-3 text-muted-foreground">Details panel</div>
        <div hlmTabsContent="metadata" class="pt-3 text-muted-foreground">Metadata panel</div>
      </hlm-tabs>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Command palette primitive (110 owns Cmd+K)
      </h2>
      <hlm-command class="max-w-sm rounded-lg border">
        <hlm-command-input placeholder="Search actions…" />
        <hlm-command-list>
          <hlm-command-group>
            <span hlmCommandGroupLabel>Actions</span>
            <button hlmCommandItem value="upload">
              Upload assets
              <span hlmCommandShortcut>⌘U</span>
            </button>
            <button hlmCommandItem value="new-collection">
              New collection
              <span hlmCommandShortcut>⌘N</span>
            </button>
          </hlm-command-group>
          <div hlmCommandEmpty>No results.</div>
        </hlm-command-list>
      </hlm-command>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Kitchen-sink form — one FormGroup, proves CVA wiring + Field error display
      </h2>
      <form [formGroup]="form" class="flex max-w-sm flex-col gap-4">
        <div hlmField>
          <label hlmFieldLabel for="proof-name">Name</label>
          <input hlmInput id="proof-name" formControlName="name" placeholder="Coastline shoot" />
          <p hlmFieldDescription>Shown wherever the asset is listed.</p>
          <hlm-field-error validator="required">A name is required.</hlm-field-error>
        </div>

        <div hlmField>
          <label hlmFieldLabel for="proof-notes">Notes</label>
          <textarea hlmTextarea id="proof-notes" formControlName="notes"></textarea>
        </div>

        <div hlmField>
          <label hlmFieldLabel for="proof-license">License</label>
          <hlm-select formControlName="license">
            <hlm-select-trigger [buttonId]="'proof-license'">
              <hlm-select-value />
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal>
              <hlm-select-item value="cc-by">CC BY</hlm-select-item>
              <hlm-select-item value="rights-managed">Rights managed</hlm-select-item>
            </hlm-select-content>
          </hlm-select>
        </div>

        <div hlmField>
          <label hlmFieldLabel>
            <hlm-checkbox formControlName="archived" />
            Archived
          </label>
        </div>

        <div hlmField>
          <label hlmFieldLabel>
            <hlm-switch formControlName="notify" />
            Notify on ingest
          </label>
        </div>

        <fieldset hlmFieldSet>
          <legend hlmFieldLegend>Visibility</legend>
          <hlm-radio-group formControlName="visibility">
            <label hlmFieldLabel>
              <hlm-radio value="private">
                <hlm-radio-indicator />
              </hlm-radio>
              Private
            </label>
            <label hlmFieldLabel>
              <hlm-radio value="team">
                <hlm-radio-indicator />
              </hlm-radio>
              Team
            </label>
          </hlm-radio-group>
        </fieldset>

        <div class="flex gap-2">
          <button loreBtn type="submit" color="primary">Save</button>
          <button loreBtn variant="outlined" type="button" (click)="toggleDisabled()">
            {{ form.disabled ? 'Enable' : 'Disable' }} form
          </button>
        </div>
      </form>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Table primitives — numeric cells use .tabular (140 wires TanStack)
      </h2>
      <div hlmTableContainer class="rounded-lg border">
        <table hlmTable>
          <thead hlmTHead>
            <tr hlmTr>
              <th hlmTh>Asset</th>
              <th hlmTh class="text-right">Size</th>
              <th hlmTh class="text-right">Dimensions</th>
            </tr>
          </thead>
          <tbody hlmTBody>
            @for (row of rows; track row.name) {
              <tr hlmTr>
                <td hlmTd>{{ row.name }}</td>
                <td hlmTd class="tabular text-right">{{ row.size }}</td>
                <td hlmTd class="tabular text-right">{{ row.dimensions }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Dense table (.lore-table) — row actions, caret, selection, status chips
      </h2>
      <div class="lore-table-scroll">
        <table class="lore-table">
          <thead>
            <tr>
              <th data-sortable aria-sort="ascending">Code</th>
              <th>Name</th>
              <th>Status</th>
              <th data-numeric>On hand</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (row of stock; track row.code; let index = $index) {
              <tr
                [attr.tabindex]="index === 0 ? 0 : -1"
                [attr.data-active]="index === 0 ? 'true' : null"
                [attr.data-selected]="index === 2 ? 'true' : null"
              >
                <td><a loreLink href="#proof-links">{{ row.code }}</a></td>
                <td>{{ row.name }}</td>
                <td><span loreBadge variant="soft" [color]="row.color">{{ row.status }}</span></td>
                <td data-numeric class="tabular">{{ row.onHand }}</td>
                <td>
                  <div class="flex flex-wrap gap-2">
                    <button loreBtn variant="outlined" size="sm">View lots</button>
                    <button loreBtn variant="outlined" color="danger" size="sm">Archive</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <h2 class="mt-8 mb-4 text-sm font-medium text-muted-foreground">
        Metadata type (tabular figures)
      </h2>
      <dl class="grid w-fit grid-cols-[auto_auto] gap-x-8 gap-y-1 text-sm">
        <dt class="text-muted-foreground">Dimensions</dt>
        <dd class="tabular">6048 × 4024</dd>
        <dt class="text-muted-foreground">Size</dt>
        <dd class="tabular">24.6 MB</dd>
        <dt class="text-muted-foreground">Duration</dt>
        <dd class="tabular">00:02:41:12</dd>
      </dl>
    </section>
  `,
})
export class UiProof {
  protected readonly variants: LoreVariant[] = ['solid', 'soft', 'outlined', 'plain'];
  protected readonly colors: LoreColor[] = ['primary', 'neutral', 'danger', 'success', 'warning'];

  protected readonly progress = signal(62);

  protected readonly stats: readonly { label: string; value: string; color: LoreColor }[] = [
    { label: 'Assets', value: '1,284', color: 'primary' },
    { label: 'Awaiting review', value: '17', color: 'warning' },
    { label: 'Rights expiring', value: '4', color: 'danger' },
    { label: 'Published', value: '962', color: 'success' },
  ];

  protected readonly stock: readonly {
    code: string;
    name: string;
    status: string;
    color: LoreColor;
    onHand: string;
  }[] = [
    { code: 'MAT-0001', name: 'Shea butter', status: 'Active', color: 'success', onHand: '12.50 kg' },
    { code: 'MAT-0002', name: 'Coconut oil 76°', status: 'Low stock', color: 'warning', onHand: '1.20 kg' },
    { code: 'MAT-0003', name: 'Lavender 40/42', status: 'Active', color: 'success', onHand: '480 g' },
    { code: 'MAT-0004', name: 'Sodium hydroxide', status: 'Expired lot', color: 'danger', onHand: '3.00 kg' },
  ];

  protected readonly rows = [
    { name: 'coastline-01.arw', size: '24.6 MB', dimensions: '6048 × 4024' },
    { name: 'coastline-02.arw', size: '9.1 MB', dimensions: '3024 × 2016' },
  ];

  protected readonly form = new FormGroup({
    name: new FormControl('', Validators.required),
    notes: new FormControl(''),
    license: new FormControl('cc-by'),
    archived: new FormControl(false),
    notify: new FormControl(true),
    visibility: new FormControl('private'),
  });

  protected toggleDisabled(): void {
    // Disabling flows through each CVA's setDisabledState — never a parallel
    // [disabled] binding (120 D4).
    if (this.form.disabled) {
      this.form.enable();
    } else {
      this.form.disable();
    }
  }
}
