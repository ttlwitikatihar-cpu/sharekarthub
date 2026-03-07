import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck, FileX, UserX, CheckCircle, Search, ChevronDown, ChevronUp, Activity, Package, ShoppingCart, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [confirmAction, setConfirmAction] = useState<{ userId: string; name: string } | null>(null);

  // Fetch activity for expanded user
  const { data: userActivity = [] } = useQuery({
    queryKey: ["admin-user-activity", expandedUser],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_activity")
        .select("*")
        .eq("user_id", expandedUser)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedUser,
  });

  // Fetch listings count for expanded user
  const { data: userListings = [] } = useQuery({
    queryKey: ["admin-user-listings", expandedUser],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("id, title, category, status, created_at").eq("user_id", expandedUser!);
      return data || [];
    },
    enabled: !!expandedUser,
  });

  // Fetch orders for expanded user
  const { data: userOrders = [] } = useQuery({
    queryKey: ["admin-user-orders", expandedUser],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, status, created_at, listings(title)").or(`buyer_id.eq.${expandedUser},seller_id.eq.${expandedUser}`);
      return data || [];
    },
    enabled: !!expandedUser,
  });

  // Fetch reviews for expanded user
  const { data: userReviews = [] } = useQuery({
    queryKey: ["admin-user-reviews", expandedUser],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id, rating, comment, created_at").eq("reviewer_id", expandedUser!);
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
      toast({ title: `KYC ${vars.status === "verified" ? "approved" : "rejected"}` });
    },
  });

  const suspendUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      await supabase.from("listings").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").update({ kyc_status: "banned", bio: "[Account suspended by admin]" }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      logAction("suspend_user", "user", vars.userId, "User account suspended");
      toast({ title: "User account suspended" });
      setConfirmAction(null);
    },
  });

  const filtered = users.filter(u => {
    if (filter !== "all" && u.kyc_status !== filter) return false;
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.user_id?.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {["all", "verified", "pending", "unverified", "banned"].map(f => (
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
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={() => setConfirmAction({ userId: u.user_id, name: u.full_name || "User" })}>
                      <UserX className="h-3.5 w-3.5" /> Suspend
                    </Button>
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
                        <p><strong className="text-foreground">Bio:</strong> {u.bio || "—"}</p>
                        <p><strong className="text-foreground">Joined:</strong> {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* User Stats */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <Package className="h-4 w-4 mx-auto text-primary mb-1" />
                          <p className="text-lg font-bold">{userListings.length}</p>
                          <p className="text-xs text-muted-foreground">Listings</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <ShoppingCart className="h-4 w-4 mx-auto text-primary mb-1" />
                          <p className="text-lg font-bold">{userOrders.length}</p>
                          <p className="text-xs text-muted-foreground">Orders</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <Star className="h-4 w-4 mx-auto text-accent mb-1" />
                          <p className="text-lg font-bold">{userReviews.length}</p>
                          <p className="text-xs text-muted-foreground">Reviews</p>
                        </div>
                      </div>

                      {/* Recent Listings */}
                      {userListings.length > 0 && (
                        <div className="rounded-lg border border-border bg-card p-3">
                          <h5 className="text-xs font-semibold mb-2">Recent Listings</h5>
                          {userListings.slice(0, 5).map((l: any) => (
                            <div key={l.id} className="flex justify-between items-center py-1 text-xs">
                              <span className="truncate flex-1">{l.title}</span>
                              <Badge variant="secondary" className="text-[10px] ml-2">{l.category}</Badge>
                              <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-[10px] ml-1">{l.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="mt-4 rounded-lg border border-border bg-card p-4">
                    <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <Activity className="h-4 w-4 text-primary" /> Recent Activity
                    </h4>
                    {userActivity.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity recorded yet</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {userActivity.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
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

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend "{confirmAction?.name}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will suspend the account and remove all their listings.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmAction && suspendUser.mutate({ userId: confirmAction.userId })}>
              Suspend Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersTab;
