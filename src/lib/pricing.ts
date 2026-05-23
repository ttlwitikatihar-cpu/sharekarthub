// Platform commission & refund calculator
// Rentals: 10% platform commission on rent; full security deposit refundable on return
// Sales: 5% platform commission
// Donations: no commission

export const COMMISSION_RATES = {
  rent: 0.10,
  sell: 0.05,
  donate: 0,
} as const;

export interface PricingBreakdown {
  subtotal: number;
  commissionRate: number;
  commission: number;
  refundableDeposit: number;
  buyerPays: number;        // amount buyer pays upfront (subtotal + deposit)
  sellerReceives: number;   // subtotal - commission
  refundOnReturn: number;   // deposit returned to buyer on successful return
}

export const calculatePricing = (opts: {
  category: string;
  price: number;
  quantity: number;
  securityDeposit?: number;
}): PricingBreakdown => {
  const { category, price, quantity } = opts;
  const deposit = opts.securityDeposit ?? 0;
  const rate = (COMMISSION_RATES as any)[category] ?? 0;
  const subtotal = (price || 0) * (quantity || 1);
  const commission = Math.round(subtotal * rate * 100) / 100;
  const refundableDeposit = category === "rent" ? deposit * quantity : 0;
  return {
    subtotal,
    commissionRate: rate,
    commission,
    refundableDeposit,
    buyerPays: subtotal + refundableDeposit,
    sellerReceives: subtotal - commission,
    refundOnReturn: refundableDeposit,
  };
};

export const formatINR = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
