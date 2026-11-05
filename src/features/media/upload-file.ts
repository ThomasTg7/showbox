/** PUT del archivo a la URL firmada, con progreso (fetch aún no reporta subida). */
export function putFile(
  url: string,
  headers: Record<string, string>,
  file: Blob,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("No se pudo subir la imagen"));
    request.onerror = () => reject(new Error("No se pudo subir la imagen. Revisa tu conexión e inténtalo de nuevo."));
    request.send(file);
  });
}
