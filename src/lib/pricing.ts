// Platform commission & refund calculator
// Commission is OPTIONAL — owner toggles it on/off and configures rates in Admin → Settings.
// Rentals: configurable platform commission; full security deposit refundable on return
// Sales: configurable platform commission
// Donations: never any commission

export interface PlatformSettings {
  commission_enabled: boolean;
  rent_commission_rate: number;
  sell_commission_rate: number;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  commission_enabled: false,
  rent_commission_rate: 0.10,
  sell_commission_rate: 0.05,
};

export interface PricingBreakdown {
  subtotal: number;
  commissionEnabled: boolean;
  commissionRate: number;
  commission: number;
  refundableDeposit: number;
  buyerPays: number;
  sellerReceives: number;
  refundOnReturn: number;
}

export const calculatePricing = (opts: {
  category: string;
  price: number;
  quantity: number;
  securityDeposit?: number;
  settings?: PlatformSettings;
}): PricingBreakdown => {
  const { category, price, quantity } = opts;
  const settings = opts.settings ?? DEFAULT_SETTINGS;
  const deposit = opts.securityDeposit ?? 0;

  let rate = 0;
  if (settings.commission_enabled) {
    if (category === "rent") rate = settings.rent_commission_rate;
    else if (category === "sell") rate = settings.sell_commission_rate;
  }

  const subtotal = (price || 0) * (quantity || 1);
  const commission = Math.round(subtotal * rate * 100) / 100;
  const refundableDeposit = category === "rent" ? deposit * quantity : 0;
  return {
    subtotal,
    commissionEnabled: settings.commission_enabled && rate > 0,
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
