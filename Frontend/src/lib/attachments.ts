/**
 * Attachments of the chat, client side.
 *
 * The API still has no upload endpoint: this module is the single contract the
 * composer, the conversation and (later) the multipart call share. Today the
 * file never leaves the browser; `Attachment.file` is kept untouched so the
 * backend can send it as a `multipart/form-data` part without reshaping it.
 */

/** What the chat can carry. Decided from the MIME type, never the extension. */
export type AttachmentType = "image" | "pdf";

export interface Attachment {
  /** The original file, ready to be appended to a future upload. */
  readonly file: File;
  readonly type: AttachmentType;
  /** File name as the person sees it: the bubble and the future part both use it. */
  readonly name: string;
  /** Object URL of an image; empty for a PDF, which is previewed as a block. */
  readonly previewUrl: string;
}

/**
 * `accept` of the file input: strictly images and PDFs.
 *
 * The picker filters by itself, but the type is validated again in
 * `attachmentFromFile` because a drag and drop or an older browser can still
 * hand over anything.
 */
export const ATTACHMENT_ACCEPT = "image/*,application/pdf";

/** The kind of an allowed file, or `null` when the chat cannot carry it. */
export function attachmentTypeOf(file: File): AttachmentType | null {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

/**
 * Wraps a file into an attachment, or returns `null` when its type is not
 * allowed. Only images get an object URL: a PDF is shown as a document block,
 * so asking the browser for a preview of it would leak a URL nobody uses.
 */
export function attachmentFromFile(file: File): Attachment | null {
  const type = attachmentTypeOf(file);
  if (!type) return null;

  return {
    file,
    type,
    name: file.name,
    previewUrl: type === "image" ? URL.createObjectURL(file) : "",
  };
}

/**
 * Frees the object URL. Safe with a PDF (there is none) and with `null`, so
 * callers do not have to branch. Whoever owns the attachment calls it: the
 * composer when the person discards it, the bubble when it unmounts.
 */
export function releaseAttachment(attachment: Attachment | null | undefined): void {
  if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
}
