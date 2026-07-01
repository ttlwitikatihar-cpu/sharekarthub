import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    listing?: { title?: string };
  };
}

const CATEGORIES = [
  { value: "delivery", label: "Delivery / Handover issue" },
  { value: "quality", label: "Item quality / Not as described" },
  { value: "refund", label: "Refund / Deposit not returned" },
  { value: "payment", label: "Payment problem" },
  { value: "behavior", label: "Seller / Buyer misbehavior" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const RaiseTicketDialog = ({ open, onOpenChange, order }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("delivery");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setSubject(""); setDescription(""); setCategory("delivery"); setPriority("medium");
  };

  const submit = async () => {
    if (!user) return;
    const trimmedSubject = subject.trim();
    const trimmedDesc = description.trim();
    if (trimmedSubject.length < 5 || trimmedSubject.length > 120) {
      toast({ title: "Subject must be 5–120 characters", variant: "destructive" }); return;
    }
    if (trimmedDesc.length < 20 || trimmedDesc.length > 2000) {
      toast({ title: "Please describe the issue in 20–2000 characters", variant: "destructive" }); return;
    }
    const against = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
    if (against === user.id) {
      toast({ title: "You can't raise a ticket against yourself", variant: "destructive" }); return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        order_id: order.id,
        listing_id: order.listing_id,
        raised_by: user.id,
        against_user_id: against,
        subject: trimmedSubject,
        category,
        priority,
        description: trimmedDesc,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Failed to raise ticket", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ticket raised", description: "The other party and our team have been notified." });
    reset();
    onOpenChange(false);
    navigate(`/tickets/${data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" /> Raise a Support Ticket
          </DialogTitle>
          <DialogDescription>
            Report a problem with your order "{order.listing?.title || "this order"}". Both parties and our support team will be able to reply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
              maxLength={120} placeholder="Short summary of the issue" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Issue category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ticket-desc">Describe the issue</Label>
            <Textarea id="ticket-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={2000} rows={5}
              placeholder="Provide as much detail as possible: what happened, dates, amounts, expected vs actual, etc." />
            <p className="text-[10px] text-muted-foreground mt-1">{description.length}/2000</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Raising..." : "Raise Ticket"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RaiseTicketDialog;
