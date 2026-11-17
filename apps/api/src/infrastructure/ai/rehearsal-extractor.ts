import { NODE_TYPES, type NodeType } from "@bid/core";
import type {
  ExtractionRequest,
  Extractor,
} from "../../application/ports/extractor";

/**
 * The extractor that reads the conversation with patterns.
 *
 * It is the same reasoning as the rehearsal coach: the app has to be
 * demonstrable without a provider (RNF-15), and the extraction flow —proposal,
 * confirmation, the tree updating— has to be testable end to end.
 *
 * The patterns are deliberately obvious: they look for the words a person
 * actually uses when they describe a business. A phrase that matches is a
 * **proposal**, never a fact: it enters as `inferred` and waits for the user.
 */
export class RehearsalExtractor implements Extractor {
  /**
   * The phrases that suggest each dimension.
   *
   * They are ordered: the first match wins, so the more specific patterns come
   * before the generic ones.
   */
  private static readonly PATTERNS: Readonly<
    Record<NodeType, readonly RegExp[]>
  > = {
    problem: [
      /no (?:tienen|hay) \s+\w+/i,
      /el problema (?:es|era)/i,
      /falta .{0,40}/i,
    ],
    segment: [
      /(?:mis |para )clientes? (?:son|:)/i,
      /(?:para|son) (?:oficinas|empresas|negocios|restaurantes|gimnasios)/i,
      /oficinas? (?:de|pequeñ)/i,
      /mi cliente (?:es|ideal)/i,
    ],
    value_proposition: [
      /la ventaja (?:es|de)/i,
      /por qu[eé] me eligen/i,
      /nos diferencia/i,
      /(?:ofrecemos|ofrezco|aporto) /i,
    ],
    solution: [
      /(?:la|soluci[oó]n) (?:es|:)/i,
      /(?:vendo|ofrezco|entrego|construyo|creo) /i,
      /(?:app|plataforma|producto|servicio) (?:de|para|que)/i,
    ],
    channels: [
      /(?:vendo|vendemos) (?:por|mediante)/i,
      /(?:instagram|linkedin|google|tiktok|redes)/i,
      /(?:canal|v[ií]a) (?:de|por)/i,
      /por (?:la web|internet|referidos)/i,
    ],
    revenue: [
      /(?:cobra|cobro|precio|cuesta|mensual|por mes|suscrip)/i,
      /(?:\$|\d+ ?(?:euros|usd|dolares))/i,
      /se lleva (?:el )?(?:margen|comisi)/i,
    ],
    costs: [
      /(?:cuesta|cost(?:ea|os)|gasto|gastos)/i,
      /(?:materia prima|env[ií]o|log[ií]stica)/i,
      /(?:pago|pagamos) (?:alquiler|proveedor)/i,
    ],
    competition: [
      /(?:competencia|competidores|rivales)/i,
      /hay (?:otras|alternativas)/i,
      /tambi[eé]n (?:hay|venden|existe)/i,
    ],
    metrics: [
      /(?:m[eé]trica|kpi|objetivo)/i,
      /(?:mido|medir|cuenta) (?:los|las|el)/i,
      /quiero (?:saber|medir)/i,
    ],
    risks: [
      /(?:riesgo|me preocupa|preocupa|peligro)/i,
      /(?:si no|por si)/i,
      /(?:dependo|podr[ií]a)/i,
    ],
  };

  async extract(input: ExtractionRequest): Promise<string> {
    const userText = input.messages
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .join("\n");

    const proposals = RehearsalExtractor.propose(userText);

    return JSON.stringify({ nodes: proposals });
  }

  /**
   * Finds the dimensions the text talks about.
   *
   * One proposal per dimension: the first sentence that matches wins, because
   * two proposals for the same dimension would be noise for the user to review.
   */
  private static propose(text: string): {
    type: NodeType;
    content: string;
    confidence: number;
  }[] {
    const proposals: {
      type: NodeType;
      content: string;
      confidence: number;
    }[] = [];

    const seen = new Set<NodeType>();

    for (const sentence of RehearsalExtractor.sentences(text)) {
      for (const type of NODE_TYPES) {
        if (seen.has(type)) {
          continue;
        }

        const patterns = RehearsalExtractor.PATTERNS[type];

        if (patterns.some((pattern) => pattern.test(sentence))) {
          proposals.push({
            type,
            content: sentence.slice(0, 300),
            confidence: 0.6,
          });
          seen.add(type);
          break;
        }
      }
    }

    return proposals;
  }

  /** Splits the text into sentences, keeping the ones worth proposing. */
  private static sentences(text: string): string[] {
    return text
      .split(/(?<=[.!?\n])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 12)
      .slice(-8);
  }
}
