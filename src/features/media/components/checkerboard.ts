import type { CSSProperties } from "react";

/** Fondo de ajedrez para que se note la transparencia (fotos sin fondo). */
export const CHECKERBOARD: CSSProperties = {
  backgroundColor: "#141414",
  backgroundImage: "repeating-conic-gradient(#1f1f1f 0% 25%, transparent 0% 50%)",
  backgroundSize: "16px 16px",
};
