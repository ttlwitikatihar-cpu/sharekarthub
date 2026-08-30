import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json();
    const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : "";
    const action = body?.action;
    if (!targetUserId || !["suspend", "restore", "delete"].includes(action)) {
      return json({ error: "A valid targetUserId and action are required" }, 400);
    }
    if (targetUserId === authData.user.id) return json({ error: "You cannot manage your own admin account" }, 400);

    const admin = createClient(url, serviceKey);

    if (action === "suspend") {
      const { error: listingError } = await admin
        .from("listings")
        .update({ status: "suspended" })
        .eq("user_id", targetUserId)
        .in("status", ["active", "out_of_stock"]);
      if (listingError) throw listingError;

      const { error: profileError } = await admin
        .from("profiles")
        .update({ kyc_status: "banned" })
        .eq("user_id", targetUserId);
      if (profileError) throw profileError;
      return json({ ok: true, action, targetUserId });
    }

    if (action === "restore") {
      const { error: profileError } = await admin
        .from("profiles")
        .update({ kyc_status: "unverified" })
        .eq("user_id", targetUserId);
      if (profileError) throw profileError;

      const { error: listingError } = await admin
        .from("listings")
        .update({ status: "active" })
        .eq("user_id", targetUserId)
        .eq("status", "suspended");
      if (listingError) throw listingError;
      return json({ ok: true, action, targetUserId });
    }

    // Remove user-owned data first so historical foreign-key references do not
    // prevent auth.admin.deleteUser. This is intentionally irreversible.
    const { data: tickets } = await admin
      .from("support_tickets")
      .select("id")
      .or(`raised_by.eq.${targetUserId},against_user_id.eq.${targetUserId}`);
    const ticketIds = (tickets ?? []).map((ticket) => ticket.id);
    if (ticketIds.length > 0) {
      const { error } = await admin.from("ticket_messages").delete().in("ticket_id", ticketIds);
      if (error) throw error;
      const { error: ticketError } = await admin.from("support_tickets").delete().in("id", ticketIds);
      if (ticketError) throw ticketError;
    }

    const deleteBy = async (table: string, column: string) => {
      const { error } = await admin.from(table).delete().eq(column, targetUserId);
      if (error) throw error;
    };

    await deleteBy("messages", "sender_id");
    await deleteBy("notifications", "user_id");
    await deleteBy("cart_items", "user_id");
    await deleteBy("wishlist_items", "user_id");
    await deleteBy("user_activity", "user_id");
    await deleteBy("reviews", "reviewer_id");
    await deleteBy("reports", "reported_by");
    await deleteBy("reports", "reported_user_id");
    await deleteBy("conversations", "buyer_id");
    await deleteBy("conversations", "seller_id");
    await deleteBy("orders", "buyer_id");
    await deleteBy("orders", "seller_id");
    await deleteBy("listings", "user_id");
    await deleteBy("user_roles", "user_id");
    await deleteBy("profiles", "user_id");

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteUserError) throw deleteUserError;
    return json({ ok: true, action, targetUserId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Admin action failed" }, 500);
  }
});