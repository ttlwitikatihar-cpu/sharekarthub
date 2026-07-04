import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Trash2, Plus, Minus, Store } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OrderTermsDialog from "@/components/OrderTermsDialog";
import { trackActivity } from "@/lib/trackActivity";
import SEO from "@/components/SEO";

const Cart = () => {
  const { user } = useAuth();
  const { items, updateQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showTerms, setShowTerms] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Group by seller
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach((i) => {
      if (!i.listing) return;
      const key = i.listing.user_id;
      if (!map.has(key)) map.set(key, [] as any);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries());
  }, [items]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + (i.listing?.price ?? 0) * i.quantity, 0);

  const placeAllOrders = async () => {
    if (!user || !items.length) return;
    setPlacing(true);
    const acceptedAt = new Date().toISOString();
    const rows = items
      .filter((i) => i.listing && i.listing.user_id !== user.id)
      .map((i) => ({
        listing_id: i.listing!.id,
        buyer_id: user.id,
        seller_id: i.listing!.user_id,
        quantity: i.quantity,
        terms_accepted_at: acceptedAt,
      }));

    let placed = 0;
    let failed = 0;
    for (const row of rows) {
      const { error } = await supabase.from("orders").insert(row as any);
      if (error) failed++;
      else placed++;
    }

    if (placed > 0) {
      // clear only the successfully placed items — simplest: clear all if all placed, else keep failed
      if (failed === 0) await clear();
      trackActivity("placed_order", `Checked out ${placed} cart item(s)`);
      toast({ title: `${placed} order(s) placed!`, description: failed ? `${failed} could not be placed.` : "Check your orders for OTP verification." });
      setShowTerms(false);
      navigate("/orders");
    } else {
      toast({ title: "Could not place orders", description: "Please check stock or availability.", variant: "destructive" });
    }
    setPlacing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Sign in to view your cart.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Cart — ShareKart" description="Review items from multiple sellers and check out in one flow." path="/cart" noindex />
      <Navbar />
      <main className="container flex-1 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Continue shopping
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Your Cart</h1>
            <span className="text-muted-foreground">({totalItems})</span>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} className="text-destructive">Clear cart</Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Your cart is empty.</p>
            <Link to="/"><Button variant="link">Browse items</Button></Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6">
              {groups.map(([sellerId, group]) => (
                <div key={sellerId} className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 flex items-center gap-2 text-sm font-medium border-b border-border">
                    <Store className="h-4 w-4 text-primary" />
                    Seller order
                    <span className="text-muted-foreground text-xs ml-auto">
                      {group.length} item{group.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {group.map((i) => (
                      <li key={i.id} className="p-4 flex gap-3">
                        <Link to={`/item/${i.listing?.id}`} className="shrink-0">
                          <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden">
                            {i.listing?.images?.[0] ? (
                              <img src={i.listing.images[0]} alt={i.listing.title} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/item/${i.listing?.id}`} className="font-medium text-sm line-clamp-1 hover:text-primary">
                            {i.listing?.title}
                          </Link>
                          <p className="text-xs text-muted-foreground capitalize">{i.listing?.category}</p>
                          <p className="mt-1 font-semibold text-sm">
                            {i.listing?.category === "donate" ? (
                              <span className="text-primary">Free</span>
                            ) : (
                              <>₹{((i.listing?.price ?? 0) * i.quantity).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end justify-between gap-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(i.id)} aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center border border-border rounded-md">
                            <button className="h-7 w-7 flex items-center justify-center hover:bg-muted" onClick={() => updateQty(i.id, i.quantity - 1)} disabled={i.quantity <= 1} aria-label="Decrease">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm">{i.quantity}</span>
                            <button className="h-7 w-7 flex items-center justify-center hover:bg-muted" onClick={() => updateQty(i.id, i.quantity + 1)} disabled={i.quantity >= (i.listing?.quantity ?? 99)} aria-label="Increase">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <aside className="rounded-xl border border-border p-4 h-fit sticky top-20 space-y-3">
              <h2 className="font-semibold">Order Summary</h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sellers</span>
                <span>{groups.length}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-border">
                <span>Total</span>
                <span>₹{totalPrice.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                One order is created per seller. Payment happens offline directly with the seller.
              </p>
              <Button className="w-full" onClick={() => setShowTerms(true)}>
                Checkout ({groups.length} order{groups.length > 1 ? "s" : ""})
              </Button>
            </aside>
          </div>
        )}
      </main>
      <OrderTermsDialog
        open={showTerms}
        onOpenChange={setShowTerms}
        loading={placing}
        category="cart"
        onAccept={placeAllOrders}
      />
      <Footer />
    </div>
  );
};

export default Cart;
