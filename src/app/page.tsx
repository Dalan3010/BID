export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Proyecto en construcción
      </p>

      <h1 className="text-4xl font-semibold tracking-tight">BID</h1>

      <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Un coach que ayuda a cimentar una idea de negocio. El usuario conversa en
        lenguaje natural, el sistema extrae la estructura y las visualizaciones
        muestran qué falta.
      </p>

      <dl className="grid gap-2 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-700 dark:text-zinc-300">
            Especificación
          </dt>
          <dd>docs/especificacion-funcional.md</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-700 dark:text-zinc-300">
            Arquitectura
          </dt>
          <dd>docs/arquitectura.md</dd>
        </div>
      </dl>
    </main>
  );
}
