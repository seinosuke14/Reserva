/**
 * Extrae el mensaje de error de una respuesta HttpClient.
 *
 * Cuando se usa `responseType: 'blob'`, un error del servidor (ej. 400 con JSON)
 * llega como un Blob en `err.error`, no como objeto. Esta función lee el Blob,
 * intenta parsearlo como JSON y devuelve su `message`; si no, usa el fallback.
 */
export async function blobErrorMessage(err: any, fallback: string): Promise<string> {
  try {
    if (err?.error instanceof Blob) {
      const text = await err.error.text();
      const json = JSON.parse(text);
      return json?.message ?? fallback;
    }
    return err?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
