import { serializeJsonLd } from "@/domain/seo";

/** Datos estructurados de la página. El contenido es JSON con `<` escapado: nada de lo que venga de la base cierra la etiqueta. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
