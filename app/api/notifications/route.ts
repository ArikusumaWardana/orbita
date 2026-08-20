import { NextResponse } from "next/server";
import { getAuthenticatedDatabase } from "@/lib/db/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "5", 10)));
    const offset = (page - 1) * limit;

    const { db, user } = await getAuthenticatedDatabase();
    const [itemsResult, unreadResult] = await Promise.all([
      db.from("notifications")
        .select("id,title,body,type,resource_id,read_at,created_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      db.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

    if (itemsResult.error || unreadResult.error) return NextResponse.json({ error: "Notifikasi belum dapat dimuat." }, { status: 500 });

    const total = itemsResult.count ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const unreadCount = unreadResult.count ?? 0;

    return NextResponse.json({
      notifications: itemsResult.data ?? [],
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
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
