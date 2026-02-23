import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["edit-listing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setDescription(listing.description || "");
      setCategory(listing.category);
      setPrice(String(listing.price ?? ""));
      setDeposit(String(listing.security_deposit ?? ""));
      setLocation(listing.location || "");
      setCondition(listing.condition || "good");
      setQuantity(String((listing as any).quantity ?? 1));
      setExistingImages(listing.images || []);
    }
  }, [listing]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = existingImages.length + newImageFiles.length + files.length;
    if (total > 5) {
      toast({ title: "Max 5 images total", variant: "destructive" });
      return;
    }
    const updated = [...newImageFiles, ...files];
    setNewImageFiles(updated);
    setNewImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    const updated = newImageFiles.filter((_, i) => i !== index);
    setNewImageFiles(updated);
    setNewImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  const uploadNewImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of newImageFiles) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("listing-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">You need to sign in.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>
        <Footer />
      </div>
    );
  }

  if (listing && listing.user_id !== user.id) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">You can only edit your own listings.</div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uploadedUrls = newImageFiles.length > 0 ? await uploadNewImages() : [];
      const allImages = [...existingImages, ...uploadedUrls];

      const { error } = await supabase.from("listings").update({
        title,
        description,
        category,
        price: category === "donate" ? 0 : Number(price),
        security_deposit: category === "rent" ? Number(deposit) : 0,
        location,
        condition: condition || "good",
        quantity: Number(quantity) || 1,
        images: allImages,
        status: Number(quantity) > 0 ? "active" : "out_of_stock",
      }).eq("id", id!);

      if (error) throw error;
      toast({ title: "Listing updated!" });
      navigate(`/item/${id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalImages = existingImages.length + newImageFiles.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-8 max-w-2xl">
        <Link to={`/item/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Edit Listing</h1>
          <p className="text-sm text-muted-foreground mb-6">Update your listing details.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Canon EOS R5 Camera" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">For Rent</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="donate">Donate (Free)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price {category === "donate" && "(N/A)"}</Label>
                <Input type="number" placeholder="₹0" disabled={category === "donate"} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Security Deposit</Label>
                <Input type="number" placeholder="₹0" disabled={category !== "rent"} value={deposit} onChange={(e) => setDeposit(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g. Mumbai, MH" value={location} onChange={(e) => setLocation(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="0" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like-new">Like New</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe your item..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Photos (up to 5)</Label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              {(existingImages.length > 0 || newImagePreviews.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                  {existingImages.map((src, i) => (
                    <div key={`ex-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {newImagePreviews.map((src, i) => (
                    <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {totalImages < 5 && (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to add photos</p>
                </div>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading || !category}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default EditListing;
