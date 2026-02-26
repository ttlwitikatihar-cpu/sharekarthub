import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, MapPin, ShieldCheck, Clock, ArrowLeft, MessageCircle, Heart, Share2, AlertTriangle, Pencil, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [orderQty, setOrderQty] = useState(1);

  const { data: item, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      
      // Fetch provider profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, rating, kyc_status")
        .eq("user_id", data.user_id)
        .single();
      
      return { ...data, profile };
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Item not found</h2>
            <Link to="/"><Button variant="outline">Back to Browse</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryLabels: Record<string, string> = { rent: "For Rent", sale: "For Sale", donate: "Free / Donate", service: "Service" };
  const profile = (item as any).profile as { full_name: string; avatar_url: string | null; rating: number | null; kyc_status: string } | null;
  const verified = profile?.kyc_status === "verified";
  const availableQty = item.quantity ?? 0;
  const outOfStock = item.status === "out_of_stock" || availableQty <= 0;
  const isOwner = user?.id === item.user_id;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="rounded-xl overflow-hidden bg-muted aspect-[4/3]">
              {item.images && item.images[0] ? (
                <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">No image</div>
              )}
            </div>
            {item.images && item.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {item.images.slice(1).map((img: string, i: number) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            <div>
              <Badge variant="secondary" className="mb-2">{categoryLabels[item.category] || item.category}</Badge>
              {outOfStock && <Badge variant="destructive" className="mb-2 ml-2">Out of Stock</Badge>}
              <h1 className="text-2xl md:text-3xl font-bold">{item.title}</h1>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {item.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{item.location}</span>}
              {profile?.rating && <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" />{profile.rating}</span>}
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{item.condition}</span>
            </div>

            <div className="text-3xl font-black">
              {item.category === "donate" ? (
                <span className="text-primary">Free</span>
              ) : (
                <>₹{(item.price ?? 0).toLocaleString()}{item.category === "rent" && <span className="text-base font-normal text-muted-foreground">/day</span>}</>
              )}
            </div>

            {item.security_deposit && item.security_deposit > 0 && (
              <p className="text-sm text-muted-foreground">
                Security deposit: <span className="font-semibold text-foreground">₹{item.security_deposit.toLocaleString()}</span> (held in escrow)
              </p>
            )}

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description || "No description provided."}</p>
            </div>

            <Separator />

            {profile && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {profile.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{profile.full_name || "User"}</span>
                    {verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </div>
                  {profile.rating && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-accent text-accent" />{profile.rating} rating
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {!isOwner && !outOfStock && availableQty > 1 && item.category !== "service" && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center gap-1 border border-border rounded-lg">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOrderQty(Math.max(1, orderQty - 1))} disabled={orderQty <= 1}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={availableQty}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.min(availableQty, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-14 text-center border-0 h-8 p-0"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOrderQty(Math.min(availableQty, orderQty + 1))} disabled={orderQty >= availableQty}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">({availableQty} available)</span>
              </div>
            )}

            <div className="flex gap-3 pt-2 flex-wrap">
              {isOwner && (
                <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate(`/edit-listing/${item.id}`)}>
                  <Pencil className="h-4 w-4" /> Edit Listing
                </Button>
              )}
              {!isOwner && (
                <>
                  <Button className="flex-1 gap-2" size="lg" disabled={outOfStock} onClick={async () => {
                    if (!user) { navigate("/auth"); return; }
                    if (outOfStock) {
                      toast({ title: "Out of Stock", description: "This item is currently unavailable.", variant: "destructive" });
                      return;
                    }
                    const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
                    const { error } = await supabase.from("orders").insert({
                      listing_id: item.id,
                      buyer_id: user.id,
                      seller_id: item.user_id,
                      quantity: orderQty,
                      handover_otp: generateOTP(),
                      return_otp: item.category === "rent" ? generateOTP() : null,
                    } as any);
                    if (error) {
                      const msg = error.message.includes("stock") ? "Not enough stock available." : error.message;
                      toast({ title: "Cannot place order", description: msg, variant: "destructive" });
                    } else {
                      toast({ title: "Order placed!", description: `${orderQty} item(s) ordered. Check your orders for OTP verification.` });
                      navigate("/orders");
                    }
                  }}>
                    {outOfStock ? "Out of Stock" : item.category === "rent" ? "Request to Rent" : item.category === "sale" ? "Buy Now" : item.category === "service" ? "Book Service" : "Request Item"}
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2" onClick={async () => {
                    if (!user) { navigate("/auth"); return; }
                    const { data: existing } = await supabase
                      .from("conversations")
                      .select("id")
                      .eq("listing_id", item.id)
                      .eq("buyer_id", user.id)
                      .maybeSingle();
                    if (existing) {
                      navigate("/chat");
                    } else {
                      await supabase.from("conversations").insert({
                        listing_id: item.id,
                        buyer_id: user.id,
                        seller_id: item.user_id,
                      });
                      navigate("/chat");
                    }
                  }}>
                    <MessageCircle className="h-4 w-4" /> Chat
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon"><Share2 className="h-5 w-5" /></Button>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ItemDetail;
