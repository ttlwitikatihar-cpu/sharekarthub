import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceState {
  maintenance_mode: boolean;
  maintenance_message: string;
}

export const useMaintenance = () => {
  const { data } = useQuery({
    queryKey: ["maintenance-mode"],
    queryFn: async (): Promise<MaintenanceState> => {
      const { data } = await (supabase as any)
        .from("platform_settings")
        .select("maintenance_mode, maintenance_message")
        .maybeSingle();
      return {
        maintenance_mode: !!data?.maintenance_mode,
        maintenance_message:
          data?.maintenance_message ||
          "We're performing scheduled maintenance. Please check back shortly.",
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  return data ?? { maintenance_mode: false, maintenance_message: "" };
};
