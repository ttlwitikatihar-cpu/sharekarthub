import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy, Inbox, Send, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  awaiting_response: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const Tickets = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"all" | "raised" | "against">("all");
  const [status, setStatus] = useState<string>("all");

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .or(`raised_by.eq.${user.id},against_user_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tickets-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  const filtered = useMemo(() => {
    return tickets.filter((t: any) => {
      if (tab === "raised" && t.raised_by !== user?.id) return false;
      if (tab === "against" && t.against_user_id !== user?.id) return false;
      if (status !== "all" && t.status !== status) return false;
      return true;
    });
  }, [tickets, tab, status, user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <LifeBuoy className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Sign in to view your support tickets.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Support Tickets — ShareKart" description="Track and resolve your order-related support tickets." path="/tickets" noindex />
      <Navbar />
      <main className="container flex-1 py-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <LifeBuoy className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Support Tickets</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
            {[
              { v: "all", l: "All", i: Inbox },
              { v: "raised", l: "Raised by me", i: Send },
              { v: "against", l: "About me", i: LifeBuoy },
            ].map(({ v, l, i: Icon }) => (
              <button key={v} onClick={() => setTab(v as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 ${
                  tab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <Icon className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-40 text-xs" aria-label="Status filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading tickets...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-border">
            <Inbox className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-60" />
            <p className="text-sm text-muted-foreground">No tickets to show.</p>
            <p className="text-xs text-muted-foreground mt-1">You can raise a ticket from your <Link to="/orders" className="text-primary underline">Orders</Link> page.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t: any) => (
              <Link key={t.id} to={`/tickets/${t.id}`}
                className="block rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${STATUS_STYLES[t.status] || ""}`}>
                    {t.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span className="capitalize">{t.category}</span>
                  <span>·</span>
                  <span className="capitalize">Priority: {t.priority}</span>
                  <span>·</span>
                  <span>{t.raised_by === user.id ? "You raised" : "Raised against you"}</span>
                  <span className="ml-auto">{new Date(t.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Tickets;
