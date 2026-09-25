import { database } from "@/lib/database";
import { isFitnessData } from "@/features/fitness/model";

type ProfileContext = { params: Promise<{ id: string }> };

function unavailable() {
  return Response.json({ error: "O banco de dados não está disponível." }, { status: 503 });
}

export async function GET(_request: Request, context: ProfileContext) {
  try {
    const { id } = await context.params;
    const sql = await database();
    const rows = await sql`SELECT id, data, revision, updated_at FROM fitness_profiles WHERE id = ${id}`;
    if (!rows.length) return Response.json({ error: "Perfil não encontrado." }, { status: 404 });
    const row = rows[0];
    if (!isFitnessData(row.data)) return Response.json({ error: "Os dados deste perfil são inválidos." }, { status: 500 });
    return Response.json({ id: row.id, data: row.data, revision: row.revision, updatedAt: row.updated_at });
  } catch (error) {
    console.error("Unable to read fitness profile", error);
    return unavailable();
  }
}

export async function PUT(request: Request, context: ProfileContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const data = body && typeof body === "object" && "data" in body ? (body as { data: unknown }).data : null;
    if (!isFitnessData(data)) return Response.json({ error: "Dados de perfil inválidos." }, { status: 400 });

    const sql = await database();
    const rows = await sql`
      UPDATE fitness_profiles
      SET data = ${JSON.stringify(data)}::jsonb, revision = revision + 1, updated_at = now()
      WHERE id = ${id}
      RETURNING id, revision, updated_at
    `;
    if (!rows.length) return Response.json({ error: "Perfil não encontrado." }, { status: 404 });
    const row = rows[0];
    return Response.json({ id: row.id, revision: row.revision, updatedAt: row.updated_at });
  } catch (error) {
    console.error("Unable to save fitness profile", error);
    return unavailable();
  }
}
