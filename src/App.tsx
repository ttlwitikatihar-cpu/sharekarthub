import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Category from "./pages/Category";
import ItemDetail from "./pages/ItemDetail";
import ListItem from "./pages/ListItem";
import EditListing from "./pages/EditListing";
import Leaderboard from "./pages/Leaderboard";
import Chat from "./pages/Chat";
import Wishlist from "./pages/Wishlist";
import Orders from "./pages/Orders";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import MyListings from "./pages/MyListings";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import KYC from "./pages/trust/KYC";
import Escrow from "./pages/trust/Escrow";
import Disputes from "./pages/trust/Disputes";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import NotFound from "./pages/NotFound";
import MaintenanceGuard from "./components/MaintenanceGuard";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <MaintenanceGuard>
          <Routes>

            <Route path="/" element={<Index />} />
            <Route path="/c/:slug" element={<Category />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/list-item" element={<ListItem />} />
            <Route path="/edit-listing/:id" element={<EditListing />} />
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/trust/kyc" element={<KYC />} />
            <Route path="/trust/escrow" element={<Escrow />} />
            <Route path="/trust/disputes" element={<Disputes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </MaintenanceGuard>
        </AuthProvider>

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
