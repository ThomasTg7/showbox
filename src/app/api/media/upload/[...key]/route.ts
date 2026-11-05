import { LocalDriver } from "@/lib/storage/local";
import { handleLocalUpload } from "@/lib/storage/local-upload";
import { getStorage } from "@/lib/storage";

export async function PUT(request: Request, { params }: RouteContext<"/api/media/upload/[...key]">): Promise<Response> {
  const storage = getStorage();
  if (!(storage instanceof LocalDriver)) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  const { key } = await params;
  return handleLocalUpload(request, key.join("/"), storage);
}
