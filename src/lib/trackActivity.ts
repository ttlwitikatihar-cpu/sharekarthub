import { supabase } from "@/integrations/supabase/client";

export const trackActivity = async (
  action: string,
  details?: string,
  metadata?: Record<string, any>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  await (supabase as any).from("user_activity").insert({
    user_id: user.id,
    action,
    details,
    metadata: metadata || {},
  });
};
