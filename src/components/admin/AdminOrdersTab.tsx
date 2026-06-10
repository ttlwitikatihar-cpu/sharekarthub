import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface AdminOrdersTabProps {
  orders: any[];
  logAction: (action: string, targetType: string, targetId: string, details: string) => void;
}

const AdminOrdersTab = ({ orders, logAction }: AdminOrdersTabProps) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const expandedItem = orders.find(o => o.id === expandedOrder);

  // Fetch buyer & seller profiles for expanded order
  const { data: orderProfiles } = useQuery({
    queryKey: ["admin-order-profiles", expandedOrder],
    queryFn: async () => {
      if (!expandedItem) return null;
      const { data } = await supabase.rpc("admin_get_profiles", { _user_ids: [expandedItem.buyer_id, expandedItem.seller_id] });
      const rows = (data as any[]) || [];
      return {
        buyer: rows.find((p: any) => p.user_id === expandedItem.buyer_id),
        seller: rows.find((p: any) => p.user_id === expandedItem.seller_id),
      };
    },
    enabled: !!expandedItem,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      logAction(`order_${vars.status}`, "order", vars.id, `Order status changed to ${vars.status}`);
      toast({ title: "Order updated" });
    },
  });

  const filtered = orders.filter(o => filter === "all" || o.status === filter);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["all", "pending", "active", "completed", "cancelled"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">{f}</Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No orders found</p>
        ) : filtered.map(o => {
          const listing = o.listings as any;
          const isExpanded = expandedOrder === o.id;
          return (
            <div key={o.id} className="border-b border-border last:border-b-0">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{listing?.title || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {o.id.slice(0, 8)}… · {listing?.category} · Qty: {o.quantity} · {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={o.status === "completed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"} className="text-xs shrink-0">{o.status}</Badge>
                <div onClick={e => e.stopPropagation()}>
                  {o.status !== "cancelled" && o.status !== "completed" && (
                    <Select onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className="w-[120px] text-xs"><SelectValue placeholder="Change" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Complete</SelectItem>
                        <SelectItem value="cancelled">Cancel</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 bg-muted/20 border-t border-border">
                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    {/* Order Details */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                      <h4 className="font-semibold text-sm">🛒 Order Details</h4>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p><strong className="text-foreground">Order ID:</strong> {o.id}</p>
                        <p><strong className="text-foreground">Listing:</strong> {listing?.title || "—"}</p>
                        <p><strong className="text-foreground">Category:</strong> {listing?.category || "—"}</p>
                        <p><strong className="text-foreground">Price:</strong> ₹{listing?.price ?? 0}</p>
                        <p><strong className="text-foreground">Quantity:</strong> {o.quantity}</p>
                        <p><strong className="text-foreground">Total:</strong> ₹{(listing?.price ?? 0) * o.quantity}</p>
                        <p><strong className="text-foreground">Status:</strong> {o.status}</p>
                        <p><strong className="text-foreground">Created:</strong> {new Date(o.created_at).toLocaleString()}</p>
                        <p><strong className="text-foreground">Updated:</strong> {new Date(o.updated_at).toLocaleString()}</p>
                        <p><strong className="text-foreground">Handover OTP:</strong> {o.handover_otp || "—"}</p>
                        <p><strong className="text-foreground">Handover Confirmed:</strong> {o.handover_confirmed ? "✅ Yes" : "❌ No"}</p>
                        <p><strong className="text-foreground">Return OTP:</strong> {o.return_otp || "—"}</p>
                        <p><strong className="text-foreground">Return Confirmed:</strong> {o.return_confirmed ? "✅ Yes" : "❌ No"}</p>
                      </div>
                    </div>

                    {/* Buyer & Seller */}
                    <div className="space-y-4">
                      {orderProfiles?.buyer && (
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h5 className="text-xs font-semibold mb-2 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Buyer</h5>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><strong className="text-foreground">Name:</strong> {orderProfiles.buyer.full_name}</p>
                            <p><strong className="text-foreground">Phone:</strong> {orderProfiles.buyer.phone || "—"}</p>
                            <p><strong className="text-foreground">KYC:</strong> {orderProfiles.buyer.kyc_status}</p>
                          </div>
                        </div>
                      )}
                      {orderProfiles?.seller && (
                        <div className="rounded-lg border border-border bg-card p-4">
                          <h5 className="text-xs font-semibold mb-2 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Seller</h5>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><strong className="text-foreground">Name:</strong> {orderProfiles.seller.full_name}</p>
                            {orderProfiles.seller.shop_name && <p><strong className="text-foreground">Shop:</strong> {orderProfiles.seller.shop_name}</p>}
                            <p><strong className="text-foreground">Phone:</strong> {orderProfiles.seller.phone || "—"}</p>
                            <p><strong className="text-foreground">KYC:</strong> {orderProfiles.seller.kyc_status}</p>
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
    </div>
  );
};

export default AdminOrdersTab;
