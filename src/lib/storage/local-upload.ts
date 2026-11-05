import type { LocalDriver } from "./local";

/** Recibe el PUT que el navegador hace a la URL firmada del driver local (desarrollo o VPS sin S3). */
export async function handleLocalUpload(request: Request, key: string, storage: LocalDriver): Promise<Response> {
  const grant = storage.verifyUpload(key, new URL(request.url).searchParams);
  if (!grant) {
    return Response.json({ error: "Enlace de subida inválido o vencido" }, { status: 403 });
  }

  if (request.headers.get("content-type") !== grant.contentType) {
    return Response.json({ error: "Formato no permitido" }, { status: 400 });
  }

  // Sin largo declarado habría que leer el cuerpo entero antes de saber si excede el límite.
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader === null) {
    return Response.json({ error: "Falta el tamaño del archivo" }, { status: 411 });
  }
  if (Number(lengthHeader) > grant.maxBytes) {
    return Response.json({ error: "El archivo es demasiado grande" }, { status: 413 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.length > grant.maxBytes) {
    return Response.json({ error: "El archivo es demasiado grande" }, { status: 413 });
  }

  // Un solo uso: una vez subido (y quizá ya validado o sanitizado por finalizeUpload) no se puede reemplazar.
  if (!(await storage.putIfAbsent(key, body))) {
    return Response.json({ error: "Este enlace de subida ya se usó" }, { status: 409 });
  }
  return Response.json({ ok: true });
}
