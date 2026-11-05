"use client";

import { useState } from "react";
import type { Division } from "@/db/schema/divisions";
import type { Country } from "@/domain/countries";
import { BIO_MAX_LENGTH } from "../schema";
import { SelectField, TextAreaField, TextField } from "@/components/admin/form-fields";

type FighterDataTabProps = {
  divisions: Division[];
  /** Los nombres de país los arma el servidor: `Intl` da textos distintos en Node y en el navegador (error de hidratación). */
  countries: Country[];
  defaults: { gender: string; divisionId: string };
  /** El enlace solo se edita en boxeadores ya creados. */
  showSlug: boolean;
};

export function FighterDataTab({ divisions, countries, defaults, showSlug }: FighterDataTabProps) {
  const [gender, setGender] = useState(defaults.gender);
  // Solo divisiones del mismo género; una inactiva se ofrece únicamente si el boxeador ya la tiene.
  const options = divisions.filter((division) => division.gender === gender && (division.active || division.id === defaults.divisionId));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField name="firstName" label="Nombre" autoComplete="off" />
      <TextField name="lastName" label="Apellido" autoComplete="off" />
      <TextField name="nickname" label="Apodo" hint="Sin comillas. Ej.: El Toro" autoComplete="off" />
      <SelectField name="gender" label="Categoría" onChange={(event) => setGender(event.target.value)}>
        <option value="male">Masculino</option>
        <option value="female">Femenino</option>
      </SelectField>
      <SelectField key={gender} name="divisionId" label="División">
        <option value="">Selecciona una división</option>
        {options.map((division) => (
          <option key={division.id} value={division.id}>
            {division.name} · hasta {division.limitKg} kg{division.active ? "" : " (inactiva)"}
          </option>
        ))}
      </SelectField>
      <SelectField name="nationality" label="Nacionalidad">
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </SelectField>
      <TextField name="hometown" label="Ciudad de origen" autoComplete="off" />
      <TextField name="birthDate" label="Fecha de nacimiento" type="date" hint="La edad se calcula sola." />
      <SelectField name="careerStatus" label="Estado del boxeador">
        <option value="active">Activo</option>
        <option value="inactive">Inactivo</option>
        <option value="retired">Retirado</option>
      </SelectField>
      {showSlug ? (
        <TextField
          name="slug"
          label="Enlace de la ficha"
          hint="Al renombrar al boxeador el enlace no cambia. Cámbialo solo si es necesario: los enlaces ya compartidos dejarían de funcionar."
          autoComplete="off"
          autoCapitalize="none"
        />
      ) : null}
      <div className="md:col-span-2">
        <TextAreaField name="bio" label="Bio breve" rows={4} maxLength={BIO_MAX_LENGTH} hint="Aparece dentro de la tarjeta de la ficha pública, bajo el nombre." />
      </div>
    </div>
  );
}
