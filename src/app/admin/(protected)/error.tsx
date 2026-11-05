"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="text-muted-foreground max-w-prose">
        No pudimos cargar esta sección. Revisa tu conexión e intenta de nuevo. Si vuelve a pasar, avísale a quien
        mantiene el sitio.
      </p>
      <Button type="button" onClick={reset}>
        Intentar de nuevo
      </Button>
    </div>
  );
}
