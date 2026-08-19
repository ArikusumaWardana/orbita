import { NextResponse } from "next/server";
import { getAuthenticatedDatabase } from "@/lib/db/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db, user } = await getAuthenticatedDatabase();
    const { data, error } = await db.from("notifications")
      .select("id,title,body,type,resource_id,read_at,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    if (error) return NextResponse.json({ error: "Notifikasi belum dapat dimuat." }, { status: 500 });
    return NextResponse.json({ notifications: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: unknown; all?: unknown };
    const { db, user } = await getAuthenticatedDatabase();
    let query = db.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
    if (body.all !== true) {
      if (typeof body.id !== "string") return NextResponse.json({ error: "Notifikasi tidak valid." }, { status: 400 });
      query = query.eq("id", body.id);
    }
    const { error } = await query;
    if (error) return NextResponse.json({ error: "Notifikasi belum dapat diperbarui." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }
}
