import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

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

    const parsed = z.object({
      targetUserId: z.string().uuid(),
      action: z.enum(["suspend", "fraud", "restore", "delete"]),
      reason: z.string().trim().max(500).optional(),
    }).safeParse(await req.json());
    if (!parsed.success) return json({ error: "A valid targetUserId and action are required" }, 400);
    const { targetUserId, action, reason } = parsed.data;
    if (targetUserId === authData.user.id) return json({ error: "You cannot manage your own admin account" }, 400);

    const admin = createClient(url, serviceKey);

    if (action === "suspend" || action === "fraud") {
      const { error: listingError } = await admin
        .from("listings")
        .update({ status: "suspended" })
        .eq("user_id", targetUserId)
        .in("status", ["active", "out_of_stock"]);
      if (listingError) throw listingError;

      const { error: profileError } = await admin
        .from("profiles")
        .update({
          kyc_status: "banned",
          bio: action === "fraud"
            ? `[FRAUD - ${reason || "Flagged by admin"}]`
            : reason
              ? `[Suspended: ${reason}]`
              : "[Account suspended by admin]",
        })
        .eq("user_id", targetUserId);
      if (profileError) throw profileError;
      if (action === "fraud") {
        const { error: orderError } = await admin
          .from("orders")
          .update({ status: "cancelled" })
          .eq("seller_id", targetUserId)
          .in("status", ["pending", "active"]);
        if (orderError) throw orderError;
      }
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

    // Remove dependent data first so historical foreign-key references do not
    // prevent auth.admin.deleteUser. This is intentionally irreversible.
    const { data: tickets, error: ticketLookupError } = await admin
      .from("support_tickets")
      .select("id")
      .or(`raised_by.eq.${targetUserId},against_user_id.eq.${targetUserId}`);
    if (ticketLookupError) throw ticketLookupError;
    const ticketIds = (tickets ?? []).map((ticket) => ticket.id);
    if (ticketIds.length > 0) {
      const { error } = await admin.from("ticket_messages").delete().in("ticket_id", ticketIds);
      if (error) throw error;
      const { error: ticketError } = await admin.from("support_tickets").delete().in("id", ticketIds);
      if (ticketError) throw ticketError;
    }

    const { data: conversations, error: conversationLookupError } = await admin
      .from("conversations")
      .select("id")
      .or(`buyer_id.eq.${targetUserId},seller_id.eq.${targetUserId}`);
    if (conversationLookupError) throw conversationLookupError;
    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
    if (conversationIds.length > 0) {
      const { error } = await admin.from("messages").delete().in("conversation_id", conversationIds);
      if (error) throw error;
      const { error: conversationError } = await admin.from("conversations").delete().in("id", conversationIds);
      if (conversationError) throw conversationError;
    }

    const { data: listings, error: listingLookupError } = await admin
      .from("listings")
      .select("id")
      .eq("user_id", targetUserId);
    if (listingLookupError) throw listingLookupError;
    const listingIds = (listings ?? []).map((listing) => listing.id);

    const { data: orders, error: orderLookupError } = await admin
      .from("orders")
      .select("id")
      .or(`buyer_id.eq.${targetUserId},seller_id.eq.${targetUserId}`);
    if (orderLookupError) throw orderLookupError;
    const orderIds = (orders ?? []).map((order) => order.id);
    if (orderIds.length > 0) {
      const { error } = await admin.from("notifications").delete().in("order_id", orderIds);
      if (error) throw error;
      const { data: orderTickets, error: orderTicketLookupError } = await admin
        .from("support_tickets")
        .select("id")
        .in("order_id", orderIds);
      if (orderTicketLookupError) throw orderTicketLookupError;
      const orderTicketIds = (orderTickets ?? []).map((ticket) => ticket.id);
      if (orderTicketIds.length > 0) {
        const { error: orderMessageError } = await admin.from("ticket_messages").delete().in("ticket_id", orderTicketIds);
        if (orderMessageError) throw orderMessageError;
        const { error: orderTicketError } = await admin.from("support_tickets").delete().in("id", orderTicketIds);
        if (orderTicketError) throw orderTicketError;
      }
    }
    if (listingIds.length > 0) {
      const { error: listingReviewError } = await admin.from("reviews").delete().in("listing_id", listingIds);
      if (listingReviewError) throw listingReviewError;
      const { error: listingReportError } = await admin.from("reports").delete().in("reported_listing_id", listingIds);
      if (listingReportError) throw listingReportError;
    }

    const deleteBy = async (table: string, column: string) => {
      const { error } = await admin.from(table).delete().eq(column, targetUserId);
      if (error) throw error;
    };

    await deleteBy("notifications", "user_id");
    await deleteBy("cart_items", "user_id");
    await deleteBy("wishlist_items", "user_id");
    await deleteBy("user_activity", "user_id");
    await deleteBy("reviews", "reviewer_id");
    await deleteBy("reports", "reported_by");
    await deleteBy("reports", "reported_user_id");
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