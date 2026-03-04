import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Ban, CheckCircle, Trash2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

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
        ) : filtered.map(l => (
          <div key={l.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{l.title}</p>
              <p className="text-xs text-muted-foreground">
                {l.category} · Qty: {l.quantity} · ₹{l.price ?? 0} · {new Date(l.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">{l.status}</Badge>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => navigate(`/item/${l.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
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
          </div>
        ))}
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
    </div>
  );
};

export default AdminListingsTab;
