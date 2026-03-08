import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck, FileX, UserX, CheckCircle, Search, ChevronDown, ChevronUp, Activity, Package, ShoppingCart, Star, Ban, AlertTriangle, LogIn, LogOut, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface AdminUsersTabProps {
  users: any[];
  currentUserId?: string;
  logAction: (action: string, targetType: string, targetId: string, details: string) => void;
}

const AdminUsersTab = ({ users, currentUserId, logAction }: AdminUsersTabProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; name: string; action: "suspend" | "fraud" } | null>(null);
  const [fraudReason, setFraudReason] = useState("");

  // Fetch activity for expanded user (includes login/logout)
  const { data: userActivity = [] } = useQuery({
    queryKey: ["admin-user-activity", expandedUser],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_activity")
        .select("*")
        .eq("user_id", expandedUser)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedUser,
  });

  // Fetch listings for expanded user
  const { data: userListings = [] } = useQuery({
    queryKey: ["admin-user-listings", expandedUser],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("id, title, category, status, price, quantity, created_at, listing_type").eq("user_id", expandedUser!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!expandedUser,
  });

  // Fetch orders for expanded user
  const { data: userOrders = [] } = useQuery({
    queryKey: ["admin-user-orders", expandedUser],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, status, quantity, created_at, listings(title, category, price)").or(`buyer_id.eq.${expandedUser},seller_id.eq.${expandedUser}`).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!expandedUser,
  });

  // Fetch reviews for expanded user
  const { data: userReviews = [] } = useQuery({
    queryKey: ["admin-user-reviews", expandedUser],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id, rating, comment, created_at").eq("reviewer_id", expandedUser!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!expandedUser,
  });

  // Fetch reports against this user
  const { data: userReports = [] } = useQuery({
    queryKey: ["admin-user-reports", expandedUser],
    queryFn: async () => {
      const { data } = await (supabase as any).from("reports").select("id, reason, status, created_at").eq("reported_user_id", expandedUser!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!expandedUser,
  });

  const updateKyc = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      logAction(`KYC ${vars.status}`, "user", vars.userId, `KYC status changed to ${vars.status}`);
      toast({ title: `KYC ${vars.status === "verified" ? "approved" : vars.status === "rejected" ? "rejected" : vars.status}` });
    },
  });

  const suspendUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      // Suspend all active listings
      await supabase.from("listings").update({ status: "suspended" }).eq("user_id", userId);
      const { error } = await supabase.from("profiles").update({ 
        kyc_status: "banned", 
        bio: reason ? `[Suspended: ${reason}]` : "[Account suspended by admin]" 
      }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      logAction("suspend_user", "user", vars.userId, vars.reason || "User account suspended");
      toast({ title: "User account suspended", description: "All their listings have been suspended." });
      setConfirmAction(null);
      setFraudReason("");
    },
  });

  const flagFraud = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      // Suspend all listings
      await supabase.from("listings").update({ status: "suspended" }).eq("user_id", userId);
      // Ban user
      const { error } = await supabase.from("profiles").update({ 
        kyc_status: "banned", 
        bio: `[FRAUD - ${reason}]` 
      }).eq("user_id", userId);
      if (error) throw error;
      // Cancel all pending/active orders
      await supabase.from("orders").update({ status: "cancelled" }).eq("seller_id", userId).in("status", ["pending", "active"]);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      logAction("flag_fraud", "user", vars.userId, `Flagged as fraud: ${vars.reason}`);
      toast({ title: "User flagged as fraud", description: "Account banned, listings suspended, orders cancelled.", variant: "destructive" });
      setConfirmAction(null);
      setFraudReason("");
    },
  });

  // Separate login activity
  const loginActivity = userActivity.filter((a: any) => a.action === "login" || a.action === "logout");
  const otherActivity = userActivity.filter((a: any) => a.action !== "login" && a.action !== "logout");

  const filtered = users.filter(u => {
    if (filter !== "all" && u.kyc_status !== filter) return false;
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.shop_name?.toLowerCase().includes(search.toLowerCase()) && !u.user_id?.includes(search)) return false;
    return true;
  });

  const getActivityIcon = (action: string) => {
    if (action === "login") return <LogIn className="h-3 w-3 text-green-500" />;
    if (action === "logout") return <LogOut className="h-3 w-3 text-orange-500" />;
    return <Activity className="h-3 w-3 text-primary" />;
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users or shops..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {["all", "verified", "pending", "unverified", "rejected", "banned"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">
            {f}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No users found</p>
        ) : filtered.map(u => {
          const isExpanded = expandedUser === u.user_id;
          return (
            <div key={u.id} className="border-b border-border last:border-b-0">
              <div
                className="flex items-center gap-3 px-5 py-4 flex-wrap sm:flex-nowrap cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedUser(isExpanded ? null : u.user_id)}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {(u.full_name || "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.phone || "No phone"} · {u.location || "No location"}</p>
                  {u.shop_name && <p className="text-xs text-primary">🏪 {u.shop_name}</p>}
                </div>
                <Badge variant={u.kyc_status === "verified" ? "default" : u.kyc_status === "banned" ? "destructive" : "secondary"} className="text-xs shrink-0">
                  {u.kyc_status}
                </Badge>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Donations: {u.donations_count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Points: {u.reward_points ?? 0}</p>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap" onClick={e => e.stopPropagation()}>
                  {u.kyc_status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateKyc.mutate({ userId: u.user_id, status: "verified" })}>
                        <FileCheck className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateKyc.mutate({ userId: u.user_id, status: "rejected" })}>
                        <FileX className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {u.kyc_status === "rejected" && (
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateKyc.mutate({ userId: u.user_id, status: "verified" })}>
                      <FileCheck className="h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                  {u.kyc_status !== "banned" && u.user_id !== currentUserId && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={() => setConfirmAction({ userId: u.user_id, name: u.full_name || "User", action: "suspend" })}>
                        <UserX className="h-3.5 w-3.5" /> Suspend
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={() => setConfirmAction({ userId: u.user_id, name: u.full_name || "User", action: "fraud" })}>
                        <AlertTriangle className="h-3.5 w-3.5" /> Fraud
                      </Button>
                    </>
                  )}
                  {u.kyc_status === "banned" && (
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateKyc.mutate({ userId: u.user_id, status: "unverified" })}>
                      <CheckCircle className="h-3.5 w-3.5" /> Unban
                    </Button>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="px-5 pb-5 bg-muted/20 border-t border-border">
                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    {/* User Details */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-1.5">📋 Profile Details</h4>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p><strong className="text-foreground">Full Name:</strong> {u.full_name || "—"}</p>
                        <p><strong className="text-foreground">Phone:</strong> {u.phone || "—"}</p>
                        <p><strong className="text-foreground">Location:</strong> {u.location || "—"}</p>
                        <p><strong className="text-foreground">Address:</strong> {u.address || "—"}, {u.city || ""} {u.state || ""} {u.pincode || ""}</p>
                        <p><strong className="text-foreground">Shop:</strong> {u.shop_name || "—"}</p>
                        <p><strong className="text-foreground">ID Type:</strong> {u.id_type || "—"} · <strong className="text-foreground">ID #:</strong> {u.id_number || "—"}</p>
                        <p><strong className="text-foreground">Rating:</strong> {u.rating ?? 0} ({u.total_reviews ?? 0} reviews)</p>
                        <p><strong className="text-foreground">Donations:</strong> {u.donations_count ?? 0} · <strong className="text-foreground">Points:</strong> {u.reward_points ?? 0}</p>
                        <p><strong className="text-foreground">Bio:</strong> {u.bio || "—"}</p>
                        <p><strong className="text-foreground">Joined:</strong> {new Date(u.created_at).toLocaleDateString()}</p>
                        {u.kyc_document_url && (
                          <p><strong className="text-foreground">KYC Doc:</strong> <a href={u.kyc_document_url} target="_blank" rel="noreferrer" className="text-primary underline">View Document</a></p>
                        )}
                      </div>
                    </div>

                    {/* User Stats */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <Package className="h-4 w-4 mx-auto text-primary mb-1" />
                          <p className="text-lg font-bold">{userListings.length}</p>
                          <p className="text-[10px] text-muted-foreground">Listings</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <ShoppingCart className="h-4 w-4 mx-auto text-primary mb-1" />
                          <p className="text-lg font-bold">{userOrders.length}</p>
                          <p className="text-[10px] text-muted-foreground">Orders</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <Star className="h-4 w-4 mx-auto text-accent mb-1" />
                          <p className="text-lg font-bold">{userReviews.length}</p>
                          <p className="text-[10px] text-muted-foreground">Reviews</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <AlertTriangle className="h-4 w-4 mx-auto text-destructive mb-1" />
                          <p className="text-lg font-bold">{userReports.length}</p>
                          <p className="text-[10px] text-muted-foreground">Reports</p>
                        </div>
                      </div>

                      {/* Reports against user */}
                      {userReports.length > 0 && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                          <h5 className="text-xs font-semibold mb-2 text-destructive">⚠️ Reports Against User</h5>
                          <div className="space-y-1 max-h-24 overflow-auto">
                            {userReports.map((r: any) => (
                              <div key={r.id} className="flex items-center justify-between text-xs">
                                <span className="truncate">{r.reason}</span>
                                <Badge variant={r.status === "resolved" ? "default" : "destructive"} className="text-[10px] ml-2">{r.status}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Listings */}
                      {userListings.length > 0 && (
                        <div className="rounded-lg border border-border bg-card p-3">
                          <h5 className="text-xs font-semibold mb-2">📦 Listings</h5>
                          <div className="space-y-1 max-h-32 overflow-auto">
                            {userListings.slice(0, 8).map((l: any) => (
                              <div key={l.id} className="flex justify-between items-center py-1 text-xs">
                                <span className="truncate flex-1">{l.title}</span>
                                <span className="text-muted-foreground mx-1">₹{l.price ?? 0}</span>
                                <Badge variant="secondary" className="text-[10px] ml-1">{l.category}</Badge>
                                <Badge variant={l.status === "active" ? "default" : l.status === "suspended" ? "destructive" : "secondary"} className="text-[10px] ml-1">{l.status}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Orders */}
                      {userOrders.length > 0 && (
                        <div className="rounded-lg border border-border bg-card p-3">
                          <h5 className="text-xs font-semibold mb-2">🛒 Recent Orders</h5>
                          <div className="space-y-1 max-h-24 overflow-auto">
                            {userOrders.slice(0, 5).map((o: any) => (
                              <div key={o.id} className="flex items-center justify-between text-xs">
                                <span className="truncate flex-1">{(o.listings as any)?.title || "—"}</span>
                                <Badge variant={o.status === "completed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px] ml-1">{o.status}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Login Activity */}
                  <div className="mt-4 rounded-lg border border-border bg-card p-4">
                    <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <LogIn className="h-4 w-4 text-green-500" /> Login Activity
                    </h4>
                    {loginActivity.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No login activity recorded yet</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-auto">
                        {loginActivity.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            {getActivityIcon(a.action)}
                            <span className={`font-medium ${a.action === "login" ? "text-green-600" : "text-orange-600"}`}>
                              {a.action === "login" ? "Signed In" : "Signed Out"}
                            </span>
                            <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                            {a.metadata?.provider && <Badge variant="secondary" className="text-[10px]">{a.metadata.provider}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Activity Log */}
                  <div className="mt-4 rounded-lg border border-border bg-card p-4">
                    <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <Activity className="h-4 w-4 text-primary" /> User Activity
                    </h4>
                    {otherActivity.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity recorded yet</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {otherActivity.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                            <span className="font-medium text-primary">{a.action}</span>
                            {a.details && <span className="text-muted-foreground truncate">{a.details}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Suspend / Fraud Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => { setConfirmAction(null); setFraudReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "fraud" 
                ? `🚨 Flag "${confirmAction?.name}" as Fraud?` 
                : `Suspend "${confirmAction?.name}"?`}
            </DialogTitle>
          </DialogHeader>
          {confirmAction?.action === "fraud" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">This will ban the account, suspend all listings, and cancel all active orders.</p>
              <Textarea 
                placeholder="Reason for fraud flag (required)..." 
                value={fraudReason} 
                onChange={e => setFraudReason(e.target.value)} 
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This will suspend the account and all their listings.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmAction(null); setFraudReason(""); }}>Cancel</Button>
            <Button 
              variant="destructive" 
              disabled={confirmAction?.action === "fraud" && !fraudReason.trim()}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.action === "fraud") {
                  flagFraud.mutate({ userId: confirmAction.userId, reason: fraudReason });
                } else {
                  suspendUser.mutate({ userId: confirmAction.userId });
                }
              }}
            >
              {confirmAction?.action === "fraud" ? "Flag as Fraud" : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersTab;
