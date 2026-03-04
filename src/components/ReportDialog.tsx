import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ReportDialogProps {
  reportedUserId?: string;
  reportedListingId?: string;
  triggerVariant?: "icon" | "button";
}

const REASONS = [
  "Spam or fake listing",
  "Inappropriate content",
  "Fraud or scam",
  "Misleading information",
  "Harassment",
  "Other",
];

const ReportDialog = ({ reportedUserId, reportedListingId, triggerVariant = "button" }: ReportDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setLoading(true);
    const { error } = await (supabase as any).from("reports").insert({
      reported_by: user.id,
      reported_user_id: reportedUserId || null,
      reported_listing_id: reportedListingId || null,
      reason,
      details: details || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to submit report", variant: "destructive" });
    } else {
      toast({ title: "Report submitted", description: "We'll review this shortly." });
      setOpen(false);
      setReason("");
      setDetails("");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "icon" ? (
          <Button size="icon" variant="ghost" title="Report">
            <Flag className="h-4 w-4 text-destructive" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1 text-destructive">
            <Flag className="h-3.5 w-3.5" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report {reportedListingId ? "Listing" : "User"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
            <SelectContent>
              {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Additional details (optional)..." value={details} onChange={e => setDetails(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!reason || loading}>
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
