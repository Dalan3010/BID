import type { CoachModel, CoachRequest } from "../../application/ports/coach-model";
import { stepAlreadyRaised } from "../../application/ports/coach-model";
import { NODE_TYPES, type NodeType } from "@bid/core";

/**
 * The coach that answers from a script.
 *
 * This is the implementation that makes the product demonstrable without a
 * model provider (RNF-15). It answers the question the agenda asks, in plain
 * language, and it streams the answer word by word so the interaction looks
 * exactly like the real one.
 *
 * It is not a mock in the "returns empty" sense: the questions are the ones the
 * domain decided are missing, and the answers are the ones a coach would give.
 */
export class RehearsalCoachModel implements CoachModel {
  /**
   * The question the coach asks for each dimension.
   *
   * The key is the canonical dimension; the value is what the coach says when
   * that dimension is the next open one.
   */
  private static readonly QUESTIONS: Readonly<Record<NodeType, string>> = {
    problem:
      "Empecemos por el problema. ¿Qué dolor concreto tiene hoy quien sería tu cliente, y por qué le importa?",
    segment:
      "Ahora el segmento. ¿Quién es exactamente ese cliente? Cuanto más concreto lo digas, mejor: edad, tamaño, dónde está, qué hace hoy.",
    value_proposition:
      "La propuesta de valor. ¿Por qué te eligen y no a otra opción? Si lo dices en una frase, ya tienes algo.",
    solution:
      "La solución. ¿Qué entregas exactamente para resolver ese problema? Puede ser un producto, un servicio o una forma de hacer algo.",
    channels:
      "Los canales. ¿Cómo llega el cliente hasta ti? Escribe los caminos que ya probaste o que te parecen más realistas.",
    revenue:
      "Los ingresos. ¿Cómo entra el dinero? Puede ser una suscripción, una venta, una comisión: lo que sea, tiene que ser concreto.",
    costs:
      "Los costos. ¿En qué se va el dinero cada mes? Suma lo que no puedes evitar y lo que crece con cada cliente.",
    competition:
      "La competencia. ¿Qué alternativas tiene hoy ese cliente para resolver lo mismo, aunque no sean tu competencia directa?",
    metrics:
      "Las métricas. ¿Qué tienes que mirar para saber que esto funciona? Elige una o dos, las que miras todas las semanas.",
    risks:
      "Los riesgos. ¿Qué puede salir mal? Lo que más te quita el sueño es lo que vale la pena escribir acá.",
  };

  async *stream(input: CoachRequest): AsyncIterable<string> {
    const answer = this.answerFor(input);

    // Streamed word by word: the real implementation does the same, so the
    // client code is identical in both cases.
    for (const word of answer.split(" ")) {
      yield `${word} `;
      await sleep(18);
    }
  }

  /**
   * The answer for one turn.
   *
   * When the agenda has an open dimension, the coach asks about it. When
   * everything is filled, the coach works the next open step — and when there
   * is none either, it pivots to starting the venture: the structuring is
   * over, the accompaniment begins.
   */
  private answerFor(input: CoachRequest): string {
    const next = input.agenda[0] as NodeType | undefined;

    if (next) {
      return RehearsalCoachModel.QUESTIONS[next] ?? "";
    }

    if (input.nextStep) {
      // The person already answered about this step: repeating the question
      // froze the conversation. The coach now works the step — the advice it
      // gave when proposing it — and says how the step moves on.
      if (stepAlreadyRaised(input)) {
        const detail = input.nextStep.detail ? ` ${input.nextStep.detail}` : "";
        return `Seguimos con "${input.nextStep.title}".${detail} Dame lo que tengas de eso y, cuando lo veas listo, márcalo como hecho para pasar al siguiente paso.`;
      }

      return `El paso que sigue es: "${input.nextStep.title}". ¿Qué necesitas para darlo esta semana?`;
    }

    return `La idea "${input.title}" ya está completa: las diez dimensiones tienen respuesta validada. Ahora, a arrancar: en «El arranque» puedes pedirme los primeros pasos y aceptar los que te sirvan; después los trabajamos de a uno.`;
  }
}

/** A pause, so the streamed answer arrives at a human pace. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every dimension the rehearsal coach knows how to ask about. */
export const REHEARSAL_DIMENSIONS = NODE_TYPES;
