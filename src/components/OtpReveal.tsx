import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function OtpReveal({ orderId, which }: { orderId: string; which: "handover" | "return" }) {
  const [otp, setOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_order_otp", { _order_id: orderId, _which: which });
      if (!cancelled) {
        setOtp((data as string) || null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, which]);

  if (loading) return <span className="font-mono text-muted-foreground">••••••</span>;
  if (!otp) return <span className="font-mono text-muted-foreground">unavailable</span>;
  return <span className="font-mono font-bold text-foreground">{otp}</span>;
}
