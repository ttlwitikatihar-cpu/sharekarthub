import { Users, Package, ShoppingCart, Flag, TrendingUp, DollarSign } from "lucide-react";

interface StatsProps {
  users: number;
  listings: number;
  activeOrders: number;
  totalOrders: number;
  pendingReports: number;
  totalRevenue: number;
}

const AdminDashboardStats = ({ users, listings, activeOrders, totalOrders, pendingReports, totalRevenue }: StatsProps) => {
  const cards = [
    { label: "Total Users", value: users, icon: Users, color: "text-blue-500" },
    { label: "Total Listings", value: listings, icon: Package, color: "text-green-500" },
    { label: "Active Orders", value: activeOrders, icon: ShoppingCart, color: "text-orange-500" },
    { label: "Total Orders", value: totalOrders, icon: TrendingUp, color: "text-primary" },
    { label: "Pending Reports", value: pendingReports, icon: Flag, color: "text-destructive" },
    { label: "Est. Revenue", value: `₹${totalRevenue}`, icon: DollarSign, color: "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(s => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
          <p className="text-2xl font-bold">{s.value}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboardStats;
