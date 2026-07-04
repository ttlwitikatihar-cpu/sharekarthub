import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/lib/wishlist";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const Wishlist = () => {
  const { user } = useAuth();
  const { ids } = useWishlist();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlist-listings", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data } = await supabase.from("listings").select("*").in("id", ids);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Wishlist — ShareKart" description="Your saved items on ShareKart." path="/wishlist" noindex />
      <Navbar />
      <main className="container flex-1 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-6 w-6 text-primary fill-primary" />
          <h1 className="text-2xl font-bold">Your Wishlist</h1>
          <span className="text-muted-foreground">({items.length})</span>
        </div>

        {!user && (
          <div className="rounded-xl border border-border p-6 text-center space-y-3">
            <p className="text-muted-foreground text-sm">Sign in to save your wishlist to the cloud and access it anywhere.</p>
            <Link to="/auth"><Button size="sm">Sign In</Button></Link>
          </div>
        )}

        {items.length === 0 && !isLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No items in your wishlist yet.</p>
            <Link to="/"><Button variant="link">Browse items</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it) => (
              <ItemCard key={it.id} item={it as any} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;
