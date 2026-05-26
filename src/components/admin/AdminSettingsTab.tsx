import { useEffect, useState } from "react";
import { Info, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const AdminSettingsTab = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rentRate, setRentRate] = useState(10);
  const [sellRate, setSellRate] = useState(5);
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("id, commission_enabled, rent_commission_rate, sell_commission_rate")
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setEnabled(data.commission_enabled);
        setRentRate(Math.round(Number(data.rent_commission_rate) * 100));
        setSellRate(Math.round(Number(data.sell_commission_rate) * 100));
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      commission_enabled: enabled,
      rent_commission_rate: Math.max(0, Math.min(100, rentRate)) / 100,
      sell_commission_rate: Math.max(0, Math.min(100, sellRate)) / 100,
      updated_at: new Date().toISOString(),
    };
    const { error } = rowId
      ? await supabase.from("platform_settings").update(payload).eq("id", rowId)
      : await supabase.from("platform_settings").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings updated" });
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Commission</h2>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Charge platform commission</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When off, sellers receive the full price and no commission is shown to buyers.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Rent commission (%)</Label>
                <Input
                  type="number" min={0} max={100} step={0.5}
                  value={rentRate} disabled={!enabled}
                  onChange={(e) => setRentRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sale commission (%)</Label>
                <Input
                  type="number" min={0} max={100} step={0.5}
                  value={sellRate} disabled={!enabled}
                  onChange={(e) => setSellRate(Number(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Security posture</h2>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>✅ Row-Level Security enabled on every table</li>
          <li>✅ Role-based access (admin / moderator / user) via security-definer checks</li>
          <li>✅ Admin moderation actions logged to admin_logs</li>
          <li>✅ Storage uploads scoped to the owner's folder; public listing bucket no longer enumerable</li>
          <li>✅ Internal SECURITY DEFINER functions revoked from anon &amp; authenticated</li>
          <li>✅ Orders auto-cancel after 48h and restore stock atomically</li>
          <li>✅ Input validated client-side &amp; constrained at DB level</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
