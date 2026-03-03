import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Users, Package, ShoppingCart, Trash2, Eye, Ban, CheckCircle, Search, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [listingFilter, setListingFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; title: string } | null>(null);

  // Check admin role
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  // Users
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  // Listings
  const { data: listings = [] } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  // Orders
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, listings(title, category)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast({ title: "Listing deleted" });
      setConfirmDelete(null);
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated" });
    },
  });

  const updateListingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("listings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast({ title: "Listing updated" });
    },
  });

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Checking permissions...</div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You don't have admin privileges.</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </main>
    </div>
  );

  const filteredUsers = users.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.user_id?.includes(search));
  const filteredListings = listings.filter(l => {
    if (listingFilter !== "all" && l.status !== listingFilter && l.category !== listingFilter) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const filteredOrders = orders.filter(o => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    return true;
  });

  const stats = {
    users: users.length,
    listings: listings.length,
    activeOrders: orders.filter(o => o.status === "active" || o.status === "pending").length,
    totalOrders: orders.length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Manage users, listings, and orders across the platform.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Users", value: stats.users, icon: Users, color: "text-blue-500" },
            { label: "Listings", value: stats.listings, icon: Package, color: "text-green-500" },
            { label: "Active Orders", value: stats.activeOrders, icon: ShoppingCart, color: "text-orange-500" },
            { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-primary" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users, listings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="listings">Listings ({filteredListings.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({filteredOrders.length})</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {filteredUsers.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">No users found</p>
              ) : filteredUsers.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(u.full_name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{u.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.phone || "No phone"} · {u.location || "No location"}</p>
                  </div>
                  <Badge variant={u.kyc_status === "verified" ? "default" : "secondary"} className="text-xs shrink-0">
                    {u.kyc_status}
                  </Badge>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Donations: {u.donations_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Points: {u.reward_points ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings">
            <div className="flex gap-2 mb-4">
              {["all", "active", "out_of_stock", "rent", "sell", "donate"].map(f => (
                <Button key={f} size="sm" variant={listingFilter === f ? "default" : "outline"} onClick={() => setListingFilter(f)} className="text-xs capitalize">
                  {f === "all" ? "All" : f.replace("_", " ")}
                </Button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {filteredListings.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">No listings found</p>
              ) : filteredListings.map(l => (
                <div key={l.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.category} · Qty: {l.quantity} · ₹{l.price ?? 0} · {new Date(l.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">{l.status}</Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/item/${l.id}`)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {l.status === "active" ? (
                      <Button size="icon" variant="ghost" onClick={() => updateListingStatus.mutate({ id: l.id, status: "suspended" })} title="Suspend">
                        <Ban className="h-4 w-4 text-orange-500" />
                      </Button>
                    ) : l.status === "suspended" ? (
                      <Button size="icon" variant="ghost" onClick={() => updateListingStatus.mutate({ id: l.id, status: "active" })} title="Reactivate">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    ) : null}
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ type: "listing", id: l.id, title: l.title })} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="flex gap-2 mb-4">
              {["all", "pending", "active", "completed", "cancelled"].map(f => (
                <Button key={f} size="sm" variant={orderFilter === f ? "default" : "outline"} onClick={() => setOrderFilter(f)} className="text-xs capitalize">
                  {f}
                </Button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {filteredOrders.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">No orders found</p>
              ) : filteredOrders.map(o => {
                const listing = o.listings as any;
                return (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{listing?.title || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {o.id.slice(0, 8)}… · {listing?.category} · Qty: {o.quantity} · {new Date(o.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Handover: {o.handover_confirmed ? "✅" : "❌"} · Return: {o.return_confirmed ? "✅" : "❌"}
                      </p>
                    </div>
                    <Badge variant={o.status === "completed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"} className="text-xs shrink-0">
                      {o.status}
                    </Badge>
                    {o.status !== "cancelled" && o.status !== "completed" && (
                      <Select onValueChange={(v) => updateOrderStatus.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="w-[120px] text-xs">
                          <SelectValue placeholder="Change" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Complete</SelectItem>
                          <SelectItem value="cancelled">Cancel</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{confirmDelete?.title}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteListing.mutate(confirmDelete.id)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Admin;
