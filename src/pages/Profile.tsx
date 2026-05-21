import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Upload, AlertCircle, CheckCircle2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [shopName, setShopName] = useState("");

  // KYC fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setBio(profile.bio || "");
      setProfileLocation(profile.location || "");
      setShopName((profile as any).shop_name || "");
      setAddress((profile as any).address || "");
      setCity((profile as any).city || "");
      setState((profile as any).state || "");
      setPincode((profile as any).pincode || "");
      setIdType((profile as any).id_type || "");
      setIdNumber((profile as any).id_number || "");
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Sign in to view your profile.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        phone,
        bio,
        location: profileLocation,
        shop_name: shopName || null,
      } as any).eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Profile updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !city || !state || !pincode || !idType || !idNumber) {
      toast({ title: "Fill all KYC fields", variant: "destructive" });
      return;
    }
    setKycSubmitting(true);
    try {
      let docUrl: string | null = null;
      if (kycFile) {
        const ext = kycFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("kyc-documents").upload(path, kycFile);
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);
        docUrl = data.publicUrl;
      }

      const updateData: Record<string, any> = {
        address,
        city,
        state,
        pincode,
        id_type: idType,
        id_number: idNumber,
        kyc_status: "pending",
        kyc_submitted_at: new Date().toISOString(),
      };
      if (docUrl) updateData.kyc_document_url = docUrl;

      const { error } = await supabase.from("profiles").update(updateData).eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "KYC submitted!", description: "Your verification is under review." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setKycSubmitting(false);
    }
  };

  const kycStatus = profile?.kyc_status || "unverified";

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="My Profile — ShareKart Account Settings" description="Manage your ShareKart profile, shop details, KYC verification, and contact information." path="/profile" noindex />
      <Navbar />
      <main className="container flex-1 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Profile Section */}
          <div>
            <h1 className="text-2xl font-bold mb-1">My Profile</h1>
            <p className="text-sm text-muted-foreground mb-6">Manage your account details.</p>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="e.g. Mumbai, MH" value={profileLocation} onChange={(e) => setProfileLocation(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Store className="h-4 w-4" /> Shop Name <span className="text-xs text-muted-foreground">(optional — for businesses)</span>
                </Label>
                <Input placeholder="e.g. Krishna Electronics" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea placeholder="Tell others about yourself..." rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
            </form>
          </div>

          <Separator />

          {/* KYC Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold">KYC Verification</h2>
              {kycStatus === "verified" && (
                <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </Badge>
              )}
              {kycStatus === "pending" && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> Pending Review
                </Badge>
              )}
              {kycStatus === "unverified" && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Not Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">Complete address and ID verification to build trust and unlock all features.</p>

            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Address</Label>
                <Textarea placeholder="House no., Street, Area..." rows={2} value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input placeholder="Maharashtra" value={state} onChange={(e) => setState(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input placeholder="400001" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Select value={idType} onValueChange={setIdType} required>
                    <SelectTrigger><SelectValue placeholder="Select ID" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                      <SelectItem value="pan">PAN Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_license">Driving License</SelectItem>
                      <SelectItem value="voter_id">Voter ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input placeholder="XXXX XXXX XXXX" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Upload ID Document (optional)</Label>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setKycFile(e.target.files?.[0] || null)} />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm text-muted-foreground">{kycFile ? kycFile.name : "Click to upload ID document"}</p>
                </div>
              </div>
              <Button type="submit" disabled={kycSubmitting || kycStatus === "verified"}>
                {kycSubmitting ? "Submitting..." : kycStatus === "verified" ? "Already Verified" : kycStatus === "pending" ? "Re-submit KYC" : "Submit for Verification"}
              </Button>
            </form>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
