import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, CheckCircle, XCircle, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AdminReportsTabProps {
  userId?: string;
  logAction: (action: string, targetType: string, targetId: string, details: string) => void;
}

const AdminReportsTab = ({ userId, logAction }: AdminReportsTabProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [resolveDialog, setResolveDialog] = useState<{ id: string; status: string } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch reporter and reported user names
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-report-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const getName = (uid: string | null) => {
    if (!uid) return "—";
    return profiles.find(p => p.user_id === uid)?.full_name || uid.slice(0, 8);
  };

  const resolveReport = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await (supabase as any).from("reports").update({
        status,
        admin_notes: notes,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      logAction(`report_${vars.status}`, "report", vars.id, `Report ${vars.status}: ${vars.notes}`);
      toast({ title: `Report ${vars.status}` });
      setResolveDialog(null);
      setAdminNotes("");
    },
  });

  const filtered = reports.filter((r: any) => filter === "all" || r.status === filter);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["all", "pending", "resolved", "dismissed"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">{f}</Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="text-center py-10 text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No reports found</p>
        ) : filtered.map((r: any) => (
          <div key={r.id} className="px-5 py-4 border-b border-border last:border-b-0">
            <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
              <Flag className="h-4 w-4 text-destructive mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {r.reported_listing_id ? "Reported Listing" : "Reported User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  By: {getName(r.reported_by)} · 
                  {r.reported_user_id && ` User: ${getName(r.reported_user_id)} ·`}
                  {r.reported_listing_id && ` Listing: ${r.reported_listing_id.slice(0, 8)}… ·`}
                  {" "}{new Date(r.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm mt-1"><strong>Reason:</strong> {r.reason}</p>
                {r.details && <p className="text-xs text-muted-foreground mt-0.5">{r.details}</p>}
                {r.admin_notes && <p className="text-xs text-primary mt-1">Admin: {r.admin_notes}</p>}
              </div>
              <Badge variant={r.status === "resolved" ? "default" : r.status === "dismissed" ? "secondary" : "destructive"} className="text-xs shrink-0">
                {r.status}
              </Badge>
              <div className="flex gap-1 shrink-0">
                {r.reported_listing_id && (
                  <Button size="icon" variant="ghost" onClick={() => navigate(`/item/${r.reported_listing_id}`)} title="View Listing">
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {r.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setResolveDialog({ id: r.id, status: "resolved" }); setAdminNotes(""); }}>
                      <CheckCircle className="h-3.5 w-3.5" /> Resolve
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setResolveDialog({ id: r.id, status: "dismissed" }); setAdminNotes(""); }}>
                      <XCircle className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{resolveDialog?.status === "resolved" ? "Resolve" : "Dismiss"} Report</DialogTitle></DialogHeader>
          <Textarea placeholder="Admin notes (optional)..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button onClick={() => resolveDialog && resolveReport.mutate({ id: resolveDialog.id, status: resolveDialog.status, notes: adminNotes })}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsTab;
