import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, CheckCircle, XCircle, Eye, ChevronDown, ChevronUp, User, Ban, AlertTriangle } from "lucide-react";
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
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [resolveDialog, setResolveDialog] = useState<{ id: string; status: string } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; name: string; reportId: string } | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reports")
        .select("id, reported_listing_id, reported_user_id, reported_by, reason, details, status, admin_notes, resolved_by, resolved_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const profileIds = useMemo<string[]>(
    () => Array.from(new Set<string>(
      (reports as any[])
        .flatMap((report: any) => [report.reported_user_id, report.reported_by, report.resolved_by])
        .filter(Boolean),
    )),
    [reports],
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-report-profiles", profileIds],
    queryFn: async () => {
      if (!profileIds.length) return [];
      const { data, error } = await supabase.rpc("admin_get_profiles", { _user_ids: profileIds });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: profileIds.length > 0,
    staleTime: 60_000,
  });

  const getName = (uid: string | null) => {
    if (!uid) return "—";
    return profiles.find(p => p.user_id === uid)?.full_name || uid.slice(0, 8);
  };

  const getProfile = (uid: string | null) => {
    if (!uid) return null;
    return profiles.find(p => p.user_id === uid);
  };

  // Fetch listing details for expanded report
  const expandedItem = reports.find((r: any) => r.id === expandedReport);
  const { data: reportedListing } = useQuery({
    queryKey: ["admin-reported-listing", expandedItem?.reported_listing_id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("id, title, category, status, price, description, created_at").eq("id", expandedItem!.reported_listing_id).single();
      return data;
    },
    enabled: !!expandedItem?.reported_listing_id,
  });

  // Fetch reported user's activity
  const { data: reportedUserActivity = [] } = useQuery({
    queryKey: ["admin-reported-user-activity", expandedItem?.reported_user_id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_activity").select("action, details, created_at").eq("user_id", expandedItem!.reported_user_id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!expandedItem?.reported_user_id,
  });

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

  // Suspend reported user directly from report
  const suspendFromReport = useMutation({
    mutationFn: async ({ userId: targetId, reportId }: { userId: string; reportId: string }) => {
      await supabase.from("listings").update({ status: "suspended" }).eq("user_id", targetId);
      await supabase.from("profiles").update({ kyc_status: "banned", bio: "[Suspended due to report]" }).eq("user_id", targetId);
      await (supabase as any).from("reports").update({ status: "resolved", admin_notes: "User suspended", resolved_by: userId, resolved_at: new Date().toISOString() }).eq("id", reportId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      logAction("suspend_from_report", "user", vars.userId, "User suspended from report");
      toast({ title: "User suspended", description: "Account banned and listings suspended." });
      setSuspendDialog(null);
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
        ) : filtered.map((r: any) => {
          const isExpanded = expandedReport === r.id;
          const reportedProfile = getProfile(r.reported_user_id);
          return (
            <div key={r.id} className="border-b border-border last:border-b-0">
              <div
                className="px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedReport(isExpanded ? null : r.id)}
              >
                <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                  <Flag className="h-4 w-4 text-destructive mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {r.reported_listing_id ? "Reported Listing" : "Reported User"}
                      {r.reported_user_id && <span className="text-muted-foreground font-normal"> — {getName(r.reported_user_id)}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      By: {getName(r.reported_by)} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm mt-1"><strong>Reason:</strong> {r.reason}</p>
                  </div>
                  <Badge variant={r.status === "resolved" ? "default" : r.status === "dismissed" ? "secondary" : "destructive"} className="text-xs shrink-0">
                    {r.status}
                  </Badge>
                  <div className="flex gap-1 shrink-0 flex-wrap" onClick={e => e.stopPropagation()}>
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
                        {r.reported_user_id && reportedProfile?.kyc_status !== "banned" && (
                          <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={() => setSuspendDialog({ userId: r.reported_user_id, name: getName(r.reported_user_id), reportId: r.id })}>
                            <Ban className="h-3.5 w-3.5" /> Suspend User
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 bg-muted/20 border-t border-border">
                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    {/* Report Details */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                      <h4 className="font-semibold text-sm">🚩 Report Details</h4>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p><strong className="text-foreground">Report ID:</strong> {r.id}</p>
                        <p><strong className="text-foreground">Reason:</strong> {r.reason}</p>
                        <p><strong className="text-foreground">Details:</strong> {r.details || "—"}</p>
                        <p><strong className="text-foreground">Status:</strong> {r.status}</p>
                        <p><strong className="text-foreground">Filed:</strong> {new Date(r.created_at).toLocaleString()}</p>
                        {r.admin_notes && <p><strong className="text-foreground">Admin Notes:</strong> {r.admin_notes}</p>}
                        {r.resolved_at && <p><strong className="text-foreground">Resolved:</strong> {new Date(r.resolved_at).toLocaleString()}</p>}
                        {r.resolved_by && <p><strong className="text-foreground">Resolved By:</strong> {getName(r.resolved_by)}</p>}
                      </div>
                    </div>

                    {/* Involved Parties */}
                    <div className="space-y-4">
                      {r.reported_by && (
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h5 className="text-xs font-semibold mb-2 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Reporter</h5>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><strong className="text-foreground">Name:</strong> {getName(r.reported_by)}</p>
                            <p><strong className="text-foreground">KYC:</strong> {getProfile(r.reported_by)?.kyc_status || "—"}</p>
                            <p><strong className="text-foreground">Phone:</strong> {getProfile(r.reported_by)?.phone || "—"}</p>
                          </div>
                        </div>
                      )}
                      {r.reported_user_id && (
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h5 className="text-xs font-semibold mb-2 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Reported User</h5>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><strong className="text-foreground">Name:</strong> {getName(r.reported_user_id)}</p>
                            {getProfile(r.reported_user_id)?.shop_name && <p><strong className="text-foreground">Shop:</strong> {getProfile(r.reported_user_id)?.shop_name}</p>}
                            <p><strong className="text-foreground">KYC:</strong> {getProfile(r.reported_user_id)?.kyc_status || "—"}</p>
                            <p><strong className="text-foreground">Phone:</strong> {getProfile(r.reported_user_id)?.phone || "—"}</p>
                          </div>
                          {/* Reported user's recent activity */}
                          {reportedUserActivity.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <h6 className="text-[10px] font-semibold mb-1.5">Recent Activity</h6>
                              <div className="space-y-1 max-h-20 overflow-auto">
                                {reportedUserActivity.map((a: any, i: number) => (
                                  <div key={i} className="text-[10px] flex gap-1.5">
                                    <span className="text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                                    <span className="text-primary font-medium">{a.action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {reportedListing && (
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h5 className="text-xs font-semibold mb-2">📦 Reported Listing</h5>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><strong className="text-foreground">Title:</strong> {reportedListing.title}</p>
                            <p><strong className="text-foreground">Category:</strong> {reportedListing.category}</p>
                            <p><strong className="text-foreground">Status:</strong> {reportedListing.status}</p>
                            <p><strong className="text-foreground">Price:</strong> ₹{reportedListing.price ?? 0}</p>
                            <p><strong className="text-foreground">Quantity:</strong> {reportedListing.quantity}</p>
                            <p><strong className="text-foreground">Location:</strong> {reportedListing.location || "—"}</p>
                            {reportedListing.images?.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {reportedListing.images.slice(0, 3).map((img: string, i: number) => (
                                  <img key={i} src={img} alt="" className="h-12 w-12 rounded object-cover border border-border" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resolve/Dismiss Dialog */}
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

      {/* Suspend from Report Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>🚨 Suspend "{suspendDialog?.name}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will ban the user, suspend all their listings, and resolve this report.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => suspendDialog && suspendFromReport.mutate({ userId: suspendDialog.userId, reportId: suspendDialog.reportId })}>
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsTab;
