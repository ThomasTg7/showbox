/** Aviso fijo abajo mientras se ve una vista previa (con enlace firmado): la página no es lo que ve el público todavía. */
export function PreviewBanner({ subject = "esta ficha" }: { subject?: string }) {
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[90] bg-brand px-4 py-3 text-center font-cond text-sm font-extrabold uppercase tracking-[.1em] text-white">
      Vista previa · Así se verá {subject}. El enlace vence en 1 hora.
    </div>
  );
}
