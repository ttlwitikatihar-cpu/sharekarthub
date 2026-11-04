import { describe, expect, it } from "vitest";
import { isListingVisibleInMarketplace } from "@/lib/listing-visibility";

describe("seller listing visibility", () => {
  it("keeps out-of-stock listings visible until the seller hides them", () => {
    expect(isListingVisibleInMarketplace({ status: "out_of_stock", is_hidden: false })).toBe(true);
    expect(isListingVisibleInMarketplace({ status: "out_of_stock", is_hidden: true })).toBe(false);
  });

  it("does not show inactive listings in the marketplace", () => {
    expect(isListingVisibleInMarketplace({ status: "inactive", is_hidden: false })).toBe(false);
  });
});