import StaticPage from "@/components/StaticPage";
import { ShieldCheck } from "lucide-react";

const KYC = () => (
  <StaticPage
    title="KYC Verification — ShareKart Trust & Safety"
    description="Learn how ShareKart's KYC verification keeps the marketplace safe through identity verification."
    path="/trust/kyc"
    heading="KYC Verification"
  >
    <div className="flex items-center gap-2 text-primary">
      <ShieldCheck className="h-5 w-5" />
      <span className="font-semibold">Verified community, trusted trades</span>
    </div>
    <p>
      Every seller on ShareKart goes through Know Your Customer (KYC) verification. We collect a
      government-issued ID and verify it against your profile before you can list items for sale,
      rent, or donation.
    </p>
    <h2 className="text-xl font-bold mt-6">Why KYC?</h2>
    <ul className="list-disc pl-6 space-y-2">
      <li>Prevents fake accounts and fraudulent listings</li>
      <li>Builds trust between buyers and sellers</li>
      <li>Enables accountability if disputes arise</li>
      <li>Protects the entire community</li>
    </ul>
    <h2 className="text-xl font-bold mt-6">How to verify</h2>
    <p>
      Go to your <a href="/profile" className="text-primary hover:underline">Profile</a>, upload a
      clear photo of your government ID, and wait for admin review (usually within 24 hours).
    </p>
  </StaticPage>
);

export default KYC;
