import type { BoutLevel } from "@/domain/bout-enums";

/** `?nivel=amateur` es el ranking amateur; cualquier otro valor (o ninguno) es el profesional. */
export function parseRankingLevel(value: string | string[] | undefined): BoutLevel {
  return value === "amateur" ? "amateur" : "pro";
}

/** Cada nivel es una página distinta (otro contenido): la URL del amateur lleva su parámetro. */
export function rankingsHref(level: BoutLevel): string {
  return level === "amateur" ? "/rankings?nivel=amateur" : "/rankings";
}
