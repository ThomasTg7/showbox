"use client";

import { TextField } from "@/components/admin/form-fields";

export function FighterSocialsTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <p className="max-w-prose text-muted-foreground md:col-span-2">
        Escribe el usuario (@usuario) o pega el enlace del perfil. Deja vacío lo que no tenga.
      </p>
      <TextField name="instagram" label="Instagram" placeholder="@usuario" autoCapitalize="none" />
      <TextField name="tiktok" label="TikTok" placeholder="@usuario" autoCapitalize="none" />
      <TextField name="youtube" label="YouTube" placeholder="Enlace del canal" autoCapitalize="none" />
      <TextField name="x" label="X (Twitter)" placeholder="@usuario" autoCapitalize="none" />
    </div>
  );
}
