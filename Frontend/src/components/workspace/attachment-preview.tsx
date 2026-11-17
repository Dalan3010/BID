"use client";

import { useEffect } from "react";

import { releaseAttachment, type Attachment } from "@/lib/attachments";

import { CloseIcon, DocumentIcon } from "@/components/ui/icons";

/**
 * The attachment waiting in the composer, floating just above the text well.
 *
 * - An image is its own thumbnail; a PDF is a document block with the name, so
 *   nothing is "invented" for a file the browser cannot render inline.
 * - The X discards it and frees the object URL (see `lib/attachments.ts`).
 * - The clay recipe is the studio's: a raised `shadow-clay` card whose inner
 *   slots are carved with `shadow-clay-inset`.
 */
export function AttachmentPreview({
  attachment,
  onRemove,
  disabled = false,
}: {
  attachment: Attachment;
  onRemove: () => void;
  /** True while the coach answers: the file can be seen but not discarded. */
  disabled?: boolean;
}) {
  return (
    <div className="mb-2 flex justify-start">
      <div className="flex max-w-full items-center gap-3 rounded-clay border border-paper/[0.08] bg-ink-900 py-2 pr-2 pl-2.5 shadow-clay">
        <AttachmentThumbnail attachment={attachment} />

        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] text-paper" title={attachment.name}>
            {attachment.name}
          </p>
          <p className="text-[0.6875rem] text-stone">
            {attachment.type === "image" ? "Imagen" : "PDF"} · listo para enviar
          </p>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Quitar ${attachment.name}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-stone transition-colors duration-300 hover:bg-ink-800 hover:text-paper focus-visible:text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Thumbnail of an image, or the carved document slot of a PDF. */
function AttachmentThumbnail({ attachment }: { attachment: Attachment }) {
  if (attachment.type === "image") {
    return (
      // A blob URL cannot go through `next/image`: it is client-only state and
      // the optimizer needs an address it can fetch from the server.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.previewUrl}
        alt={`Vista previa de ${attachment.name}`}
        className="size-14 shrink-0 rounded-clay-sm border border-black/40 object-cover shadow-clay-inset"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex size-14 shrink-0 items-center justify-center rounded-clay-sm bg-ink-800 text-bronze shadow-clay-inset"
    >
      <DocumentIcon className="size-6" />
    </span>
  );
}

/**
 * The attachment already sent, inside its bubble.
 *
 * It owns the object URL from then on, so it frees it when it leaves the
 * transcript. A PDF has no preview URL and needs no cleanup.
 */
export function MessageAttachment({ attachment }: { attachment: Attachment }) {
  useEffect(() => () => releaseAttachment(attachment), [attachment]);

  if (attachment.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.previewUrl}
        alt={attachment.name}
        className="mb-2 max-h-64 w-full rounded-clay-sm border border-black/40 object-cover shadow-clay-inset"
      />
    );
  }

  return (
    <div className="mb-2 flex items-center gap-3 rounded-clay-sm border border-paper/[0.06] bg-ink-850 px-3 py-2.5 shadow-clay-inset">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-clay-sm bg-ink-900 text-bronze shadow-clay"
      >
        <DocumentIcon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.8125rem] text-paper" title={attachment.name}>
          {attachment.name}
        </span>
        <span className="block text-[0.6875rem] text-stone">PDF</span>
      </span>
    </div>
  );
}
