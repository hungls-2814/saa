import type { HashtagRef } from "@/lib/kudos/types";
import type { ComposeRecipientOption } from "./compose-recipient-select";
import type { ComposeKudosImage } from "./compose-image-field";
import type { ComposeFormatAction } from "./compose-toolbar";

/**
 * Prop/payload contract for `ComposeKudosModal` (MoMorph `520:10673`), split
 * out from the component file to keep it under the project's 200-line
 * budget. This is the integration contract: Track B swaps the mock
 * `recipients`/`hashtags`/`images` for real Supabase-backed data and
 * `onSubmit` for a server action without touching the component itself.
 */

/** Field-level validation messages, keyed by field. All optional — a field
 * with no entry renders no error. */
export interface ComposeKudosErrors {
  recipient?: string;
  title?: string;
  content?: string;
  hashtags?: string;
  images?: string;
  anonymousAlias?: string;
}

/** Everything `onSubmit` needs to persist the kudos. Hashtags/images are
 * sourced from the controlled `hashtags`/`images` props (the component
 * never mutates them itself), not from local state. */
export interface ComposeKudosSubmitPayload {
  recipientId: string;
  title: string;
  content: string;
  hashtagIds: string[];
  imageIds: string[];
  isAnonymous: boolean;
  anonymousAlias?: string;
}

export interface ComposeKudosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: () => void;
  onSubmit?: (payload: ComposeKudosSubmitPayload) => void;
  recipients?: ComposeRecipientOption[];
  hashtags?: HashtagRef[];
  /** Existing tags offered as autocomplete suggestions in the add-input. */
  hashtagSuggestions?: HashtagRef[];
  onAddHashtag?: (label: string) => void;
  onRemoveHashtag?: (id: string) => void;
  images?: ComposeKudosImage[];
  onAddImage?: () => void;
  onRemoveImage?: (id: string) => void;
  onSelectRecipient?: (recipient: ComposeRecipientOption) => void;
  onFormat?: (action: ComposeFormatAction) => void;
  onOpenGuidelines?: () => void;
  /** Prompt for a URL when the link toolbar button is pressed. */
  onRequestLinkUrl?: () => string | null;
  /** Whether a submit is in flight — disables the footer + shows loading. */
  submitting?: boolean;
  errors?: ComposeKudosErrors;
}
