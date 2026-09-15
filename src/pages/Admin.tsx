import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminListingsTab from "@/components/admin/AdminListingsTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminReportsTab from "@/components/admin/AdminReportsTab";
import AdminLogsTab from "@/components/admin/AdminLogsTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminTicketsTab from "@/components/admin/AdminTicketsTab";
import AdminBackupTab from "@/components/admin/AdminBackupTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import AdminFraudTab from "@/components/admin/AdminFraudTab";
import AdminMaintenanceTab from "@/components/admin/AdminMaintenanceTab";


const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: async () => {
      const [userCount, listingCount, orderCount, activeOrderCount, pendingReportCount, recentUsers, recentOrders, completedOrders] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["active", "pending"]),
        (supabase as any).from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id, full_name, kyc_status").order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("id, status, quantity, created_at, listings(title, price)").order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("quantity, listings(price)").eq("status", "completed").limit(5000),
      ]);

      return {
        users: userCount.count || 0,
        listings: listingCount.count || 0,
        totalOrders: orderCount.count || 0,
        activeOrders: activeOrderCount.count || 0,
        pendingReports: pendingReportCount.count || 0,
        recentUsers: recentUsers.data || [],
        recentOrders: recentOrders.data || [],
        totalRevenue: (completedOrders.data || []).reduce(
          (sum: number, order: any) => sum + Number(order.listings?.price || 0) * Number(order.quantity || 0),
          0,
        ),
      };
    },
    enabled: !!isAdmin && activeTab === "dashboard",
    staleTime: 30_000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_profiles");
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!isAdmin && activeTab === "users",
    staleTime: 30_000,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin && activeTab === "listings",
    staleTime: 30_000,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(title, category, price)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin && activeTab === "orders",
    staleTime: 30_000,
  });

  const logAction = async (action: string, targetType: string, targetId: string, details: string) => {
    if (!user) return;
    await (supabase as any).from("admin_logs").insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  };

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

  const pendingReports = dashboard?.pendingReports || 0;
  const totalRevenue = dashboard?.totalRevenue || 0;

  const tabTitles: Record<string, string> = {
    dashboard: "Dashboard Overview",
    analytics: "Website Analytics",
    users: "User Management",
    listings: "Listing Management",
    orders: "Order Management",
    fraud: "Fraud Detection",
    reports: "Reports & Complaints",
    tickets: "Support Tickets",
    logs: "Activity Logs",
    backup: "Backup & Restore",
    maintenance: "Emergency Maintenance",
    settings: "Platform Settings",
  };


  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Admin Console — ShareKart Moderation" description="Moderate users, listings, orders, and reports across the ShareKart marketplace." path="/admin" noindex />
      <Navbar />
      <SidebarProvider>
        <div className="flex-1 flex w-full">
          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 border-b border-border px-4 h-12">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold">{tabTitles[activeTab]}</h1>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {activeTab === "dashboard" && (dashboardLoading || !dashboard ? (
                  <div className="text-center py-16 text-muted-foreground">Loading dashboard…</div>
                ) : (
                  <div className="space-y-6">
                    <AdminDashboardStats
                      users={dashboard.users}
                      listings={dashboard.listings}
                      activeOrders={dashboard.activeOrders}
                      totalOrders={dashboard.totalOrders}
                      pendingReports={pendingReports}
                      totalRevenue={totalRevenue}
                    />
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="font-semibold text-sm mb-3">Recent Users</h3>
                        {dashboard.recentUsers.map((u: any) => (
                          <div key={u.id} className="flex items-center gap-2 py-2 border-b border-border last:border-b-0">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {(u.full_name || "?").charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.full_name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground">{u.kyc_status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="font-semibold text-sm mb-3">Recent Orders</h3>
                        {dashboard.recentOrders.map((o: any) => (
                          <div key={o.id} className="flex items-center gap-2 py-2 border-b border-border last:border-b-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{o.listings?.title || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{o.status} · {new Date(o.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {activeTab === "analytics" && <AdminAnalyticsTab />}
                {activeTab === "users" && (usersLoading ? <div className="text-center py-16 text-muted-foreground">Loading users…</div> : <AdminUsersTab users={users} currentUserId={user?.id} logAction={logAction} />)}
                {activeTab === "listings" && (listingsLoading ? <div className="text-center py-16 text-muted-foreground">Loading listings…</div> : <AdminListingsTab listings={listings} logAction={logAction} />)}
                {activeTab === "orders" && (ordersLoading ? <div className="text-center py-16 text-muted-foreground">Loading orders…</div> : <AdminOrdersTab orders={orders} logAction={logAction} />)}
                {activeTab === "fraud" && <AdminFraudTab />}
                {activeTab === "reports" && <AdminReportsTab userId={user?.id} logAction={logAction} />}

                {activeTab === "tickets" && <AdminTicketsTab />}
                {activeTab === "logs" && <AdminLogsTab />}
                {activeTab === "backup" && <AdminBackupTab />}
                {activeTab === "maintenance" && <AdminMaintenanceTab logAction={logAction} />}
                {activeTab === "settings" && <AdminSettingsTab />}

              </motion.div>
            </div>
          </main>
        </div>
      </SidebarProvider>
      <Footer />
    </div>
  );
};

export default Admin;
