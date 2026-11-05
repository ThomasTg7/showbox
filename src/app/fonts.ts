import { Archivo, Montserrat } from "next/font/google";

// `display: "swap"`: el texto se pinta de inmediato con una fuente de reemplazo de métricas ajustadas (sin saltos de diseño) y
// cambia a la de la marca cuando llega.
//
// Archivo es variable en ancho (`wdth` 62–125) y peso: una sola familia da los nombres gigantes anchos y pesados de los
// afiches ShowBox («SANTIN», «PADILLA VS JIMENEZ») y los datos condensados en cursiva («SÁBADO - 14 - NOVIEMBRE»).
// Montserrat, geométrica como el logotipo, se usa para lectura, formularios y las etiquetas espaciadas («QUORUM PASEO…»).

export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});
