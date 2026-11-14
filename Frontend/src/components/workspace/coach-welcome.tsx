import type { WelcomeTopic } from "@/lib/dimensions";

import { ChatBubble } from "./message-entry";

/**
 * The coach's welcome, shown while the conversation is empty.
 *
 * It looks like the coach's first message but it is **client-only**: it is
 * not stored and the API never sees it (there is no endpoint to write a coach
 * message). As soon as the user sends the first message, the real
 * conversation replaces it.
 *
 * The topics are the first open dimensions (`welcomeTopics`), the same ones
 * the coach's agenda will ask about. Picking one only prefills the composer
 * with a sentence start; nothing is sent until the user completes it.
 */
export function CoachWelcome({
  ideaTitle,
  topics,
  onPick,
}: {
  ideaTitle: string;
  topics: readonly WelcomeTopic[];
  onPick: (topic: WelcomeTopic) => void;
}) {
  return (
    <div className="flex min-h-full flex-col justify-end pt-10 pb-4">
      <ChatBubble from="coach" label="Bienvenida del coach">
        <div className="flex flex-col gap-3">
          <p>
            Hola. Vamos a darle forma a <strong className="font-medium">{ideaTitle}</strong>.
          </p>
          <p className="text-mist">
            Cuéntame tu idea sin rodeos: yo te iré haciendo preguntas y, mientras conversamos, te
            propondré las piezas que vaya identificando. Tú decides qué entra en el plan.
          </p>
          {topics.length > 0 ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <p className="eyebrow text-stone">Puedes empezar por</p>
              <ul className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <li key={topic.type}>
                    <button
                      type="button"
                      onClick={() => onPick(topic)}
                      className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3.5 text-[0.8125rem] text-paper transition-colors duration-300 hover:border-bronze hover:bg-bronze/10"
                    >
                      {topic.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </ChatBubble>
    </div>
  );
}
