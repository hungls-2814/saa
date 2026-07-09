/**
 * Shared field label + inline error slot for the Compose-Kudos modal's form
 * fields (Người nhận / Danh hiệu / Hashtag), per MoMorph `520:10673`. Kept as
 * one tiny shared component so the red-asterisk "required" marker and the
 * error-message treatment stay identical across every field.
 */

export function ComposeFieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-0.5 text-[22px] leading-7 font-bold text-[#00101A]"
    >
      {label}
      {required && (
        <span aria-hidden className="text-base font-bold text-[#D4271D]">
          *
        </span>
      )}
    </label>
  );
}

/** Error message region — always rendered (even when empty) so screen
 * readers get a stable `id` to associate via `aria-describedby`. */
export function ComposeFieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  return (
    <p id={id} role="alert" className="min-h-[20px] text-sm font-bold text-[#D4271D]">
      {message}
    </p>
  );
}
