import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, X, ImagePlus, Navigation, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useQuery } from "@tanstack/react-query";

const ListItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [listingType, setListingType] = useState("product");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { position, loading: geoLoading, requestLocation } = useGeolocation();

  const { data: profile } = useQuery({
    queryKey: ["my-profile-listitem", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("shop_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imageFiles.length + files.length > 5) {
      toast({ title: "Max 5 images", variant: "destructive" });
      return;
    }
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
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
            <p className="text-muted-foreground">You need to sign in to list an item.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const images = imageFiles.length > 0 ? await uploadImages() : [];

      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        title,
        description,
        category,
        listing_type: listingType,
        price: category === "donate" ? 0 : Number(price),
        security_deposit: category === "rent" ? Number(deposit) : 0,
        location,
        condition: condition || "good",
        quantity: Number(quantity) || 1,
        images,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      } as any);

      if (error) throw error;
      toast({ title: "Item listed!", description: "Your item has been published." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">List an Item</h1>
          <p className="text-sm text-muted-foreground mb-6">Share something with the community — rent it, sell it, or give it away.</p>

          {profile?.shop_name && (
            <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-4">
              <Store className="h-4 w-4 text-primary" />
              <span>Listing as <strong>{profile.shop_name}</strong></span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Canon EOS R5 Camera" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="donate">Donate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={listingType} onValueChange={setListingType}>
                  <SelectTrigger><SelectValue placeholder="Product or Service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. Mumbai, MH" value={location} onChange={(e) => setLocation(e.target.value)} required className="flex-1" />
                <Button type="button" variant="outline" size="icon" onClick={requestLocation} disabled={geoLoading} aria-label="Use my live location">
                  <Navigation className={`h-4 w-4 ${position ? "text-primary" : "text-muted-foreground"}`} />
                </Button>
              </div>
              {position && (
                <p className="text-xs text-muted-foreground">📍 GPS coordinates captured ({position.latitude.toFixed(4)}, {position.longitude.toFixed(4)})</p>
              )}
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
              <Label>Quantity</Label>
              <Input type="number" min="1" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe your item..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Photos (up to 5)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              />
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5" aria-label="Remove image">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {imageFiles.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to capture photos</p>
                </div>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading || !category}>
              {loading ? "Publishing..." : "Publish Listing"}
            </Button>
          </form>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ListItem;
