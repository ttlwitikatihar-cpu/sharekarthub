import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
          return (
            <div key={o.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{listing?.title || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  ID: {o.id.slice(0, 8)}… · {listing?.category} · Qty: {o.quantity} · {new Date(o.created_at).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Handover: {o.handover_confirmed ? "✅" : "❌"} · Return: {o.return_confirmed ? "✅" : "❌"}
                </p>
              </div>
              <Badge variant={o.status === "completed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"} className="text-xs shrink-0">{o.status}</Badge>
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
          );
        })}
      </div>
    </div>
  );
};

export default AdminOrdersTab;
