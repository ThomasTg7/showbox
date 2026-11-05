# Configuración externa: Google y correo

El código ya está listo. Mientras no configures esto:

- **Google:** el botón "Continuar con Google" no aparece. Todo lo demás funciona.
- **Correo:** `MAIL_DRIVER=console` no envía nada; los correos de invitación y recuperación (con su enlace) se imprimen en la terminal donde corre `pnpm dev`. Sirve para probar todo en tu PC.

Cuando quieras activarlos, sigue estos pasos. **No pegues las claves en el chat**: van en tu archivo `.env` (en tu PC) y en las variables de entorno de Vercel (producción). Solo avísame "ya están" y yo verifico que funcione.

---

## 1. Login con Google (~10 min)

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) con la cuenta de Google de la promotora y crea un proyecto (p. ej. "Open Fight Latam").
2. Menú → **APIs y servicios → Pantalla de consentimiento de OAuth** (en algunas cuentas aparece como **Google Auth Platform**):
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `Open Fight Latam`, correo de soporte: el de la promotora.
   - Permisos (scopes): solo los básicos (`email`, `profile`, `openid`); no hace falta verificación de Google.
   - Publica la app ("En producción"). Si la dejas "En prueba", solo podrán entrar los correos que agregues como usuarios de prueba.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - El panel vive en su propio subdominio (`admin.openfightlatam.cl`; en tu PC, `admin.localhost:3000`), así que Google se configura con ese dominio, no con el del sitio.
   - Orígenes de JavaScript autorizados: `http://admin.localhost:3000` y, cuando exista, `https://admin.openfightlatam.cl`.
   - URI de redireccionamiento autorizados: `http://admin.localhost:3000/api/auth/callback/google` y `https://admin.openfightlatam.cl/api/auth/callback/google`.
4. Copia el **ID de cliente** y el **Secreto** a `.env`:
   ```
   GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="..."
   ```
5. Reinicia `pnpm dev`. El botón aparece en `http://admin.localhost:3000/login`. Solo entran correos que estén en **Usuarios** del panel; cualquier otro ve "Este correo no tiene acceso al panel."

## 2. Correos con Resend (~15 min + esperar DNS)

Necesitas un **dominio propio** (p. ej. `openfightlatam.cl`) para enviar a cualquier persona. Sin dominio, Resend solo deja enviar a tu propio correo (sirve para probar, no para producción).

1. Crea una cuenta en [resend.com](https://resend.com).
2. **Domains → Add Domain** → escribe tu dominio. Resend te muestra 3–4 registros DNS (SPF/DKIM, tipo TXT y MX).
3. Agrega esos registros donde administras el dominio (para `.cl` suele ser el proveedor donde lo compraste o NIC Chile con tu DNS). Vuelve a Resend y pulsa **Verify**; puede tardar desde minutos hasta unas horas.
4. **API Keys → Create API Key** con permiso "Sending access". Cópiala (se muestra una sola vez).
5. En `.env`:
   ```
   MAIL_DRIVER="resend"
   RESEND_API_KEY="re_..."
   MAIL_FROM="Open Fight Latam <no-reply@openfightlatam.cl>"
   ```
   El correo de `MAIL_FROM` debe ser del dominio verificado.
6. Prueba: en el panel, **Usuarios → Dar acceso** a tu propio correo, o **¿Olvidaste tu contraseña?** en el login.

## 3. En producción

Las mismas variables se cargan en Vercel → Project → Settings → Environment Variables (o en `deploy/.env` del VPS), junto con `SITE_URL`, `ADMIN_URL` (obligatorias en producción; **ya no se usa `BETTER_AUTH_URL`**) y un `BETTER_AUTH_SECRET` nuevo (`openssl rand -base64 32`). Para producción el redirect de Google es `https://admin.openfightlatam.cl/api/auth/callback/google`. Paso a paso, con todas las variables: [`deploy.md`](deploy.md) (Vercel) y [`vps-migration.md`](vps-migration.md) (servidor propio).

## Cómo entra un administrador

- **El primero:** `pnpm create-admin correo@dominio.cl "una-clave-segura"` (también sirve para cambiarle la clave si la olvida y no hay correo configurado).
- **Los demás:** desde el panel, **Usuarios → Dar acceso**. Le llega un correo para crear su contraseña (el enlace vence en 24 horas). Si Google está activado, también puede entrar directo con Google.
- Nadie puede registrarse por su cuenta: solo entran los correos de la lista de **Usuarios**.
