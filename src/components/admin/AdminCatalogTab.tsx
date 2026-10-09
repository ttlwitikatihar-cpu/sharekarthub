import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, RefreshCw, Tags, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceCatalog } from "@/hooks/use-service-catalog";
import { getCustomServiceLabel } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Review = Database["public"]["Tables"]["service_name_reviews"]["Row"];

const ReviewEntry = ({ entry, onDone }: { entry: Review; onDone: () => Promise<void> }) => {
  const catalog = useServiceCatalog();
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [service, setService] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newService, setNewService] = useState("");
  const [busy, setBusy] = useState(false);
  const options = catalog.getCategory(category)?.services.filter(s => s.label !== "Other") ?? [];
  const save = async (action: "approve" | "reject") => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("review_other_service_name", { _id: entry.id, _action: action, _category: category === "new" ? undefined : category, _service: service === "new" ? undefined : service, _new_category: category === "new" ? newCategory.trim() : undefined, _new_service: service === "new" || category === "new" ? newService.trim() : undefined });
      if (error) throw error;
      await onDone();
      toast({ title: action === "approve" ? "Approved and listings updated" : "Name rejected", description: action === "reject" ? "Existing listings keep their original names." : undefined });
    } catch (e) { toast({ title: "Unable to review entry", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const canApprove = category === "new" ? newCategory.trim() && newService.trim() : category && (service === "new" ? newService.trim() : service);
  return <article className="rounded-lg border border-border bg-card p-4 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0"><h3 className="font-semibold break-words">{getCustomServiceLabel(entry.source_value)}</h3><p className="text-xs text-muted-foreground mt-1">Submitted under {catalog.getLabel(entry.source_category)} · {new Date(entry.created_at).toLocaleDateString()}</p></div>
      <Badge variant={entry.status === "approved" ? "default" : "secondary"}>{entry.status}</Badge>
    </div>
    {entry.status === "pending" ? <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor={`cat-${entry.id}`}>Approved category</Label><Select value={category} onValueChange={value => { setCategory(value); setService(""); }}><SelectTrigger id={`cat-${entry.id}`}><SelectValue placeholder="Map to a category" /></SelectTrigger><SelectContent>{catalog.categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>)}<SelectItem value="new"><span className="flex items-center gap-2"><Plus className="h-3 w-3" />Create new category</span></SelectItem></SelectContent></Select>{category === "new" && <Input aria-label="New category name" maxLength={120} placeholder="New category name" value={newCategory} onChange={e => setNewCategory(e.target.value)} />}</div>
        <div className="space-y-2"><Label htmlFor={`service-${entry.id}`}>Approved service</Label>{category !== "new" && <Select value={service} onValueChange={setService} disabled={!category}><SelectTrigger id={`service-${entry.id}`}><SelectValue placeholder="Map to a service" /></SelectTrigger><SelectContent>{options.map(s => <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>)}<SelectItem value="new">Create new service</SelectItem></SelectContent></Select>}{(category === "new" || service === "new") && <Input id={`service-${entry.id}`} aria-label="New service name" maxLength={120} placeholder="New service name" value={newService} onChange={e => setNewService(e.target.value)} />}</div>
      </div>
      <div className="flex gap-2"><Button size="sm" disabled={busy || !canApprove || !!catalog.error} onClick={() => save("approve")}><Check className="h-4 w-4 mr-1" />{busy ? "Saving…" : "Approve & map"}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => save("reject")}><X className="h-4 w-4 mr-1" />Reject name</Button></div>
    </> : <p className="text-sm text-muted-foreground">{entry.status === "approved" ? `Mapped to ${catalog.getLabel(entry.target_category)} / ${catalog.getLabel(entry.target_service)}` : "Not added to the catalog"}</p>}
  </article>;
};

const AdminCatalogTab = () => {
  const client = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["admin-name-reviews", status, page], queryFn: async () => {
    const { data, error, count } = await supabase.from("service_name_reviews").select("*", { count: "exact" }).eq("status", status).order("created_at", { ascending: false }).range(page * 20, page * 20 + 19);
    if (error) throw error;
    return { entries: data, count: count ?? 0 };
  }, staleTime: 30_000 });
  const onDone = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["admin-name-reviews"] }), client.invalidateQueries({ queryKey: ["service-catalog"] }), client.invalidateQueries({ queryKey: ["listings"] }), client.invalidateQueries({ queryKey: ["admin-listings"] }), client.invalidateQueries({ queryKey: ["listing"] }), client.invalidateQueries({ queryKey: ["edit-listing"] })]); };
  const entries = (query.data?.entries ?? []).filter(e => e.source_value.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5">
    <div className="flex items-center gap-3"><Tags className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">Category & service review</h2><Button className="ml-auto" variant="outline" size="icon" aria-label="Refresh name reviews" onClick={() => query.refetch()}><RefreshCw className="h-4 w-4" /></Button></div>
    <div className="flex flex-wrap gap-2">{["pending", "approved", "rejected"].map(s => <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => { setStatus(s); setPage(0); }}>{s.charAt(0).toUpperCase() + s.slice(1)}</Button>)}<Input className="sm:ml-auto sm:w-64" aria-label="Search current review page" placeholder="Search this page" value={search} onChange={e => setSearch(e.target.value)} /></div>
    {query.isLoading ? <p className="py-10 text-muted-foreground">Loading submissions…</p> : query.error ? <p role="alert" className="text-destructive">Unable to load submissions. Please retry.</p> : !entries.length ? <p className="py-10 text-center text-muted-foreground">No {status} names{search ? " match this search" : " to review"}.</p> : entries.map(entry => <ReviewEntry key={entry.id} entry={entry} onDone={onDone} />)}
    <div className="flex items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">{query.data?.count ?? 0} {status} submissions</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={(page + 1) * 20 >= (query.data?.count ?? 0)} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
  </div>;
};
export default AdminCatalogTab;