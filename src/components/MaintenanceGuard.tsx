import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Wrench, ShieldCheck } from "lucide-react";
import { useMaintenance } from "@/hooks/use-maintenance";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ALLOWED_PATHS = ["/admin", "/auth", "/reset-password"];

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { maintenance_mode, maintenance_message } = useMaintenance();
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const pathAllowed = ALLOWED_PATHS.some((p) => location.pathname.startsWith(p));

  if (!maintenance_mode || loading) return <>{children}</>;
  if (isAdmin || pathAllowed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-primary/5 p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
          <Wrench className="h-10 w-10 text-amber-600 animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">Under Maintenance</h1>
          <p className="text-muted-foreground">{maintenance_message}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>ShareKart · Your data is safe</span>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    </div>
  );
};

export default MaintenanceGuard;
