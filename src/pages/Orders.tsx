import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, ShieldCheck, Package, Trash2, Clock, AlertTriangle, Copy, RefreshCw, Filter } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import ReviewDialog from "@/components/ReviewDialog";

const OTP_EXPIRY_HOURS = 48;

const isOtpExpired = (createdAt: string) => {
  return Date.now() - new Date(createdAt).getTime() > OTP_EXPIRY_HOURS * 60 * 60 * 1000;
};

const getTimeRemaining = (createdAt: string) => {
  const remaining = new Date(createdAt).getTime() + OTP_EXPIRY_HOURS * 60 * 60 * 1000 - Date.now();
  if (remaining <= 0) return "Expired";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m remaining`;
};

const Orders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [repostDialog, setRepostDialog] = useState<any>(null);
  const [repostLoading, setRepostLoading] = useState(false);
  const [repostQuantity, setRepostQuantity] = useState("1");
  const [repostPrice, setRepostPrice] = useState("");
  const [repostDeposit, setRepostDeposit] = useState("");
  const [repostDescription, setRepostDescription] = useState("");

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
            .select("*")
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
      toast({ title: "Order cancelled" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  };

  const verifyHandoverOTP = async (orderId: string) => {
    const order = orders.find((o: any) => o.id === orderId);
    if (isOtpExpired(order?.created_at)) {
      toast({ title: "OTP Expired", description: "Please cancel and create a new order.", variant: "destructive" });
      return;
    }
    const input = otpInputs[`handover-${orderId}`];
    if (input === order?.handover_otp) {
      await supabase.from("orders").update({ handover_confirmed: true, status: "active" }).eq("id", orderId);
      toast({ title: "Handover confirmed!" });
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
      toast({ title: "Return confirmed!" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      // Show repost dialog for seller on rental return
      const isSeller = order.seller_id === user?.id;
      if (isSeller && order.listing?.category === "rent") {
        setRepostDialog(order);
        setRepostQuantity(String(order.quantity || 1));
        setRepostPrice(String(order.listing?.price ?? ""));
        setRepostDeposit(String(order.listing?.security_deposit ?? ""));
        setRepostDescription(order.listing?.description || "");
      }
    } else {
      toast({ title: "Invalid OTP", variant: "destructive" });
    }
  };

  const handleRepost = async () => {
    if (!repostDialog?.listing) return;
    setRepostLoading(true);
    try {
      // Update existing listing to refill stock
      const { error } = await supabase.from("listings").update({
        quantity: Number(repostQuantity) || 1,
        price: Number(repostPrice) || 0,
        security_deposit: Number(repostDeposit) || 0,
        description: repostDescription,
        status: "active",
      } as any).eq("id", repostDialog.listing.id);
      if (error) throw error;
      toast({ title: "Listing reposted!", description: "Your item is back on the marketplace." });
      setRepostDialog(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRepostLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    let items = [...orders];
    if (statusFilter !== "all") items = items.filter((o: any) => o.status === statusFilter);
    if (categoryFilter !== "all") items = items.filter((o: any) => o.listing?.category === categoryFilter);
    return items;
  }, [orders, statusFilter, categoryFilter]);

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
      <SEO title="My Orders — ShareKart" description="Track your ShareKart rentals, purchases, and donations. Confirm handovers and returns securely with OTP verification." path="/orders" noindex />
      <Navbar />
      <main className="container flex-1 py-6 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold mb-4">My Orders</h1>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No orders yet</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-xs h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active / On Rent</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] text-xs h-8">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="rent">Rental</SelectItem>
                  <SelectItem value="sell">Purchase</SelectItem>
                  <SelectItem value="donate">Donation</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto">{filteredOrders.length} of {orders.length} orders</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No orders match the selected filters</p>
              </div>
            ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any) => {
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
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{order.listing?.title || "Item"}</h3>
                    <div className="flex items-center gap-2">
                      {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[order.status] || ""}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Order ID</span>
                      <div className="flex items-center gap-1 font-mono font-medium">
                        <span className="truncate max-w-[100px]">{order.id.slice(0, 8)}...</span>
                        <button onClick={() => copyToClipboard(order.id)} className="text-muted-foreground hover:text-primary" aria-label="Copy order ID">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date</span>
                      <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time</span>
                      <p className="font-medium">{new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantity</span>
                      <p className="font-medium">{order.quantity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category</span>
                      <p className="font-medium capitalize">{order.listing?.category || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role</span>
                      <p className="font-medium">{isBuyer ? "Buyer" : "Seller"}</p>
                    </div>
                    {order.listing?.price > 0 && (
                      <div>
                        <span className="text-muted-foreground">Price</span>
                        <p className="font-medium">₹{order.listing.price}</p>
                      </div>
                    )}
                    {isRental && order.listing?.security_deposit > 0 && (
                      <div>
                        <span className="text-muted-foreground">Deposit</span>
                        <p className="font-medium">₹{order.listing.security_deposit}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Updated</span>
                      <p className="font-medium">{new Date(order.updated_at).toLocaleString()}</p>
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
                            aria-label="Handover OTP"
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
                            aria-label="Return OTP"
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
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => cancelOrder(order.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Cancel Order
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
            )}
          </>
        )}
      </main>
      <Footer />

      {/* Repost Dialog */}
      <Dialog open={!!repostDialog} onOpenChange={(open) => !open && setRepostDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Relist Item
            </DialogTitle>
            <DialogDescription>
              The rental item "{repostDialog?.listing?.title}" has been returned. Would you like to relist it?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity to relist</Label>
              <Input type="number" min="1" value={repostQuantity} onChange={(e) => setRepostQuantity(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" value={repostPrice} onChange={(e) => setRepostPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Deposit (₹)</Label>
                <Input type="number" value={repostDeposit} onChange={(e) => setRepostDeposit(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={repostDescription} onChange={(e) => setRepostDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRepostDialog(null)}>Skip</Button>
            <Button onClick={handleRepost} disabled={repostLoading} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {repostLoading ? "Relisting..." : "Relist Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
