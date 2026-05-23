import StaticPage from "@/components/StaticPage";
import { Lock } from "lucide-react";

const Escrow = () => (
  <StaticPage
    title="Escrow Protection — ShareKart Trust & Safety"
    description="How ShareKart's OTP-based handover and order tracking protect both buyers and sellers."
    path="/trust/escrow"
    heading="Escrow Protection"
  >
    <div className="flex items-center gap-2 text-primary">
      <Lock className="h-5 w-5" />
      <span className="font-semibold">Safe handovers, every time</span>
    </div>
    <p>
      ShareKart uses an OTP-based handover system to protect both parties in every transaction.
      When an order is placed, a one-time passcode is generated and shared only with the buyer.
      The seller confirms handover by entering the OTP — this proves the item changed hands.
    </p>
    <h2 className="text-xl font-bold mt-6">How it works</h2>
    <ol className="list-decimal pl-6 space-y-2">
      <li>Buyer places an order and an OTP is generated</li>
      <li>Buyer and seller coordinate handover via in-app chat</li>
      <li>At the meeting, buyer shares the OTP with seller</li>
      <li>Seller enters the OTP to mark the order complete</li>
      <li>Buyer can then leave a verified review</li>
    </ol>
    <p>
      Orders not completed within 48 hours are automatically cancelled, protecting buyers from
      ghosting and freeing inventory for other interested neighbors.
    </p>
  </StaticPage>
);

export default Escrow;
