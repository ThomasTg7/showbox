import { BRAND } from "@/domain/brand";
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

export type NotificationRow = { label: string; value: string };

type InboxNotificationEmailProps = {
  title: string;
  rows: NotificationRow[];
  /** Enlace a la bandeja del panel, donde se responde y se cambia el estado. */
  inboxUrl: string;
};

/** Aviso a la promotora de un mensaje nuevo en la bandeja: sus datos en filas y un botón al panel. Común a las dos postulaciones. */
export function InboxNotificationEmail({ title, rows, inboxUrl }: InboxNotificationEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ backgroundColor: "#000000", color: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ padding: "32px 24px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "24px", textTransform: "uppercase" }}>{title}</Heading>
          <Section>
            {rows.map((row) => (
              <Text key={row.label} style={{ margin: "0 0 10px" }}>
                <span style={{ color: "#a3a3a3", fontSize: "13px", textTransform: "uppercase" }}>{row.label}</span>
                <br />
                <span style={{ whiteSpace: "pre-wrap" }}>{row.value}</span>
              </Text>
            ))}
          </Section>
          <Button href={inboxUrl} style={{ backgroundColor: BRAND.colors.primary, color: "#ffffff", padding: "12px 20px", fontWeight: 700, marginTop: "16px" }}>
            Abrir en la bandeja
          </Button>
          <Text style={{ color: "#a3a3a3", fontSize: "13px" }}>Si el botón no funciona, copia este enlace en tu navegador: {inboxUrl}</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Solo las filas con valor: un dato que la persona no escribió no aparece vacío en el correo. */
export function presentRows(rows: { label: string; value: string | null | undefined }[]): NotificationRow[] {
  return rows.flatMap((row) => (row.value ? [{ label: row.label, value: row.value }] : []));
}
