import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/database";
import { isFitnessData, WORKOUT_ID, type Routine } from "@/features/fitness/model";
import { isNotificationSettings, sendPush, type NotificationSettings } from "@/lib/push-notifications";

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  settings: unknown;
  data: unknown;
};
type Reminder = { key: string; title: string; body: string; url: string };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
}

function localNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function due(now: number, time: string): boolean {
  const [hour, minute] = time.split(":").map(Number);
  const scheduled = hour * 60 + minute;
  return now >= scheduled && now - scheduled < 10;
}

function routineReminder(date: string, item: Routine, workout: boolean): Reminder {
  return {
    key: `${date}:routine:${item.id}:${item.time}`,
    title: workout ? "Hora do treino" : item.title,
    body: workout ? item.entries.join(" · ") : `Sua rotina de ${item.title.toLocaleLowerCase("pt-BR")} está esperando.`,
    url: workout ? "/#treinos" : "/#hoje",
  };
}

function reminders(row: SubscriptionRow): Reminder[] {
  if (!isFitnessData(row.data) || !isNotificationSettings(row.settings)) return [];
  const settings: NotificationSettings = row.settings;
  const now = localNow(row.timezone);
  const result: Reminder[] = [];
  for (const item of row.data.routine) {
    const workout = item.id === WORKOUT_ID;
    if (due(now.minutes, item.time) && ((workout && settings.workout) || (!workout && settings.meals))) result.push(routineReminder(now.date, item, workout));
  }
  if (settings.water && now.minutes >= 8 * 60 && now.minutes <= 20 * 60 && (now.minutes - 8 * 60) % 120 < 10) {
    const slot = Math.floor((now.minutes - 8 * 60) / 120);
    result.push({ key: `${now.date}:water:${slot}`, title: "Hora de beber água", body: "Uma pausa rápida para cuidar da sua hidratação.", url: "/#hoje" });
  }
  return result;
}

async function dispatch(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const sql = await database();
    const rows = await sql`
      SELECT subscriptions.id, subscriptions.endpoint, subscriptions.p256dh, subscriptions.auth,
        subscriptions.timezone, subscriptions.settings, profiles.data
      FROM notification_subscriptions subscriptions
      JOIN fitness_profiles profiles ON profiles.id = subscriptions.profile_id
    ` as SubscriptionRow[];
    let sent = 0, failed = 0;
    for (const row of rows) {
      for (const reminder of reminders(row)) {
        const inserted = await sql`
          INSERT INTO notification_deliveries (subscription_id, reminder_key)
          VALUES (${row.id}, ${reminder.key})
          ON CONFLICT DO NOTHING
          RETURNING reminder_key
        `;
        if (!inserted.length) continue;
        try {
          await sendPush({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, { ...reminder, tag: reminder.key });
          sent++;
        } catch (error) {
          failed++;
          const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
          if (statusCode === 404 || statusCode === 410) await sql`DELETE FROM notification_subscriptions WHERE id = ${row.id}`;
          else await sql`DELETE FROM notification_deliveries WHERE subscription_id = ${row.id} AND reminder_key = ${reminder.key}`;
          console.error("Unable to deliver push notification", error);
        }
      }
    }
    return Response.json({ subscriptions: rows.length, sent, failed });
  } catch (error) {
    console.error("Unable to dispatch notifications", error);
    return Response.json({ error: "Não foi possível enviar os lembretes." }, { status: 503 });
  }
}

export const GET = dispatch;
export const POST = dispatch;
