import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, type PlatformSettings } from "@/lib/pricing";

export const usePlatformSettings = () => {
  const { data } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async (): Promise<PlatformSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("commission_enabled, rent_commission_rate, sell_commission_rate")
        .maybeSingle();
      if (error || !data) return DEFAULT_SETTINGS;
      return data as PlatformSettings;
    },
    staleTime: 60_000,
  });
  return data ?? DEFAULT_SETTINGS;
};
