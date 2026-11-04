const BROWSABLE_STATUSES = new Set(["active", "out_of_stock"]);

export const isListingVisibleInMarketplace = (listing: { status: string; is_hidden: boolean }) =>
  !listing.is_hidden && BROWSABLE_STATUSES.has(listing.status);