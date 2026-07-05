import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Restore order matters: parents before children
const RESTORE_ORDER = [
  "profiles",
  "user_roles",
  "platform_settings",
  "listings",
  "conversations",
  "messages",
  "orders",
  "reviews",
  "notifications",
  "cart_items",
  "wishlist_items",
  "support_tickets",
  "ticket_messages",
  "user_activity",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const payload = body?.backup;
    const mode = (body?.mode ?? "merge") as "merge" | "replace";
    if (!payload || typeof payload !== "object" || !payload.data) {
      return new Response(JSON.stringify({ error: "Invalid backup file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const report: Record<string, { inserted?: number; deleted?: number; error?: string; skipped?: boolean }> = {};

    if (mode === "replace") {
      // Wipe children -> parents (reverse dependency order)
      for (const table of [...RESTORE_ORDER].reverse()) {
        const { error, count } = await admin.from(table).delete({ count: "exact" }).not("id", "is", null);
        if (error) report[table] = { error: `wipe: ${error.message}` };
        else report[table] = { deleted: count ?? 0 };
      }
    }

    for (const table of RESTORE_ORDER) {
      const rows = (payload.data as any)[table];
      if (!Array.isArray(rows)) { report[table] = { ...(report[table] ?? {}), skipped: true }; continue; }
      if (rows.length === 0) { report[table] = { ...(report[table] ?? {}), inserted: 0 }; continue; }
      // Upsert in chunks of 500
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await admin.from(table).upsert(chunk, { onConflict: "id" });
        if (error) {
          report[table] = { ...(report[table] ?? {}), inserted, error: error.message };
          break;
        }
        inserted += chunk.length;
      }
      if (!report[table]?.error) report[table] = { ...(report[table] ?? {}), inserted };
    }

    return new Response(JSON.stringify({ ok: true, mode, report }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
