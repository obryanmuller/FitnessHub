import { database } from "@/lib/database";
import { isFitnessData } from "@/features/fitness/model";

type ProfileRow = { id: string; name: string; updated_at: string };

function unavailable() {
  return Response.json({ error: "O banco de dados não está disponível." }, { status: 503 });
}

export async function GET() {
  try {
    const sql = await database();
    const rows = await sql`
      SELECT id, data->'profile'->>'name' AS name, updated_at
      FROM fitness_profiles
      ORDER BY created_at ASC
    ` as ProfileRow[];
    return Response.json({ profiles: rows.map((row) => ({ id: row.id, name: row.name, updatedAt: row.updated_at })) });
  } catch (error) {
    console.error("Unable to list fitness profiles", error);
    return unavailable();
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = body && typeof body === "object" && "data" in body ? (body as { data: unknown }).data : null;
    if (!isFitnessData(data)) return Response.json({ error: "Dados de perfil inválidos." }, { status: 400 });

    const id = crypto.randomUUID();
    const sql = await database();
    const rows = await sql`
      INSERT INTO fitness_profiles (id, data)
      VALUES (${id}, ${JSON.stringify(data)}::jsonb)
      RETURNING id, data, revision, updated_at
    `;
    const row = rows[0];
    return Response.json({ id: row.id, data: row.data, revision: row.revision, updatedAt: row.updated_at }, { status: 201 });
  } catch (error) {
    console.error("Unable to create fitness profile", error);
    return unavailable();
  }
}
