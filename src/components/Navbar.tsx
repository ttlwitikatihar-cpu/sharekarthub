import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, User, Plus, LogOut, ShieldCheck, Shield, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { label: "Browse", href: "/" },
  { label: "My Listings", href: "/my-listings" },
  { label: "Orders", href: "/orders" },
  { label: "Messages", href: "/chat" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { count: cartCount } = useCart();
  const { ids: wishlistIds } = useWishlist();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  const IconWithBadge = ({ to, label, count, children }: { to: string; label: string; count: number; children: React.ReactNode }) => (
    <Link to={to} aria-label={label} className="relative inline-flex">
      <Button variant="ghost" size="icon" className="relative">
        {children}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-black">S</span>
          <span className="hidden sm:inline">ShareKart</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} to={link.href} className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.href ? "text-primary" : "text-muted-foreground"}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <IconWithBadge to="/wishlist" label="Wishlist" count={wishlistIds.length}>
            <Heart className="h-5 w-5" />
          </IconWithBadge>
          <IconWithBadge to="/cart" label="Cart" count={cartCount}>
            <ShoppingCart className="h-5 w-5" />
          </IconWithBadge>
          {user ? (
            <>
              <Link to="/list-item">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">List Item</span>
                </Button>
              </Link>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open user menu">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-xs text-muted-foreground">{user.email}</DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Profile & KYC
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle mobile menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4 animate-fade-in">
          <nav className="flex flex-col gap-2 pt-2">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)} className={`py-2 text-sm font-medium rounded-md px-3 transition-colors ${location.pathname === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                {link.label}
              </Link>
            ))}
            <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium rounded-md px-3 text-muted-foreground hover:bg-muted flex items-center gap-2">
              <Heart className="h-4 w-4" /> Wishlist {wishlistIds.length > 0 && <span className="ml-auto text-xs">{wishlistIds.length}</span>}
            </Link>
            <Link to="/cart" onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium rounded-md px-3 text-muted-foreground hover:bg-muted flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Cart {cartCount > 0 && <span className="ml-auto text-xs">{cartCount}</span>}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
