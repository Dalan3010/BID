"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { useCinematicEntrance } from "@/components/motion/use-cinematic-entrance";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { ApiError, errorMessage, exportUrl, resetDemo } from "@/lib/api";
import { authClient, authErrorMessage, useSession } from "@/lib/auth-client";
import { DEMO_ACCOUNT } from "@/lib/config";

/**
 * `/profile` — the account.
 *
 * Every action goes through an existing endpoint:
 * - name, email, password, deletion → Better Auth (`/api/auth/*`)
 * - export → `GET /api/account/export` (a browser download with the cookie)
 * - demo reset → `POST /api/demo/reset` (403 for any account but the demo)
 */
export function AccountView() {
  const root = useRef<HTMLDivElement>(null);
  const { data: session, refetch } = useSession();
  useCinematicEntrance(root);

  if (!session) return null;

  const isDemo = session.user.email.toLowerCase() === DEMO_ACCOUNT.email;

  return (
    <div ref={root} className="mx-auto w-full max-w-studio px-gutter py-14 md:py-20">
      <header data-enter="block" className="mb-14 grid gap-6 border-b border-line pb-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="eyebrow mb-6 text-bronze">Cuenta</p>
          <h1 className="text-headline font-light text-paper">
            Tu espacio, <span className="font-serif italic">tus datos</span>.
          </h1>
        </div>
        <dl className="grid gap-4 self-end text-sm md:col-span-5">
          <div className="flex justify-between gap-6 border-b border-line pb-3">
            <dt className="eyebrow text-stone">Nombre</dt>
            <dd className="text-paper">{session.user.name}</dd>
          </div>
          <div className="flex justify-between gap-6 border-b border-line pb-3">
            <dt className="eyebrow text-stone">Correo</dt>
            <dd className="truncate text-paper">{session.user.email}</dd>
          </div>
        </dl>
      </header>

      <div className="flex flex-col">
        <Section title="Exportar mis datos" description="Descarga todas tus ideas en JSON, con su grafo completo, la procedencia de cada pieza y su historial.">
          <a href={exportUrl()} className={buttonClasses("secondary", "md")} download>
            Descargar exportación
          </a>
        </Section>

        {isDemo ? (
          <>
            <Section
              title="Cuenta demo"
              description="Una sola cuenta para todas las personas que prueban el producto."
            >
              <p className="max-w-prose text-sm leading-relaxed text-stone">
                Su nombre, correo y contraseña son fijos, y no se puede eliminar:
                cualquier cambio dejaría la demo rota para la próxima persona. Si
                algo quedó desordenado, reinicia la demo y vuelve al estado
                inicial.
              </p>
            </Section>

            <DemoResetSection />
          </>
        ) : (
          <>
            <Section title="Perfil" description="Cómo te saluda el estudio.">
              <NameForm current={session.user.name} onSaved={refetch} />
            </Section>

            <Section title="Correo" description="El correo con el que entras.">
              <EmailForm current={session.user.email} onSaved={refetch} />
            </Section>

            <Section title="Contraseña" description="Para cambiarla necesitas la actual. Cerraremos tus otras sesiones.">
              <PasswordForm />
            </Section>

            <Section title="Eliminar la cuenta" description="Borra tu cuenta y todas tus ideas. Te recomendamos exportar tus datos antes.">
              <DeleteAccount />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section data-enter="block" className="grid gap-6 border-b border-line py-10 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-4">
        <h2 className="font-serif text-2xl text-paper">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone">{description}</p>
      </div>
      <div className="md:col-span-6 md:col-start-6">{children}</div>
    </section>
  );
}

function DemoResetSection() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function reset() {
    setPending(true);
    setResult(null);
    try {
      await resetDemo();
      setResult({ tone: "success", message: "La demo volvió a su estado inicial." });
      router.refresh();
    } catch (error) {
      setResult({
        tone: "error",
        message:
          error instanceof ApiError && error.status === 403
            ? "Solo la cuenta demo se puede reiniciar."
            : errorMessage(error),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Section title="Reiniciar la demo" description="Restaura la idea de ejemplo para repetir el recorrido desde el principio.">
      <div className="flex flex-col items-start gap-4">
        <Button variant="secondary" onClick={reset} loading={pending} loadingLabel="Reiniciando…">
          Reiniciar la demo
        </Button>
        {result ? <Alert tone={result.tone}>{result.message}</Alert> : null}
      </div>
    </Section>
  );
}

function NameForm({ current, onSaved }: { current: string; onSaved: () => void }) {
  const [name, setName] = useState(current);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setPending(false);
    if (error) {
      setResult({ tone: "error", message: authErrorMessage(error) });
      return;
    }
    setResult({ tone: "success", message: "Nombre actualizado." });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField label="Nombre" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
      {result ? <Alert tone={result.tone}>{result.message}</Alert> : null}
      <div>
        <Button type="submit" variant="secondary" disabled={!name.trim() || name.trim() === current} loading={pending} loadingLabel="Guardando…">
          Guardar
        </Button>
      </div>
    </form>
  );
}

function EmailForm({ current, onSaved }: { current: string; onSaved: () => void }) {
  const [email, setEmail] = useState(current);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const { error } = await authClient.changeEmail({
      newEmail: email.trim(),
      callbackURL: `${window.location.origin}/profile`,
    });
    setPending(false);
    if (error) {
      setResult({ tone: "error", message: authErrorMessage(error) });
      return;
    }
    setResult({ tone: "success", message: "Correo actualizado." });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField label="Correo" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      {result ? <Alert tone={result.tone}>{result.message}</Alert> : null}
      <div>
        <Button type="submit" variant="secondary" disabled={!email.trim() || email.trim() === current} loading={pending} loadingLabel="Guardando…">
          Cambiar correo
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setResult({ tone: "error", message: "La contraseña nueva debe tener al menos 8 caracteres." });
      return;
    }
    setPending(true);
    setResult(null);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      setResult({ tone: "error", message: authErrorMessage(error) });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setResult({ tone: "success", message: "Contraseña actualizada." });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField label="Contraseña actual" type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
      <TextField label="Contraseña nueva" type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" hint="Mínimo 8 caracteres." />
      {result ? <Alert tone={result.tone}>{result.message}</Alert> : null}
      <div>
        <Button type="submit" variant="secondary" disabled={!currentPassword || !newPassword} loading={pending} loadingLabel="Guardando…">
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: authError } = await authClient.deleteUser({ password });
    if (authError) {
      setPending(false);
      setError(authErrorMessage(authError));
      return;
    }
    // A full navigation, not `router.replace`: the session disappears at this
    // moment and the studio's guard would otherwise win the race and send the
    // person to /sign-in instead of the landing.
    window.location.replace("/");
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Eliminar mi cuenta
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!pending) {
            setOpen(false);
            setError(null);
          }
        }}
        title="¿Eliminar tu cuenta?"
        description="Se borrarán tu cuenta y todas tus ideas. Esta acción no se puede deshacer."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField label="Confirma con tu contraseña" type="password" required autoFocus value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={!password} loading={pending} loadingLabel="Eliminando…">
              Eliminar definitivamente
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
