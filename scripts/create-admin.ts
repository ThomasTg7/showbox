import { db } from "@/db";
import { createAdminWithPassword } from "@/features/admin-users/accounts";
import { auth } from "@/lib/auth";

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('Uso: pnpm create-admin <email> "<contraseña>"');
    process.exit(1);
  }

  await createAdminWithPassword(auth, db, email, password);

  console.info(`Administrador listo: ${email.trim().toLowerCase()} (si ya existía, se cambió su contraseña)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
