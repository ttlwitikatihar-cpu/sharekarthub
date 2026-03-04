import { Info } from "lucide-react";

const AdminSettingsTab = () => {
  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="flex items-center gap-3 mb-4">
        <Info className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Platform Settings</h2>
      </div>
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-sm mb-1">Platform Name</h3>
          <p className="text-sm text-muted-foreground">Lend · Give · Get</p>
        </div>
        <div>
          <h3 className="font-medium text-sm mb-1">Categories</h3>
          <div className="flex gap-2 flex-wrap">
            {["rent", "sell", "donate"].map(c => (
              <span key={c} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs capitalize">{c}</span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-medium text-sm mb-1">Security</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✅ Row-Level Security enabled on all tables</li>
            <li>✅ Role-based access control (admin/moderator/user)</li>
            <li>✅ Admin activity logging enabled</li>
            <li>✅ File uploads restricted to images only</li>
            <li>✅ Input validation via Zod schemas</li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-sm mb-1">Policies</h3>
          <p className="text-xs text-muted-foreground">Orders auto-cancel after 48h if not confirmed. Low stock alerts at ≤3 items.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
