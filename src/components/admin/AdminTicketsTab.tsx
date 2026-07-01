import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { LifeBuoy, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  awaiting_response: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const AdminTicketsTab = () => {
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [q, setQ] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((data || []).flatMap((t: any) => [t.raised_by, t.against_user_id])));
      let profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profs } = await supabase.rpc("admin_get_profiles", { _user_ids: userIds });
        (profs as any[] || []).forEach((p) => profileMap.set(p.user_id, p));
      }
      return (data || []).map((t: any) => ({
        ...t,
        raiser: profileMap.get(t.raised_by),
        opponent: profileMap.get(t.against_user_id),
      }));
    },
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return tickets.filter((t: any) => {
      if (status !== "all" && t.status !== status) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (query && !t.subject.toLowerCase().includes(query) && !t.description.toLowerCase().includes(query)
        && !(t.raiser?.full_name || "").toLowerCase().includes(query)
        && !(t.opponent?.full_name || "").toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tickets, status, priority, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, in_progress: 0, awaiting_response: 0, resolved: 0, closed: 0 };
    tickets.forEach((t: any) => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [tickets]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] uppercase text-muted-foreground">{k.replace("_", " ")}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search subject, user, description..." value={q} onChange={(e) => setQ(e.target.value)}
          className="max-w-sm h-9" aria-label="Search tickets" />
        <Filter className="h-4 w-4 text-muted-foreground ml-auto" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 h-9 text-xs" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-32 h-9 text-xs" aria-label="Priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading tickets...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <LifeBuoy className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-60" />
          <p className="text-sm text-muted-foreground">No tickets match these filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {filtered.map((t: any) => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-start gap-3 p-4 hover:bg-muted/40">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{t.subject}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[t.status] || ""}`}>{t.status.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t.raiser?.full_name || "?"} → {t.opponent?.full_name || "?"} · {t.category} · {new Date(t.created_at).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTicketsTab;
