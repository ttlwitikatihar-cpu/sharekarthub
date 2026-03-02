import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, RefreshCw, Package, Eye, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const MyListings = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let items = [...listings];
    if (statusFilter !== "all") {
      items = items.filter((l: any) => statusFilter === "out_of_stock" ? l.status === "out_of_stock" : l.status === statusFilter);
    }
    if (categoryFilter !== "all") items = items.filter((l: any) => l.category === categoryFilter);
    return items;
  }, [listings, statusFilter, categoryFilter]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Sign in to view your listings.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    active: "bg-primary/10 text-primary",
    out_of_stock: "bg-destructive/10 text-destructive",
  };

  const renderListingCard = (listing: any) => (
    <motion.div
      key={listing.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        {listing.images?.[0] && (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold truncate">{listing.title}</h3>
            <Badge variant="outline" className={statusColor[listing.status] || ""}>
              {listing.status === "out_of_stock" ? "Out of Stock" : listing.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs capitalize">{listing.category}</Badge>
            <Badge variant="secondary" className="text-xs capitalize">{listing.listing_type}</Badge>
            <span>Qty: {listing.quantity}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {listing.category !== "donate" && <span>₹{listing.price}</span>}
            {listing.category === "rent" && listing.security_deposit > 0 && (
              <span className="ml-2">Deposit: ₹{listing.security_deposit}</span>
            )}
            <span className="ml-2">Listed: {new Date(listing.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Link to={`/item/${listing.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
        </Link>
        <Link to={`/edit-listing/${listing.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
        </Link>
        {listing.status === "out_of_stock" && (
          <Link to={`/edit-listing/${listing.id}`}>
            <Button size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refill Stock
            </Button>
          </Link>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-6 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold mb-4">My Listings</h1>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
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
                  <SelectItem value="active">Available</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] text-xs h-8">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="rent">Rented</SelectItem>
                  <SelectItem value="sell">Sold</SelectItem>
                  <SelectItem value="donate">Donated</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {listings.length} listings</span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No listings match the selected filters</p>
              </div>
            ) : (
              <div className="space-y-4">{filtered.map(renderListingCard)}</div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyListings;
