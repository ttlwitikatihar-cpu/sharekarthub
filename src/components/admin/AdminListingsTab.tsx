import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Ban, CheckCircle, Trash2, Search, ChevronDown, ChevronUp, Star, ShoppingCart, Pencil, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface AdminListingsTabProps {
  listings: any[];
  logAction: (action: string, targetType: string, targetId: string, details: string) => void;
}

const AdminListingsTab = ({ listings, logAction }: AdminListingsTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [warnTarget, setWarnTarget] = useState<{ id: string; title: string; user_id: string } | null>(null);
  const [warnReason, setWarnReason] = useState("");

  // Fetch seller profile for expanded listing
  const expandedItem = listings.find(l => l.id === expandedListing);
  const { data: sellerProfile } = useQuery({
    queryKey: ["admin-listing-seller", expandedItem?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, shop_name, rating, total_reviews, phone, kyc_status").eq("user_id", expandedItem!.user_id).single();
      return data;
    },
    enabled: !!expandedItem,
  });

  // Fetch orders for expanded listing
  const { data: listingOrders = [] } = useQuery({
    queryKey: ["admin-listing-orders", expandedListing],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, status, quantity, created_at").eq("listing_id", expandedListing!);
      return data || [];
    },
    enabled: !!expandedListing,
  });

  // Fetch reviews for expanded listing
  const { data: listingReviews = [] } = useQuery({
    queryKey: ["admin-listing-reviews", expandedListing],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id, rating, comment, created_at, reviewer_id").eq("listing_id", expandedListing!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!expandedListing,
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      logAction("delete_listing", "listing", id, "Listing deleted");
      toast({ title: "Listing deleted" });
      setConfirmDelete(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("listings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      logAction(`listing_${vars.status}`, "listing", vars.id, `Status changed to ${vars.status}`);
      toast({ title: "Listing updated" });
    },
  });

  const sendWarning = useMutation({
    mutationFn: async ({ listing, reason }: { listing: { id: string; title: string; user_id: string }; reason: string }) => {
      const { error } = await (supabase as any).from("notifications").insert({
        user_id: listing.user_id,
        title: "⚠️ Warning from ShareKart",
        message: `Your listing "${listing.title}" has been flagged: ${reason}. Please review our guidelines or your listing may be removed.`,
        type: "warning",
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      logAction("warn_seller", "listing", vars.listing.id, `Warned seller: ${vars.reason}`);
      toast({ title: "Warning sent to seller" });
      setWarnTarget(null);
      setWarnReason("");
    },
    onError: (e: any) => toast({ title: "Failed to send warning", description: e.message, variant: "destructive" }),
  });

  const filtered = listings.filter(l => {
    if (filter !== "all" && l.status !== filter && l.category !== filter) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {["all", "active", "suspended", "out_of_stock", "rent", "sell", "donate"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">
            {f === "all" ? "All" : f.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No listings found</p>
        ) : filtered.map(l => {
          const isExpanded = expandedListing === l.id;
          return (
            <div key={l.id} className="border-b border-border last:border-b-0">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedListing(isExpanded ? null : l.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.category} · Qty: {l.quantity} · ₹{l.price ?? 0} · {new Date(l.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">{l.status}</Badge>
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" onClick={() => navigate(`/item/${l.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => navigate(`/edit-listing/${l.id}`)} title="Edit listing">
                    <Pencil className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setWarnTarget({ id: l.id, title: l.title, user_id: l.user_id })} title="Warn seller">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </Button>
                  {l.status === "active" ? (
                    <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: l.id, status: "suspended" })} title="Suspend">
                      <Ban className="h-4 w-4 text-orange-500" />
                    </Button>
                  ) : l.status === "suspended" ? (
                    <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: l.id, status: "active" })} title="Reactivate">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                  ) : null}
                  <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ id: l.id, title: l.title })} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 bg-muted/20 border-t border-border">
                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    {/* Listing Details */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                      <h4 className="font-semibold text-sm">📦 Listing Details</h4>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p><strong className="text-foreground">Title:</strong> {l.title}</p>
                        <p><strong className="text-foreground">Description:</strong> {l.description || "—"}</p>
                        <p><strong className="text-foreground">Category:</strong> {l.category}</p>
                        <p><strong className="text-foreground">Type:</strong> {l.listing_type}</p>
                        <p><strong className="text-foreground">Condition:</strong> {l.condition || "—"}</p>
                        <p><strong className="text-foreground">Price:</strong> ₹{l.price ?? 0}</p>
                        <p><strong className="text-foreground">Security Deposit:</strong> ₹{l.security_deposit ?? 0}</p>
                        <p><strong className="text-foreground">Quantity:</strong> {l.quantity}</p>
                        <p><strong className="text-foreground">Location:</strong> {l.location || "—"}</p>
                        <p><strong className="text-foreground">Created:</strong> {new Date(l.created_at).toLocaleString()}</p>
                        {l.images?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {l.images.slice(0, 4).map((img: string, i: number) => (
                              <img key={i} src={img} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seller Info & Stats */}
                    <div className="space-y-4">
                      {sellerProfile && (
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h5 className="text-xs font-semibold mb-2">👤 Seller</h5>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><strong className="text-foreground">Name:</strong> {sellerProfile.full_name}</p>
                            {sellerProfile.shop_name && <p><strong className="text-foreground">Shop:</strong> {sellerProfile.shop_name}</p>}
                            <p><strong className="text-foreground">KYC:</strong> {sellerProfile.kyc_status}</p>
                            <p><strong className="text-foreground">Rating:</strong> {sellerProfile.rating ?? 0} ({sellerProfile.total_reviews ?? 0} reviews)</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <ShoppingCart className="h-4 w-4 mx-auto text-primary mb-1" />
                          <p className="text-lg font-bold">{listingOrders.length}</p>
                          <p className="text-xs text-muted-foreground">Orders</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <Star className="h-4 w-4 mx-auto text-accent mb-1" />
                          <p className="text-lg font-bold">{listingReviews.length}</p>
                          <p className="text-xs text-muted-foreground">Reviews</p>
                        </div>
                      </div>

                      {listingReviews.length > 0 && (
                        <div className="rounded-lg border border-border bg-card p-3">
                          <h5 className="text-xs font-semibold mb-2">Recent Reviews</h5>
                          <div className="space-y-2 max-h-32 overflow-auto">
                            {listingReviews.slice(0, 5).map((r: any) => (
                              <div key={r.id} className="text-xs">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`h-2.5 w-2.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                                  ))}
                                  <span className="text-muted-foreground ml-1">{new Date(r.created_at).toLocaleDateString()}</span>
                                </div>
                                {r.comment && <p className="text-muted-foreground mt-0.5">{r.comment}</p>}
                              </div>
                            ))}
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

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete "{confirmDelete?.title}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteListing.mutate(confirmDelete.id)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!warnTarget} onOpenChange={() => { setWarnTarget(null); setWarnReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warn seller about "{warnTarget?.title}"</DialogTitle>
            <DialogDescription>Send a private notification explaining the issue. The seller will see it in their notifications.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for warning (e.g. misleading description, wrong images, prohibited item)..."
            value={warnReason}
            onChange={(e) => setWarnReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWarnTarget(null); setWarnReason(""); }}>Cancel</Button>
            <Button
              onClick={() => warnTarget && sendWarning.mutate({ listing: warnTarget, reason: warnReason.trim() })}
              disabled={!warnReason.trim() || sendWarning.isPending}
            >
              {sendWarning.isPending ? "Sending..." : "Send Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminListingsTab;
