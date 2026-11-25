import type {
  PlanningRequest,
  StepPlanner,
} from "../../application/ports/step-planner";

/**
 * The step planner that answers from a script.
 *
 * It makes the arranque demonstrable without a model provider (RNF-15): the
 * steps are the ones any arranque needs, written the way a coach would put
 * them, and they pass the same boundary schema the live planner goes through —
 * so the offline walkthrough exercises the exact same code path.
 */
const REHEARSAL_STEPS = [
  {
    title: "Conseguir tus primeros tres clientes de prueba",
    detail:
      "Usa los canales que definiste: escríbeles hoy y ofrece una versión piloto.",
  },
  {
    title: "Fijar el precio de la primera versión",
    detail:
      "Un número concreto que puedas cobrar mañana, aunque no sea el definitivo.",
  },
  {
    title: "Identificar a tus primeros proveedores",
    detail:
      "Dos o tres opciones concretas a las que puedas llamar o escribir esta semana.",
  },
  {
    title: "Definir el lugar de la primera venta",
    detail: "Dónde va a pasar: un local, online o puerta a puerta.",
  },
] as const;

export class RehearsalStepPlanner implements StepPlanner {
  async plan(_input: PlanningRequest): Promise<string> {
    return JSON.stringify({ steps: REHEARSAL_STEPS });
  }
}
