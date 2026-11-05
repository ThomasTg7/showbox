import { adminPath } from "@/lib/site-urls";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Lo que se abrió desde un enlace viejo o mal copiado (p. ej. un boxeador que ya no existe). */
export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">No encontramos lo que buscas</h1>
      <p className="max-w-prose text-muted-foreground">
        Puede que se haya enviado a la papelera o que el enlace esté incompleto. Vuelve al inicio del panel o revisa la
        Papelera.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={adminPath("/")}>Ir al inicio</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={adminPath("/papelera")}>Ver la papelera</Link>
        </Button>
      </div>
    </div>
  );
}
