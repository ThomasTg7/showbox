"use client";

import { SelectField, TextField } from "@/components/admin/form-fields";

export function FighterPhysicalTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField name="weightKg" label="Peso (kg)" type="number" step="0.1" inputMode="decimal" hint="Se muestra también en libras." />
      <TextField name="heightCm" label="Estatura (cm)" type="number" inputMode="numeric" hint="Se muestra también en pies y pulgadas." />
      <TextField name="reachCm" label="Alcance (cm)" type="number" inputMode="numeric" />
      <SelectField name="stance" label="Guardia">
        <option value="">Sin dato</option>
        <option value="orthodox">Ortodoxo</option>
        <option value="southpaw">Zurdo</option>
        <option value="switch">Switch (ambas)</option>
      </SelectField>
      <TextField name="gym" label="Gimnasio" autoComplete="off" />
      <TextField name="coach" label="Entrenador" autoComplete="off" />
      <TextField name="baseDiscipline" label="Estilo de pelea" hint="Ej.: Fajador, Estilista, Contragolpeador" autoComplete="off" />
    </div>
  );
}
