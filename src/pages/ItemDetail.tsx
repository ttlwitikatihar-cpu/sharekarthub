import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, MapPin, ShieldCheck, Clock, ArrowLeft, MessageCircle, Heart, Share2, AlertTriangle, Pencil, Minus, Plus, Flag, Store, User, Eye, EyeOff } from "lucide-react";
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
import ReportDialog from "@/components/ReportDialog";
import { trackActivity } from "@/lib/trackActivity";
import SEO from "@/components/SEO";
import { useWishlist, shareItem } from "@/lib/wishlist";
import { calculatePricing, formatINR } from "@/lib/pricing";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [orderQty, setOrderQty] = useState(1);
  const { has: isWishlisted, toggle: toggleWishlist } = useWishlist();
  const settings = usePlatformSettings();


  const { data: item, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, rating, total_reviews, kyc_status, phone, shop_name, donations_count")
        .eq("user_id", data.user_id)
        .single();
      
      return { ...data, profile };
    },
    enabled: !!id,
  });

  // Check if seller has accepted a conversation with this buyer (contact revealed)
  const { data: hasAcceptedConversation } = useQuery({
    queryKey: ["conversation-exists", id, user?.id],
    queryFn: async () => {
      if (!user || !item) return false;
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", item.id)
        .eq("buyer_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!item && user.id !== item?.user_id,
  });

  // Fetch seller reviews
  const { data: sellerReviews = [] } = useQuery({
    queryKey: ["seller-reviews", item?.user_id],
    queryFn: async () => {
      const { data: sellerListings } = await supabase
        .from("listings")
        .select("id")
        .eq("user_id", item!.user_id);
      if (!sellerListings?.length) return [];
      const ids = sellerListings.map((l: any) => l.id);
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating, comment, created_at, reviewer_id")
        .in("listing_id", ids)
        .order("created_at", { ascending: false })
        .limit(10);
      return reviews || [];
    },
    enabled: !!item,
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

  const categoryLabels: Record<string, string> = { rent: "For Rent", sell: "For Sale", donate: "Free / Donate" };
  const profile = (item as any).profile as { full_name: string; avatar_url: string | null; rating: number | null; total_reviews: number | null; kyc_status: string; phone: string | null; shop_name: string | null; donations_count: number | null } | null;
  const verified = profile?.kyc_status === "verified";
  const availableQty = item.quantity ?? 0;
  const outOfStock = item.status === "out_of_stock" || availableQty <= 0;
  const isOwner = user?.id === item.user_id;
  const contactRevealed = isOwner || hasAcceptedConversation;
  const avgRating = profile?.rating ? Number(profile.rating) : 0;
  const totalReviews = profile?.total_reviews ?? 0;
  const isDonation = item.category === "donate";

  const shortDesc = (item.description || `${categoryLabels[item.category] || item.category} on ShareKart.`).slice(0, 155);
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description: shortDesc,
    image: item.images || undefined,
    offers: !isDonation && item.price ? {
      "@type": "Offer",
      price: item.price,
      priceCurrency: "INR",
      availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    } : undefined,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${item.title} — ${categoryLabels[item.category] || "ShareKart"}`}
        description={shortDesc}
        path={`/item/${item.id}`}
        type="product"
        image={item.images?.[0]}
        jsonLd={productLd}
      />
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
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{item.condition}</span>
            </div>

            <div className="text-3xl font-black">
              {isDonation ? (
                <span className="text-primary">Free</span>
              ) : (
                <>₹{(item.price ?? 0).toLocaleString()}{item.category === "rent" && <span className="text-base font-normal text-muted-foreground">/day</span>}</>
              )}
            </div>

            {item.security_deposit && item.security_deposit > 0 && (
              <p className="text-sm text-muted-foreground">
                Security deposit: <span className="font-semibold text-foreground">₹{item.security_deposit.toLocaleString()}</span>{" "}
                <span className="text-amber-600">(refundable · escrow coming soon)</span>
              </p>
            )}

            <Separator />

            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description || "No description provided."}</p>
            </div>

            <Separator />

            {/* Seller / Donor Info */}
            {profile && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm ${isDonation ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
                    {isDonation ? "❤️" : (profile.full_name?.charAt(0) || "?")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {isDonation ? (
                        <span className="font-semibold text-sm flex items-center gap-1 text-primary">
                          <Heart className="h-3.5 w-3.5 fill-primary" />
                          Donated by {profile.shop_name || profile.full_name || "Anonymous"}
                        </span>
                      ) : profile.shop_name ? (
                        <span className="font-semibold text-sm flex items-center gap-1"><Store className="h-3.5 w-3.5" />{profile.shop_name}</span>
                      ) : (
                        <span className="font-semibold text-sm flex items-center gap-1"><User className="h-3.5 w-3.5" />{profile.full_name || "Seller"}</span>
                      )}
                      {verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                    </div>
                    {isDonation && profile.donations_count && profile.donations_count > 1 && (
                      <p className="text-xs text-muted-foreground">{profile.donations_count} donations made</p>
                    )}
                    {!isDonation && profile.shop_name && (
                      <p className="text-xs text-muted-foreground">{profile.full_name}</p>
                    )}
                  </div>
                  {/* Rating */}
                  {avgRating > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <Star className="h-4 w-4 fill-accent text-accent" />
                        {avgRating.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                </div>

                {/* Contact details - hidden until seller accepts */}
                {!isOwner && (
                  <div className="flex items-center gap-2 text-xs rounded-lg bg-muted/50 px-3 py-2">
                    {contactRevealed ? (
                      <>
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span className="text-foreground">Phone: {profile.phone || "Not provided"}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Contact details hidden until seller accepts your request</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Seller Reviews */}
            {sellerReviews.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-semibold text-sm">{isDonation ? "Donor" : "Seller"} Reviews</h2>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {sellerReviews.map((r: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star key={si} className={`h-3 w-3 ${si < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {!isOwner && !outOfStock && availableQty > 1 && item.category !== "service" && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center gap-1 border border-border rounded-lg">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOrderQty(Math.max(1, orderQty - 1))} disabled={orderQty <= 1} aria-label="Decrease quantity">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={availableQty}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.min(availableQty, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-14 text-center border-0 h-8 p-0"
                    aria-label="Quantity"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOrderQty(Math.min(availableQty, orderQty + 1))} disabled={orderQty >= availableQty} aria-label="Increase quantity">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">({availableQty} available)</span>
              </div>
            )}

            {/* Pricing breakdown */}
            {!isDonation && !isOwner && (item.price ?? 0) > 0 && (() => {
              const p = calculatePricing({
                category: item.category,
                price: item.price ?? 0,
                quantity: orderQty,
                securityDeposit: item.security_deposit ?? 0,
                settings,
              });
              return (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5 text-sm">
                  <h3 className="font-semibold mb-1">Payment Summary</h3>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({orderQty} × {formatINR(item.price ?? 0)})</span>
                    <span className="text-foreground">{formatINR(p.subtotal)}</span>
                  </div>
                  {p.commissionEnabled && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform commission ({Math.round(p.commissionRate * 100)}%)</span>
                      <span className="text-foreground">{formatINR(p.commission)}</span>
                    </div>
                  )}
                  {p.refundableDeposit > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Security deposit (refundable)</span>
                      <span className="text-foreground">{formatINR(p.refundableDeposit)}</span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>You pay now</span>
                    <span>{formatINR(p.buyerPays)}</span>
                  </div>
                  {p.refundOnReturn > 0 && (
                    <p className="text-xs text-primary">Refund of {formatINR(p.refundOnReturn)} on successful return.</p>
                  )}
                </div>
              );
            })()}


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
                      trackActivity("placed_order", `Ordered ${orderQty}x "${item.title}"`, { listing_id: item.id, category: item.category });
                      toast({ title: "Order placed!", description: `${orderQty} item(s) ordered. Check your orders for OTP verification.` });
                      navigate("/orders");
                    }
                  }}>
                    {outOfStock ? "Out of Stock" : isDonation ? "Request Item" : item.category === "rent" ? "Request to Rent" : "Buy Now"}
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
              <Button
                variant="ghost"
                size="icon"
                aria-label={isWishlisted(item.id) ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => {
                  const added = toggleWishlist(item.id);
                  toast({ title: added ? "Added to wishlist" : "Removed from wishlist" });
                }}
              >
                <Heart className={`h-5 w-5 ${isWishlisted(item.id) ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Share item"
                onClick={async () => {
                  const result = await shareItem({
                    title: item.title,
                    text: shortDesc,
                    url: `${window.location.origin}/item/${item.id}`,
                  });
                  if (result === "copied") toast({ title: "Link copied to clipboard" });
                  else if (result === "failed") toast({ title: "Could not share", variant: "destructive" });
                }}
              >
                <Share2 className="h-5 w-5" />
              </Button>
              {!isOwner && user && <ReportDialog reportedListingId={item.id} reportedUserId={item.user_id} triggerVariant="icon" />}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ItemDetail;
