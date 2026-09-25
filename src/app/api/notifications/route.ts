import { database } from "@/lib/database";
import { defaultNotificationSettings, isNotificationSettings, sendPush, type NotificationSettings } from "@/lib/push-notifications";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function validTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false;
  try { new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format(); return true; } catch { return false; }
}

function subscription(value: unknown): value is { endpoint: string; keys: { p256dh: string; auth: string } } {
  const item = value as SubscriptionBody;
  return !!item && typeof item.endpoint === "string" && item.endpoint.startsWith("https://") && item.endpoint.length <= 2048
    && !!item.keys && typeof item.keys.p256dh === "string" && typeof item.keys.auth === "string";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const profileId = url.searchParams.get("profileId");
    const endpoint = url.searchParams.get("endpoint");
    if (!profileId || !endpoint) return Response.json({ subscribed: false, settings: defaultNotificationSettings });
    const sql = await database();
    const rows = await sql`SELECT settings FROM notification_subscriptions WHERE profile_id = ${profileId} AND endpoint = ${endpoint}`;
    const settings = rows[0]?.settings;
    return Response.json({ subscribed: rows.length > 0, settings: isNotificationSettings(settings) ? settings : defaultNotificationSettings });
  } catch (error) {
    console.error("Unable to read notification settings", error);
    return Response.json({ error: "Não foi possível consultar as notificações." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { profileId?: unknown; subscription?: unknown; timezone?: unknown; settings?: unknown; welcome?: unknown };
    if (typeof body.profileId !== "string" || !subscription(body.subscription) || !validTimezone(body.timezone) || !isNotificationSettings(body.settings)) {
      return Response.json({ error: "Configuração de notificação inválida." }, { status: 400 });
    }
    const sql = await database();
    const id = crypto.randomUUID();
    const item = body.subscription;
    await sql`
      INSERT INTO notification_subscriptions (id, profile_id, endpoint, p256dh, auth, timezone, settings)
      VALUES (${id}, ${body.profileId}, ${item.endpoint}, ${item.keys.p256dh}, ${item.keys.auth}, ${body.timezone}, ${JSON.stringify(body.settings)}::jsonb)
      ON CONFLICT (endpoint) DO UPDATE SET
        profile_id = EXCLUDED.profile_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        timezone = EXCLUDED.timezone,
        settings = EXCLUDED.settings,
        updated_at = now()
    `;
    if (body.welcome === true) {
      await sendPush(item, { title: "FitnessHub", body: "Notificações ativadas neste celular.", url: "/#perfil", tag: "fitnesshub-welcome" });
    }
    return Response.json({ subscribed: true, settings: body.settings satisfies NotificationSettings });
  } catch (error) {
    console.error("Unable to save notification subscription", error);
    return Response.json({ error: "Não foi possível ativar as notificações." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { profileId?: unknown; endpoint?: unknown };
    if (typeof body.profileId !== "string" || typeof body.endpoint !== "string") return Response.json({ error: "Assinatura inválida." }, { status: 400 });
    const sql = await database();
    await sql`DELETE FROM notification_subscriptions WHERE profile_id = ${body.profileId} AND endpoint = ${body.endpoint}`;
    return Response.json({ subscribed: false });
  } catch (error) {
    console.error("Unable to remove notification subscription", error);
    return Response.json({ error: "Não foi possível desativar as notificações." }, { status: 503 });
  }
}
