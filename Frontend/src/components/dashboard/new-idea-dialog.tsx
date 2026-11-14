"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { ArrowIcon, Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { createIdea, errorMessage } from "@/lib/api";

/** The API accepts a trimmed title of 1..120 characters. */
const MAX_TITLE = 120;

/**
 * Creates an idea with `POST /api/ideas` and opens its workspace.
 *
 * Navigation happens only after the API answered 201 with the new idea: no
 * placeholder idea is ever shown as if it existed.
 */
export function NewIdeaDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = title.trim();

  function close() {
    if (pending) return;
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) return;

    setPending(true);
    setError(null);

    try {
      const idea = await createIdea(trimmed);
      router.push(`/ideas/${idea.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Una idea nueva"
      description="Dale un nombre provisional. Lo importante vendrá en la conversación."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre de la idea"
          name="title"
          required
          autoFocus
          maxLength={MAX_TITLE}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. Café de especialidad para oficinas"
          hint={`${trimmed.length}/${MAX_TITLE}`}
        />
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!trimmed} loading={pending} loadingLabel="Creando…">
            Empezar a conversar
            <ArrowIcon />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
