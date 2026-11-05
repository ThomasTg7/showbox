import { BRAND } from "@/domain/brand";
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

type AdminPasswordLinkEmailProps = {
  url: string;
  kind: "invitation" | "reset";
};

const COPY = {
  invitation: {
    preview: `Te dieron acceso al panel de ${BRAND.name}`,
    title: "Te dieron acceso al panel",
    body: `Crea tu contraseña para entrar al panel de administración de ${BRAND.name}.`,
    action: "Crear contraseña",
  },
  reset: {
    preview: `Restablece tu contraseña del panel de ${BRAND.name}`,
    title: "Restablece tu contraseña",
    body: `Pediste restablecer tu contraseña del panel de ${BRAND.name}.`,
    action: "Elegir nueva contraseña",
  },
} as const;

export function AdminPasswordLinkEmail({ url, kind }: AdminPasswordLinkEmailProps) {
  const copy = COPY[kind];

  return (
    <Html lang="es">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ backgroundColor: "#000000", color: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ padding: "32px 24px", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "24px", textTransform: "uppercase" }}>{copy.title}</Heading>
          <Text>{copy.body}</Text>
          <Button
            href={url}
            style={{ backgroundColor: BRAND.colors.primary, color: "#ffffff", padding: "12px 20px", fontWeight: 700 }}
          >
            {copy.action}
          </Button>
          <Text style={{ color: "#a3a3a3", fontSize: "13px" }}>
            Si el botón no funciona, copia este enlace en tu navegador: {url}
          </Text>
          <Text style={{ color: "#a3a3a3", fontSize: "13px" }}>
            El enlace vence en 24 horas. Si no esperabas este correo, puedes ignorarlo.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
