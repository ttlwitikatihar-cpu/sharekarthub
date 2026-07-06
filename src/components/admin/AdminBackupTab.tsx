import { useRef, useState } from "react";
import { Download, Upload, Database, ShieldAlert, Info, CheckCircle2, AlertTriangle, Github, Code2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const TABLES = [
  "profiles", "user_roles", "platform_settings", "listings", "conversations",
  "messages", "orders", "reviews", "notifications", "cart_items",
  "wishlist_items", "support_tickets", "ticket_messages", "user_activity",
];

const AdminBackupTab = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [lastReport, setLastReport] = useState<any>(null);

  const runBackup = async () => {
    setBackingUp(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("admin-backup", {
        method: "POST",
      });
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sharekart-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: "Backup downloaded", description: "Your JSON backup file is saved." });
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setBackingUp(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPendingFile(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true);
    try {
      const text = await pendingFile.text();
      const backup = JSON.parse(text);
      if (!backup?.data) throw new Error("Invalid backup file: missing 'data' field.");

      const { data, error } = await supabase.functions.invoke("admin-restore", {
        method: "POST",
        body: { backup, mode },
      });
      if (error) throw error;

      setLastReport(data);
      toast({ title: "Restore complete", description: `Mode: ${mode}. See report below.` });
      setPendingFile(null);
    } catch (e: any) {
      toast({ title: "Restore failed", description: e.message, variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Source Code Backup — GitHub */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-foreground/90 flex items-center justify-center shrink-0">
            <Github className="h-5 w-5 text-background" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Code2 className="h-4 w-4" /> Source Code Backup (every project file)
            </h2>
            <p className="text-sm text-muted-foreground">
              The data backup below saves your live database. To back up the actual <strong>project files &amp; code</strong> (every component, page, edge function, config), connect the project to GitHub — that gives you a downloadable, restorable copy of the entire codebase.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background/60 p-4 space-y-3 text-sm">
          <h3 className="font-medium">One-time setup (2 minutes)</h3>
          <ol className="list-decimal ml-5 space-y-1.5 text-muted-foreground">
            <li>Open this project in the Lovable editor.</li>
            <li>Click the <strong>GitHub</strong> button (top-right of the editor) → <em>Connect to GitHub</em>.</li>
            <li>Authorize Lovable and pick an account/organization to host the repo.</li>
            <li>Lovable pushes every file to a new repo you own. From then on, every change auto-syncs.</li>
          </ol>

          <h3 className="font-medium pt-2">Downloading the code anytime</h3>
          <ol className="list-decimal ml-5 space-y-1.5 text-muted-foreground">
            <li>Open your GitHub repo.</li>
            <li>Click the green <strong>Code</strong> button → <strong>Download ZIP</strong>.</li>
            <li>You now have every file on your PC — components, pages, edge functions, migrations, config, assets.</li>
          </ol>

          <h3 className="font-medium pt-2">Restoring from a crash</h3>
          <ol className="list-decimal ml-5 space-y-1.5 text-muted-foreground">
            <li>Create a new Lovable project → <em>Import from GitHub</em> → pick your repo.</li>
            <li>Or run it locally: <code className="text-xs px-1.5 py-0.5 rounded bg-muted">git clone …</code> → <code className="text-xs px-1.5 py-0.5 rounded bg-muted">npm install</code> → <code className="text-xs px-1.5 py-0.5 rounded bg-muted">npm run dev</code>.</li>
            <li>Restore the database using the JSON backup below.</li>
          </ol>

          <a
            href="https://docs.lovable.dev/integrations/git"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm pt-1"
          >
            Open GitHub integration docs <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Full disaster recovery =</strong> GitHub ZIP (all code) <strong>+</strong> the JSON backup below (all data). Keep both and you can rebuild ShareKart from scratch anytime.
        </div>
      </div>


      {/* Backup */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">Download Backup</h2>
            <p className="text-sm text-muted-foreground">
              Exports every row from all app tables into a single JSON file you can save on your device.
            </p>
          </div>
        </div>
        <Button onClick={runBackup} disabled={backingUp} size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          {backingUp ? "Preparing..." : "Download Full Backup (.json)"}
        </Button>
      </div>

      {/* Restore */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">Restore From Backup</h2>
            <p className="text-sm text-muted-foreground">
              Upload a previously downloaded backup file. Choose a restore mode below.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-[200px_1fr] gap-3 items-start">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Restore mode</label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">Merge (safe)</SelectItem>
                <SelectItem value="replace">Replace All (danger)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground rounded-md bg-muted/50 p-3 space-y-1">
            <p><strong>Merge:</strong> Inserts new rows and updates existing rows by <code>id</code>. Rows currently in the database that are not in the backup are kept.</p>
            <p><strong>Replace All:</strong> Deletes every row in each table first, then inserts everything from the backup. Undoable only by running a newer backup.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onPickFile} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            {pendingFile ? `Selected: ${pendingFile.name}` : "Choose Backup File"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!pendingFile || restoring} variant={mode === "replace" ? "destructive" : "default"} className="gap-2">
                <Database className="h-4 w-4" />
                {restoring ? "Restoring..." : mode === "replace" ? "Wipe & Restore" : "Restore (Merge)"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Confirm Restore
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {mode === "replace" ? (
                    <>You're about to <strong>delete every row</strong> from all app tables and replace them with data from the backup. This cannot be undone unless you have a fresh backup.</>
                  ) : (
                    <>You're about to merge backup data into your live database. Existing rows with the same <code>id</code> will be overwritten.</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runRestore}>Yes, proceed</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {lastReport && (
          <div className="rounded-lg border border-border p-3 mt-2 text-xs space-y-1 bg-muted/30">
            <div className="flex items-center gap-2 font-medium mb-1">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Last restore report (mode: {lastReport.mode})
            </div>
            <div className="grid sm:grid-cols-2 gap-x-4">
              {Object.entries(lastReport.report ?? {}).map(([table, r]: any) => (
                <div key={table} className="flex justify-between border-b border-border py-1">
                  <span className="font-mono">{table}</span>
                  <span className={r.error ? "text-destructive" : "text-muted-foreground"}>
                    {r.error ? `error: ${r.error}` : `${r.deleted != null ? `−${r.deleted} ` : ""}${r.inserted ?? 0} rows`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Docs */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">How it works</h2>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h3 className="font-medium text-foreground mb-1">What gets backed up</h3>
            <p>Every row from these {TABLES.length} app tables is included in the JSON file:</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {TABLES.map((t) => (
                <code key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{t}</code>
              ))}
            </div>
            <p className="mt-2 text-xs">
              User accounts, auth passwords, uploaded image files, and OTP secrets stored in Auth/Storage are managed by the backend platform and are <strong>not</strong> included — only the app data that lives in these tables.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">How the backup is created</h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li>You click <em>Download Full Backup</em>.</li>
              <li>The admin panel calls a secure edge function <code>admin-backup</code>.</li>
              <li>The function verifies your session and confirms you have the <code>admin</code> role via <code>has_role()</code>.</li>
              <li>It reads all rows from each table using the service role (bypasses row-level security so nothing is missed).</li>
              <li>It returns a single JSON document with a <code>meta</code> block (version, timestamp, admin id) and a <code>data</code> block (rows per table).</li>
              <li>Your browser saves it as <code>sharekart-backup-&lt;timestamp&gt;.json</code>.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1">How restore works</h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Pick a backup file and choose a mode.</li>
              <li>The panel calls the <code>admin-restore</code> edge function, which again verifies admin role.</li>
              <li>In <strong>Replace All</strong> mode, every row in each table is deleted first (children before parents to respect foreign keys).</li>
              <li>Rows are then upserted (insert or update) using each row's <code>id</code> as the conflict key, in dependency-safe order (parents before children).</li>
              <li>A per-table report is returned showing how many rows were inserted, deleted, or errored.</li>
            </ol>
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-amber-700">Important:</strong> A restore only writes rows into tables that already exist. If the database schema has changed since the backup was taken, some columns may be dropped or fail to insert. Keep backups close to the current schema, and always download a fresh backup <em>before</em> a Replace-All restore.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBackupTab;
