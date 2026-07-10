import { useEffect, useState } from "react";
import { Power, AlertTriangle, ShieldAlert, Wrench, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  logAction?: (action: string, targetType: string, targetId: string, details: string) => void;
}

const AdminMaintenanceTab = ({ logAction }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [rowId, setRowId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [pendingState, setPendingState] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("platform_settings")
        .select("id, maintenance_mode, maintenance_message")
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setEnabled(!!data.maintenance_mode);
        setMessage(data.maintenance_message || "");
      }
      setLoading(false);
    })();
  }, []);

  const openConfirm = (newState: boolean) => {
    setPendingState(newState);
    setConfirmText("");
    setPassword("");
    setConfirmOpen(true);
  };

  const executeToggle = async () => {
    if (!user?.email) return;
    setSaving(true);

    // Re-verify admin password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (authErr) {
      setSaving(false);
      toast({ title: "Verification failed", description: "Incorrect password", variant: "destructive" });
      return;
    }

    const payload: any = {
      maintenance_mode: pendingState,
      maintenance_message: message || "We're performing scheduled maintenance. Please check back shortly.",
      updated_at: new Date().toISOString(),
    };
    const { error } = rowId
      ? await (supabase as any).from("platform_settings").update(payload).eq("id", rowId)
      : await (supabase as any).from("platform_settings").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setEnabled(pendingState);
    setConfirmOpen(false);
    logAction?.(
      pendingState ? "site_shutdown" : "site_reactivated",
      "platform",
      "maintenance_mode",
      pendingState ? `Site shut down. Message: ${message}` : "Site reactivated"
    );
    qc.invalidateQueries({ queryKey: ["maintenance-mode"] });
    toast({
      title: pendingState ? "🚨 Site is now OFFLINE" : "✅ Site is LIVE",
      description: pendingState ? "Only admins can access the site." : "All users can access the site again.",
    });
  };

  const saveMessage = async () => {
    if (!rowId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("platform_settings")
      .update({ maintenance_message: message, updated_at: new Date().toISOString() })
      .eq("id", rowId);
    setSaving(false);
    if (error) toast({ title: "Save failed", variant: "destructive" });
    else {
      toast({ title: "Message updated" });
      qc.invalidateQueries({ queryKey: ["maintenance-mode"] });
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-2xl border-2 p-6 ${enabled ? "border-destructive bg-destructive/5" : "border-green-500/40 bg-green-500/5"}`}>
        <div className="flex items-start gap-4">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center ${enabled ? "bg-destructive/20" : "bg-green-500/20"}`}>
            {enabled ? <Wrench className="h-7 w-7 text-destructive animate-pulse" /> : <CheckCircle2 className="h-7 w-7 text-green-600" />}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{enabled ? "🚨 Site is OFFLINE" : "✅ Site is LIVE"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {enabled
                ? "Only admin users can currently access the site. Regular users see the maintenance screen."
                : "All users can browse, list, and transact normally."}
            </p>
          </div>
          <Button
            size="lg"
            variant={enabled ? "default" : "destructive"}
            className="gap-2"
            onClick={() => openConfirm(!enabled)}
          >
            <Power className="h-4 w-4" />
            {enabled ? "Reactivate Site" : "Shutdown Site"}
          </Button>
        </div>
      </div>

      {/* Maintenance message editor */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Maintenance Message</h3>
        </div>
        <Label className="text-xs text-muted-foreground">Shown to visitors when site is offline</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-2"
          placeholder="We're performing scheduled maintenance. Please check back shortly."
        />
        <Button onClick={saveMessage} disabled={saving} size="sm" className="mt-3">
          Save Message
        </Button>
      </div>

      {/* Info block */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" /> When to use Emergency Shutdown
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
          <li><strong className="text-foreground">Security incident:</strong> Suspected breach or fraud attack in progress</li>
          <li><strong className="text-foreground">Data integrity issue:</strong> Corrupt data being written; prevent further damage</li>
          <li><strong className="text-foreground">Scheduled maintenance:</strong> Database migrations or major deployments</li>
          <li><strong className="text-foreground">Legal / compliance hold:</strong> Freeze marketplace pending review</li>
        </ul>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          <strong>Note:</strong> Admin users retain full access. Users on the auth page can still sign in.
          Requires password re-verification to prevent accidental shutdown.
        </p>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingState ? <><ShieldAlert className="h-5 w-5 text-destructive" /> Confirm Site Shutdown</> : <><Power className="h-5 w-5 text-green-600" /> Confirm Reactivation</>}
            </DialogTitle>
            <DialogDescription>
              {pendingState
                ? "This will make the site inaccessible to all non-admin users immediately."
                : "This will restore full access for all users."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Type <code className="px-1 bg-muted rounded">{pendingState ? "SHUTDOWN" : "REACTIVATE"}</code> to confirm
              </Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={pendingState ? "SHUTDOWN" : "REACTIVATE"} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Re-enter your admin password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              variant={pendingState ? "destructive" : "default"}
              disabled={saving || confirmText !== (pendingState ? "SHUTDOWN" : "REACTIVATE") || !password}
              onClick={executeToggle}
            >
              {saving ? "Verifying..." : pendingState ? "Shutdown Now" : "Reactivate Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMaintenanceTab;
