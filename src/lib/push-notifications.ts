import "server-only";

import webPush from "web-push";

export { defaultNotificationSettings, isNotificationSettings, type NotificationSettings } from "./reminder-policy";

export function vapidPublicKey(): string {
  const value = process.env.VAPID_PUBLIC_KEY;
  if (!value) throw new Error("VAPID_PUBLIC_KEY is not configured");
  return value;
}

export function configureWebPush() {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!privateKey) throw new Error("VAPID_PRIVATE_KEY is not configured");
  webPush.setVapidDetails(subject, vapidPublicKey(), privateKey);
}

export async function sendPush(subscription: webPush.PushSubscription, payload: object) {
  configureWebPush();
  await webPush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 });
}
