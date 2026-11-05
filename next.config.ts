import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen autocontenida para el VPS (deploy/Dockerfile): `.next/standalone` lleva solo lo que la app necesita. Vercel lo ignora.
  output: "standalone",
  // Next 16 reescribe CLAUDE.md en cada `next dev` con su propio aviso para
  // agentes de IA; este proyecto ya tiene su CLAUDE.md con reglas propias.
  agentRules: false,
  // Los e2e compilan en su propia carpeta para poder correr con `pnpm dev` abierto
  // (Next no permite dos servidores de desarrollo sobre el mismo `.next`).
  distDir: process.env.E2E_DIST_DIR ?? ".next",
  // En desarrollo el panel se abre en admin.localhost (ver src/lib/site-urls.ts): Next bloquea por defecto
  // los recursos de desarrollo (HMR, chunks) pedidos desde otro origen.
  allowedDevOrigins: ["admin.localhost"],
};

export default nextConfig;
