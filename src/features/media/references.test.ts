import { getTableConfig, type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { media } from "@/db/schema/media";
import { MEDIA_REFERENCES } from "./references";

function isPgTable(value: unknown): value is PgTable {
  return typeof value === "object" && value !== null && Symbol.for("drizzle:IsDrizzleTable") in value;
}

function columnKey(column: AnyPgColumn): string {
  return `${getTableConfig(column.table as PgTable).name}.${column.name}`;
}

describe("MEDIA_REFERENCES", () => {
  it("registers every foreign key that points at media.id", () => {
    const foreignKeys = (Object.values(schema) as unknown[])
      .filter(isPgTable)
      .flatMap((table) => getTableConfig(table).foreignKeys)
      .map((foreignKey) => foreignKey.reference())
      .filter((reference) => reference.foreignTable === media && reference.foreignColumns[0]?.name === "id")
      .map((reference) => columnKey(reference.columns[0] as AnyPgColumn));

    const registered = MEDIA_REFERENCES.flatMap((reference) => ("column" in reference ? [columnKey(reference.column)] : []));

    expect(foreignKeys.length).toBeGreaterThan(0);
    expect(registered.sort()).toEqual(expect.arrayContaining(foreignKeys));
  });

  it("registers the fighter photos", () => {
    const labels = MEDIA_REFERENCES.map((reference) => reference.label);
    expect(labels).toEqual(expect.arrayContaining(["Foto de cuerpo del boxeador", "Foto de rostro del boxeador"]));
  });
});
