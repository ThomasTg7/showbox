import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { MediaField } from "@/features/media/components/media-field";
import { MediaGalleryField } from "@/features/media/components/media-gallery-field";
import { requireAdmin } from "@/lib/require-admin";

// Banco de pruebas de los campos de imagen para revisar el flujo completo a mano y en los e2e.
// Los planes 02–04 usan estos mismos campos dentro de sus formularios; esta página no existe en producción.
export default async function AdminMediosPage() {
  await requireAdmin();
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AdminPage title="Prueba de imágenes">
      <p className="text-sm text-muted-foreground">
        Sube una imagen, recórtala y guárdala. Solo se ve en desarrollo.
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Foto de cuerpo completo</h2>
          <MediaField kind="fighter_body" name="fighterBody" />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Logo del patrocinador</h2>
          <MediaField kind="sponsor_logo" name="sponsorLogo" />
        </section>
        <section className="flex flex-col gap-2 lg:col-span-2">
          <h2 className="font-semibold">Galería</h2>
          <MediaGalleryField name="gallery" />
        </section>
      </div>
    </AdminPage>
  );
}
