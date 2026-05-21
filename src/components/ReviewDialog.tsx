import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  reviewerId: string;
  onSubmitted?: () => void;
}

const MAX_COMMENT = 500;

const ReviewDialog = ({ open, onOpenChange, listingId, listingTitle, reviewerId, onSubmitted }: ReviewDialogProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setHover(0);
    setComment("");
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length > MAX_COMMENT) {
      toast({ title: `Comment must be under ${MAX_COMMENT} characters`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      listing_id: listingId,
      reviewer_id: reviewerId,
      rating,
      comment: trimmed || null,
    });
    setSubmitting(false);

    if (error) {
      const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
      toast({
        title: dup ? "You've already reviewed this item" : "Couldn't submit review",
        description: dup ? undefined : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Thanks for your feedback!", description: "Your review has been published." });
    reset();
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your experience</DialogTitle>
          <DialogDescription className="truncate">How was "{listingTitle}"?</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1 py-2" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                role="radio"
                aria-checked={rating === n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star className={`h-8 w-8 ${active ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
              </button>
            );
          })}
        </div>

        <Textarea
          placeholder="Share what went well or what could improve (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          maxLength={MAX_COMMENT}
          rows={4}
          aria-label="Review comment"
        />
        <p className="text-xs text-muted-foreground text-right">{comment.length}/{MAX_COMMENT}</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? "Submitting..." : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
