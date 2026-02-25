import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, ShieldCheck, Package, Trash2, Clock, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OTP_EXPIRY_HOURS = 48; // 2 days

const isOtpExpired = (createdAt: string) => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created > OTP_EXPIRY_HOURS * 60 * 60 * 1000;
};

const getTimeRemaining = (createdAt: string) => {
  const expiresAt = new Date(createdAt).getTime() + OTP_EXPIRY_HOURS * 60 * 60 * 1000;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m remaining`;
};

const Orders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (o: any) => {
          const { data: listing } = await supabase
            .from("listings")
            .select("title, category")
            .eq("id", o.listing_id)
            .single();
          return { ...o, listing };
        })
      );
      return enriched;
    },
    enabled: !!user,
  });

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order cancelled", description: "The pending request has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  };

  const verifyHandoverOTP = async (orderId: string) => {
    const order = orders.find((o: any) => o.id === orderId);
    if (isOtpExpired(order?.created_at)) {
      toast({ title: "OTP Expired", description: "This order has expired. Please cancel and create a new one.", variant: "destructive" });
      return;
    }
    const input = otpInputs[`handover-${orderId}`];
    if (input === order?.handover_otp) {
      await supabase.from("orders").update({ handover_confirmed: true, status: "active" }).eq("id", orderId);
      toast({ title: "Handover confirmed!", description: "Item has been handed over successfully." });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } else {
      toast({ title: "Invalid OTP", variant: "destructive" });
    }
  };

  const verifyReturnOTP = async (orderId: string) => {
    const order = orders.find((o: any) => o.id === orderId);
    const input = otpInputs[`return-${orderId}`];
    if (input === order?.return_otp) {
      await supabase.from("orders").update({ return_confirmed: true, status: "completed" }).eq("id", orderId);
      toast({ title: "Return confirmed!", description: "Item has been returned successfully." });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } else {
      toast({ title: "Invalid OTP", variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Sign in to view orders.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    active: "bg-primary/10 text-primary",
    completed: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-6 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const isBuyer = order.buyer_id === user.id;
              const isSeller = order.seller_id === user.id;
              const isRental = order.listing?.category === "rent";
              const expired = order.status === "pending" && isOtpExpired(order.created_at);

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{order.listing?.title || "Item"}</h3>
                    <div className="flex items-center gap-2">
                      {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[order.status] || ""}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* OTP Expiry Timer */}
                  {order.status === "pending" && !expired && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>OTP valid for: {getTimeRemaining(order.created_at)}</span>
                    </div>
                  )}

                  {/* Expired notice */}
                  {expired && order.status === "pending" && (
                    <div className="bg-destructive/5 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      OTP has expired. Please cancel this order and create a new one.
                    </div>
                  )}

                  {/* Handover OTP */}
                  {order.status === "pending" && !expired && (
                    <div className="bg-muted rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Handover Verification
                      </div>
                      {isSeller && order.handover_otp && (
                        <p className="text-sm text-muted-foreground">
                          Share this OTP with the buyer: <span className="font-mono font-bold text-foreground">{order.handover_otp}</span>
                        </p>
                      )}
                      {isBuyer && !order.handover_confirmed && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter handover OTP"
                            value={otpInputs[`handover-${order.id}`] || ""}
                            onChange={(e) => setOtpInputs({ ...otpInputs, [`handover-${order.id}`]: e.target.value })}
                            className="max-w-[180px]"
                          />
                          <Button size="sm" onClick={() => verifyHandoverOTP(order.id)}>Verify</Button>
                        </div>
                      )}
                      {order.handover_confirmed && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <CheckCircle className="h-4 w-4" /> Handover confirmed
                        </div>
                      )}
                    </div>
                  )}

                  {/* Return OTP (rental only) */}
                  {isRental && order.status === "active" && (
                    <div className="bg-muted rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-accent" />
                        Return Verification
                      </div>
                      {isBuyer && order.return_otp && (
                        <p className="text-sm text-muted-foreground">
                          Share this OTP with the seller: <span className="font-mono font-bold text-foreground">{order.return_otp}</span>
                        </p>
                      )}
                      {isSeller && !order.return_confirmed && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter return OTP"
                            value={otpInputs[`return-${order.id}`] || ""}
                            onChange={(e) => setOtpInputs({ ...otpInputs, [`return-${order.id}`]: e.target.value })}
                            className="max-w-[180px]"
                          />
                          <Button size="sm" onClick={() => verifyReturnOTP(order.id)}>Verify</Button>
                        </div>
                      )}
                      {order.return_confirmed && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <CheckCircle className="h-4 w-4" /> Return confirmed
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === "completed" && (
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" /> Order completed
                    </div>
                  )}

                  {order.status === "cancelled" && (
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Order cancelled
                    </div>
                  )}

                  {/* Cancel button for pending orders */}
                  {order.status === "pending" && (isBuyer || isSeller) && (
                    <div className="pt-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => cancelOrder(order.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Cancel Order
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
