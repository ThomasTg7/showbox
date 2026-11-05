/** Las dos fotos que se le suben a un boxeador: rostro y cuerpo. Cualquiera puede faltar. */
export type FighterPhotos<Media> = { headshotMedia: Media | null; bodyMedia: Media | null };

export type PickedFighterPhoto<Media> = { kind: "headshot" | "body"; media: Media } | { kind: "silhouette"; media: null };

/**
 * Qué foto del boxeador mostrar. Cada lugar pide la que mejor le calza (rostro en las miniaturas, cuerpo en tarjetas y
 * portadas); si esa no se subió se usa la otra, y solo sin ninguna va la silueta. `kind` dice cuál salió, para encuadrarla.
 */
export function pickFighterPhoto<Media>(photos: FighterPhotos<Media>, prefer: "headshot" | "body"): PickedFighterPhoto<Media> {
  const [first, second] = prefer === "headshot" ? (["headshot", "body"] as const) : (["body", "headshot"] as const);
  const mediaOf = (kind: "headshot" | "body") => (kind === "headshot" ? photos.headshotMedia : photos.bodyMedia);
  const firstMedia = mediaOf(first);
  if (firstMedia) return { kind: first, media: firstMedia };
  const secondMedia = mediaOf(second);
  if (secondMedia) return { kind: second, media: secondMedia };
  return { kind: "silhouette", media: null };
}
