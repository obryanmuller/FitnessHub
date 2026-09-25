import { vapidPublicKey } from "@/lib/push-notifications";

export async function GET() {
  try {
    return Response.json({ publicKey: vapidPublicKey() });
  } catch (error) {
    console.error("Unable to load push configuration", error);
    return Response.json({ error: "As notificações ainda não foram configuradas no servidor." }, { status: 503 });
  }
}
