import { HlmLabel } from '@lore/ui/helm/label';
import { HlmField } from './lib/hlm-field';
import { HlmFieldContent } from './lib/hlm-field-content';
import { HlmFieldDescription } from './lib/hlm-field-description';
import { HlmFieldError } from './lib/hlm-field-error';
import { HlmFieldGroup } from './lib/hlm-field-group';
import { HlmFieldLabel } from './lib/hlm-field-label';
import { HlmFieldLegend } from './lib/hlm-field-legend';
import { HlmFieldSeparator } from './lib/hlm-field-separator';
import { HlmFieldSet } from './lib/hlm-field-set';
import { HlmFieldTitle } from './lib/hlm-field-title';

export * from './lib/hlm-field';
export * from './lib/hlm-field-content';
export * from './lib/hlm-field-description';
export * from './lib/hlm-field-error';
export * from './lib/hlm-field-group';
export * from './lib/hlm-field-label';
export * from './lib/hlm-field-legend';
export * from './lib/hlm-field-separator';
export * from './lib/hlm-field-set';
export * from './lib/hlm-field-title';

/**
 * The label is re-exported rather than re-implemented: `BrnLabel` already
 * resolves its `for` from the enclosing `BrnField`, so a field-specific label
 * directive would be a second selector over the same behaviour. See
 * `HlmLabel`'s own comment.
 */
export const HlmFieldImports = [
  HlmField,
  HlmFieldContent,
  HlmFieldDescription,
  HlmFieldError,
  HlmFieldGroup,
  HlmFieldLabel,
  HlmFieldLegend,
  HlmFieldSeparator,
  HlmFieldSet,
  HlmFieldTitle,
  HlmLabel,
] as const;
