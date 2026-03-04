import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminLogsTab = () => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-log-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || uid.slice(0, 8);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {isLoading ? (
        <p className="text-center py-10 text-muted-foreground">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">No activity logs yet</p>
      ) : logs.map((log: any) => (
        <div key={log.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0">
          <ScrollText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{getName(log.admin_id)}</span>
              {" → "}
              <span className="text-primary font-medium">{log.action}</span>
              {log.target_type && <span className="text-muted-foreground"> on {log.target_type}</span>}
            </p>
            {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default AdminLogsTab;
