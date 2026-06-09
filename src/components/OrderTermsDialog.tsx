import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface OrderTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  loading?: boolean;
  category?: string;
}

const OrderTermsDialog = ({ open, onOpenChange, onAccept, loading, category }: OrderTermsDialogProps) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { setAgreed(false); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Terms & Conditions
          </DialogTitle>
          <DialogDescription>
            Please read and accept before placing your {category === "rent" ? "rental" : category === "donate" ? "donation request" : "order"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm max-h-72 overflow-y-auto pr-1">
          <p>
            <strong>ShareKart is a peer-to-peer platform</strong> that helps buyers and sellers
            connect. We do <strong>not</strong> own, inspect, store, ship, or guarantee any
            listed item.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>You are transacting <strong>directly with the other user</strong>. Verify the item, condition, and identity before payment or handover.</li>
            <li>ShareKart is <strong>not liable</strong> for loss, damage, theft, injury, fraud, defects, or any dispute arising from the transaction.</li>
            <li>Escrow / online payment protection is <strong>coming soon</strong>. For now, all payments and exchanges happen offline between you and the other party.</li>
            <li>Use the in-app chat and OTP handover. Meet in safe, public places.</li>
            <li>Prohibited / illegal / counterfeit items will be removed and may be reported to authorities.</li>
            <li>You confirm you are 18+ and legally entitled to enter this transaction.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Full <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link> and{" "}
            <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
          <span className="text-sm leading-snug">
            I have read and accept the Terms. I understand ShareKart is only a platform and is
            not responsible for any loss.
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={onAccept} disabled={!agreed || loading}>
            {loading ? "Placing..." : "Accept & Place Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTermsDialog;
