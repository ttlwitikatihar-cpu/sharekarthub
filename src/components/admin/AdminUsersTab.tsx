import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck, FileX, UserX, CheckCircle, Search } from "lucide-react";
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
  const [confirmAction, setConfirmAction] = useState<{ userId: string; name: string } | null>(null);

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
        ) : filtered.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-5 py-4 border-b border-border last:border-b-0 flex-wrap sm:flex-nowrap">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {(u.full_name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{u.full_name || "Unnamed"}</p>
              <p className="text-xs text-muted-foreground truncate">{u.phone || "No phone"} · {u.location || "No location"}</p>
              <p className="text-xs text-muted-foreground">ID: {u.id_type || "—"} · {u.id_number || "—"}</p>
            </div>
            <Badge variant={u.kyc_status === "verified" ? "default" : u.kyc_status === "banned" ? "destructive" : "secondary"} className="text-xs shrink-0">
              {u.kyc_status}
            </Badge>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Donations: {u.donations_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Points: {u.reward_points ?? 0}</p>
            </div>
            <div className="flex gap-1 shrink-0 flex-wrap">
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
          </div>
        ))}
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
