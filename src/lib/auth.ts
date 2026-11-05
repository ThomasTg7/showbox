import { db } from "@/db";
import { getMailer } from "@/lib/mailer";
import { createAuth, type GoogleCredentials } from "./create-auth";
import { adminOrigin } from "./site-urls";

function googleCredentials(): GoogleCredentials | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

const google = googleCredentials();

export const googleSignInEnabled = google !== undefined;

// La sesión, el retorno de Google y los enlaces de los correos van al subdominio del panel (ADMIN_URL).
export const auth = createAuth({ db, mailer: getMailer(), google, baseURL: adminOrigin() });
