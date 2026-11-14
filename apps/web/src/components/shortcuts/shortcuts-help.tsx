"use client";

import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SHORTCUTS, type ShortcutHelp } from "@/lib/shortcuts";

import { useShortcut } from "./use-shortcut";

/**
 * "?" opens the list of keyboard shortcuts. Mounted once in the studio shell.
 */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  useShortcut({ key: "?" }, () => setOpen(true));

  const scopes = [...new Set(SHORTCUTS.map((shortcut) => shortcut.scope))];

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Atajos de teclado"
      description="Las letras no se activan mientras escribes en un campo."
    >
      <div className="flex flex-col gap-6">
        {scopes.map((scope) => (
          <section key={scope} aria-labelledby={`atajos-${scope}`}>
            <h3 id={`atajos-${scope}`} className="eyebrow mb-3 text-stone">
              {scope}
            </h3>
            <dl className="flex flex-col">
              {SHORTCUTS.filter((shortcut) => shortcut.scope === scope).map((shortcut) => (
                <div
                  key={`${scope}-${shortcut.label}`}
                  className="flex items-center justify-between gap-6 border-b border-line py-2.5 text-sm"
                >
                  <dt className="text-mist">{shortcut.label}</dt>
                  <dd>
                    <Keys keys={shortcut.keys} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Keys({ keys }: { keys: ShortcutHelp["keys"] }) {
  return (
    <span className="flex items-center gap-1 text-stone">
      {keys.map((key, index) => (
        <Fragment key={key}>
          {index > 0 ? <span aria-hidden="true">+</span> : null}
          <kbd className="inline-flex min-w-6 items-center justify-center rounded-xs border border-line-strong bg-ink-800 px-1.5 py-0.5 font-sans text-[0.75rem] text-paper">
            {key}
          </kbd>
        </Fragment>
      ))}
    </span>
  );
}
