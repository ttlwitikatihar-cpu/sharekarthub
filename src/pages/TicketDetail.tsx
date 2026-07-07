import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, CheckCircle2, XCircle, ShieldCheck, LifeBuoy, Package, User as UserIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  awaiting_response: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("support_tickets").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const [{ data: listing }, { data: raiser }, { data: opponent }, { data: order }] = await Promise.all([
        data.listing_id ? supabase.from("listings").select("id, title, price").eq("id", data.listing_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("profiles").select("user_id, full_name, shop_name").eq("user_id", data.raised_by).maybeSingle(),
        supabase.from("profiles").select("user_id, full_name, shop_name").eq("user_id", data.against_user_id).maybeSingle(),
        data.order_id ? supabase.from("orders").select("id, status, quantity, buyer_id, seller_id, created_at").eq("id", data.order_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { ...data, listing, raiser, opponent, order };
    },
    enabled: !!id,
  });

  const { data: messages = [], refetch: refetchMsg } = useQuery({
    queryKey: ["ticket-messages", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ticket-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${id}` }, () => refetchMsg())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets", filter: `id=eq.${id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetch, refetchMsg]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading ticket...</div>;
  if (!ticket) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <LifeBuoy className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Ticket not found or you don't have access.</p>
          <Button variant="outline" onClick={() => navigate("/tickets")}>Back to Tickets</Button>
        </div>
      </main>
    </div>
  );

  const isRaiser = user?.id === ticket.raised_by;
  const isOpponent = user?.id === ticket.against_user_id;
  const canParticipate = isRaiser || isOpponent || isAdmin;
  const canClose = (isRaiser || isOpponent || isAdmin) && ticket.status !== "closed" && ticket.status !== "resolved";
  const canResolve = isAdmin && ticket.status !== "resolved" && ticket.status !== "closed";
  const canReopen = (isRaiser || isAdmin) && (ticket.status === "closed" || ticket.status === "resolved");

  const send = async () => {
    if (!user) return;
    const text = reply.trim();
    if (text.length < 1 || text.length > 2000) {
      toast({ title: "Message must be 1–2000 characters", variant: "destructive" }); return;
    }
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      message: text,
      // is_admin_reply is enforced server-side via trigger; only admins can set it true
      is_admin_reply: !!isAdmin && !isRaiser && !isOpponent,
    });
    // Bump status to reflect activity
    if (!error) {
      let nextStatus = ticket.status;
      if (isAdmin && !isRaiser && !isOpponent) nextStatus = "in_progress";
      else if (isRaiser && ticket.status === "awaiting_response") nextStatus = "in_progress";
      else if (isOpponent) nextStatus = "awaiting_response";
      if (nextStatus !== ticket.status) {
        await supabase.from("support_tickets").update({ status: nextStatus }).eq("id", ticket.id);
      }
    }
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
    qc.invalidateQueries({ queryKey: ["ticket-messages", id] });
  };

  const changeStatus = async (status: string, resolution?: string) => {
    const payload: any = { status };
    if (status === "resolved") {
      payload.resolved_at = new Date().toISOString();
      payload.resolved_by = user?.id;
      if (resolution) payload.resolution = resolution;
    }
    const { error } = await supabase.from("support_tickets").update(payload).eq("id", ticket.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Ticket ${status.replace("_", " ")}` });
    refetch();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title={`Ticket: ${ticket.subject} — ShareKart`} description="Support ticket details." path={`/tickets/${ticket.id}`} noindex />
      <Navbar />
      <main className="container flex-1 py-6 max-w-3xl">
        <button onClick={() => navigate("/tickets")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </button>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="capitalize">{ticket.category}</span>
                <span>·</span>
                <span className="capitalize">Priority: {ticket.priority}</span>
                <span>·</span>
                <span>Opened {new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[ticket.status] || ""}`}>
              {ticket.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4 text-xs">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground mb-1 flex items-center gap-1"><UserIcon className="h-3 w-3" /> Raised by</p>
              <p className="font-medium">{ticket.raiser?.full_name || "Unknown"}{ticket.raiser?.shop_name ? ` · 🏪 ${ticket.raiser.shop_name}` : ""}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground mb-1 flex items-center gap-1"><UserIcon className="h-3 w-3" /> Against</p>
              <p className="font-medium">{ticket.opponent?.full_name || "Unknown"}{ticket.opponent?.shop_name ? ` · 🏪 ${ticket.opponent.shop_name}` : ""}</p>
            </div>
            {ticket.listing && (
              <div className="rounded-lg border border-border p-3 sm:col-span-2">
                <p className="text-muted-foreground mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> Related item</p>
                <Link to={`/item/${ticket.listing.id}`} className="font-medium text-primary underline">{ticket.listing.title}</Link>
                {ticket.order && <span className="text-muted-foreground"> · Order status: {ticket.order.status} · Qty {ticket.order.quantity}</span>}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-muted/40 border border-border p-3 text-sm whitespace-pre-wrap">{ticket.description}</div>

          {ticket.resolution && (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
              <p className="text-xs font-semibold text-emerald-600 mb-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Resolution</p>
              <p className="whitespace-pre-wrap">{ticket.resolution}</p>
            </div>
          )}

          {canParticipate && (
            <div className="flex flex-wrap gap-2 mt-4">
              {canClose && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => changeStatus("closed")}>
                  <XCircle className="h-3.5 w-3.5" /> Close ticket
                </Button>
              )}
              {canResolve && (
                <Button size="sm" className="gap-1" onClick={() => {
                  const r = window.prompt("Resolution notes (visible to both parties):", "");
                  if (r !== null) changeStatus("resolved", r);
                }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved (admin)
                </Button>
              )}
              {canReopen && (
                <Button size="sm" variant="outline" onClick={() => changeStatus("open")}>Re-open</Button>
              )}
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="mt-5 rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Conversation ({messages.length})</h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No replies yet. Start the conversation below.</p>
            )}
            {messages.map((m: any) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.is_admin_reply
                      ? "bg-primary/10 border border-primary/30"
                      : mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <div className="flex items-center gap-1.5 text-[10px] opacity-80 mb-0.5">
                      {m.is_admin_reply && <ShieldCheck className="h-3 w-3" />}
                      <span>{m.is_admin_reply ? "Admin" : mine ? "You" : (m.sender_id === ticket.raised_by ? (ticket.raiser?.full_name || "Raiser") : (ticket.opponent?.full_name || "Other party"))}</span>
                      <span>· {new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          {canParticipate && ticket.status !== "closed" && ticket.status !== "resolved" ? (
            <div className="border-t border-border p-3 space-y-2">
              <Textarea aria-label="Reply" value={reply} onChange={(e) => setReply(e.target.value)}
                maxLength={2000} rows={3} placeholder="Type your reply..." />
              <div className="flex justify-end">
                <Button size="sm" onClick={send} disabled={sending || !reply.trim()} className="gap-1">
                  <Send className="h-3.5 w-3.5" /> {sending ? "Sending..." : "Send reply"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t border-border p-3 text-xs text-muted-foreground text-center">
              This ticket is {ticket.status}. {canReopen ? "Re-open it above to continue." : ""}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TicketDetail;
