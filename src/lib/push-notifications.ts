import "server-only";

import webPush from "web-push";

export type NotificationSettings = {
  meals: boolean;
  workout: boolean;
  water: boolean;
};

export const defaultNotificationSettings: NotificationSettings = {
  meals: true,
  workout: true,
  water: false,
};

export function isNotificationSettings(value: unknown): value is NotificationSettings {
  return !!value && typeof value === "object"
    && typeof (value as NotificationSettings).meals === "boolean"
    && typeof (value as NotificationSettings).workout === "boolean"
    && typeof (value as NotificationSettings).water === "boolean";
}

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
