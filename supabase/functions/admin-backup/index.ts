import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tables included in the backup (in dependency-safe order for restore)
const TABLES = [
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

    // Verify caller is admin
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

    // Use service role to read all rows regardless of RLS
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const backup: Record<string, unknown> = {
      meta: {
        version: 1,
        app: "ShareKart",
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        tables: TABLES,
      },
      data: {} as Record<string, unknown[]>,
    };

    for (const table of TABLES) {
      const { data, error } = await admin.from(table).select("*");
      if (error) {
        // Skip missing tables gracefully, keep going
        (backup.data as any)[table] = { error: error.message };
        continue;
      }
      (backup.data as any)[table] = data ?? [];
    }

    const filename = `sharekart-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
