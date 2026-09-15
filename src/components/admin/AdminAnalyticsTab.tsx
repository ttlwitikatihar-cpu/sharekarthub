import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Users as UsersIcon, Package, ShoppingCart, TrendingUp,
  LogIn, Eye, MousePointerClick,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PALETTE = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899"];

const RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

const StatCard = ({
  icon: Icon, label, value, hint,
}: { icon: any; label: string; value: string | number; hint?: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
    </div>
    <p className="text-2xl font-bold mt-1">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
);

const AdminAnalyticsTab = () => {
  const [range, setRange] = useState("30d");
  const days = RANGES[range];
  const since = useMemo(() => new Date(Date.now() - days * 86400_000).toISOString(), [days]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", range],
    queryFn: async () => {
      const [profiles, listings, orders, activity] = await Promise.all([
        supabase.from("profiles").select("created_at"),
        supabase.from("listings").select("id, category, listing_type, status, created_at, price"),
        supabase.from("orders").select("id, status, quantity, created_at, listing_id"),
        supabase.from("user_activity").select("id, user_id, action, created_at").gte("created_at", since).limit(10000),
      ]);
      return {
        profiles: (profiles.data as any[]) || [],
        listings: (listings.data as any[]) || [],
        orders: (orders.data as any[]) || [],
        activity: (activity.data as any[]) || [],
      };
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const sinceMs = Date.now() - days * 86400_000;

    const newUsers = data.profiles.filter((p: any) => new Date(p.created_at).getTime() >= sinceMs).length;
    const newListings = data.listings.filter((l: any) => new Date(l.created_at).getTime() >= sinceMs).length;
    const newOrders = data.orders.filter((o: any) => new Date(o.created_at).getTime() >= sinceMs);
    const completed = newOrders.filter((o: any) => o.status === "completed").length;

    // Time series by day
    const buckets: Record<string, { d: string; users: number; listings: number; orders: number; logins: number; views: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      buckets[d] = { d, users: 0, listings: 0, orders: 0, logins: 0, views: 0 };
    }
    const bump = (created: string, key: keyof (typeof buckets)[string]) => {
      const k = created.slice(0, 10);
      if (buckets[k] && key !== "d") (buckets[k] as any)[key] += 1;
    };
    data.profiles.forEach((p: any) => { if (new Date(p.created_at).getTime() >= sinceMs) bump(p.created_at, "users"); });
    data.listings.forEach((l: any) => { if (new Date(l.created_at).getTime() >= sinceMs) bump(l.created_at, "listings"); });
    data.orders.forEach((o: any) => { if (new Date(o.created_at).getTime() >= sinceMs) bump(o.created_at, "orders"); });
    data.activity.forEach((a: any) => {
      if (a.action === "login") bump(a.created_at, "logins");
      else if (a.action === "view" || a.action === "page_view") bump(a.created_at, "views");
    });

    // Category breakdown
    const catMap = new Map<string, number>();
    data.listings.forEach((l: any) => {
      const c = l.category || l.listing_type || "other";
      catMap.set(c, (catMap.get(c) || 0) + 1);
    });
    const categories = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

    // Order status breakdown
    const statusMap = new Map<string, number>();
    data.orders.forEach((o: any) => statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1));
    const orderStatus = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    // Top actions
    const actionMap = new Map<string, number>();
    data.activity.forEach((a: any) => actionMap.set(a.action, (actionMap.get(a.action) || 0) + 1));
    const topActions = Array.from(actionMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);

    // Active users (unique user_id in activity window)
    const activeUsers = new Set(data.activity.map((a: any) => a.user_id).filter(Boolean)).size;
    const logins = data.activity.filter((a: any) => a.action === "login").length;
    const pageViews = data.activity.filter((a: any) => a.action === "view" || a.action === "page_view").length;

    return {
      newUsers, newListings, newOrders: newOrders.length, completed,
      activeUsers, logins, pageViews,
      series: Object.values(buckets),
      categories, orderStatus, topActions,
      totalUsers: data.profiles.length,
      totalListings: data.listings.length,
    };
  }, [data, days]);

  if (isLoading || !stats) return <div className="text-center py-16 text-muted-foreground">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Website Analytics</h2>
          <p className="text-xs text-muted-foreground">Track traffic, engagement, growth and conversions across ShareKart.</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={UsersIcon} label="New users" value={stats.newUsers} hint={`of ${stats.totalUsers} total`} />
        <StatCard icon={Package} label="New listings" value={stats.newListings} hint={`of ${stats.totalListings} total`} />
        <StatCard icon={ShoppingCart} label="New orders" value={stats.newOrders} hint={`${stats.completed} completed`} />
        <StatCard icon={TrendingUp} label="Active users" value={stats.activeUsers} hint="unique in period" />
        <StatCard icon={LogIn} label="Logins" value={stats.logins} />
        <StatCard icon={Eye} label="Page / item views" value={stats.pageViews} />
        <StatCard icon={MousePointerClick} label="Total actions" value={stats.topActions.reduce((s, a) => s + a.count, 0)} />
        <StatCard icon={TrendingUp} label="Conversion" value={`${stats.newOrders && stats.pageViews ? ((stats.newOrders / stats.pageViews) * 100).toFixed(1) : 0}%`} hint="orders / views" />
      </div>

      {/* Trend chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-sm mb-3">Activity trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={stats.series}>
            <defs>
              <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="d" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#gUsers)" name="New users" />
            <Area type="monotone" dataKey="orders" stroke="#f59e0b" fill="url(#gOrders)" name="Orders" />
            <Area type="monotone" dataKey="views" stroke="#10b981" fill="url(#gViews)" name="Views" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Listings by category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.categories} dataKey="value" nameKey="name" outerRadius={80} label={{ fontSize: 10 }}>
                {stats.categories.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Orders by status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.orderStatus}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-sm mb-3">Top user actions</h3>
        {stats.topActions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No tracked actions in this range.</p>
        ) : (
          <div className="space-y-2">
            {stats.topActions.map((a) => {
              const max = stats.topActions[0].count;
              const pct = (a.count / max) * 100;
              return (
                <div key={a.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize font-medium">{a.name.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{a.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsTab;
