

# Fix Plan: Auth, Order/Stock Management, Notifications, and Out-of-Stock Display

## Issues Identified

1. **Login/Signup buttons get disabled permanently** -- The `loading` state is shared across all auth actions (login, signup, Google). If Google sign-in redirects the page, `setLoading(false)` never runs, leaving buttons disabled on return.

2. **Orders deduct stock even when cancelled/incomplete** -- The `decrement_listing_quantity` trigger fires on INSERT into `orders`, immediately reducing stock. When orders are cancelled, the `cancelOrder` function only updates the order status but does NOT restore the listing quantity.

3. **Out-of-stock listings disappear from browse** -- The RLS policy on `listings` only allows SELECT where `status = 'active'` (or owner/admin). Out-of-stock items are invisible to all other users.

4. **Notifications not showing details** -- The `NotificationBell` popover shows notifications but has no click-through or detailed alert behavior for stock-out events.

---

## Plan

### 1. Fix Auth Page (disabled buttons)

- Use separate `loading` states per action (or reset loading on component mount/tab switch)
- Add a `useEffect` that resets `loading = false` when the component mounts (handles the case where Google OAuth redirects back)
- Ensure each form submission only disables its own button

### 2. Fix Order Cancellation to Restore Stock

- Update the `cancelOrder` function in `Orders.tsx` to also restore listing quantity by calling a database update on the listing, OR (better approach):
- Update the `notify_on_order_change` trigger function to restore stock when an order is cancelled. This way both manual cancellation and auto-expiry cancellation consistently restore stock.
- The `cancel_expired_orders` function already restores stock, but manual cancellation in `Orders.tsx` does not. The cleanest fix is to add stock restoration logic to the `notify_on_order_change` trigger when status changes to `cancelled`.

**Database migration:**
```sql
CREATE OR REPLACE FUNCTION public.notify_on_order_change() ...
  -- Add inside the 'cancelled' status change block:
  -- Restore listing quantity
  UPDATE public.listings
  SET quantity = quantity + OLD.quantity,
      status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END
  WHERE id = NEW.listing_id;
```

### 3. Show Out-of-Stock Listings (with disabled state)

**Database migration:**
- Update the RLS SELECT policy on `listings` to also allow viewing `out_of_stock` items:
```sql
DROP POLICY "Active listings are viewable by everyone" ON public.listings;
CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT
USING (status IN ('active', 'out_of_stock') OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
```

**Frontend changes:**
- Update `Index.tsx` query to fetch both `active` and `out_of_stock` listings (remove `.eq("status", "active")`, use `.in("status", ["active", "out_of_stock"])`)
- Update `ItemCard.tsx` to show a visual disabled/greyed-out state for out-of-stock items with a "Notify me when available" option (or just clear "Out of Stock" overlay)
- `ItemDetail.tsx` already handles out-of-stock display correctly

### 4. Improve Notification Bell

- Make notification items clickable -- navigate to relevant order when clicked
- Add a "Notify me when available" button on out-of-stock items that creates a subscription (or uses existing stock notification trigger to alert interested buyers)
- Ensure stock-out notifications include the listing title (already done in the trigger)

---

## Technical Details

### Files to modify:
1. **`src/pages/Auth.tsx`** -- Reset loading state on mount; separate loading per action
2. **`src/pages/Orders.tsx`** -- No change needed if we fix stock restoration in the DB trigger
3. **`src/pages/Index.tsx`** -- Change query to include `out_of_stock` listings
4. **`src/components/ItemCard.tsx`** -- Add greyed-out overlay and "Out of Stock" indicator for disabled items
5. **`src/components/NotificationBell.tsx`** -- Make notifications clickable to navigate to orders
6. **Database migration** -- Update `notify_on_order_change` to restore stock on cancellation; update listings RLS policy to show out-of-stock items

### Database migration SQL:
- Alter the `notify_on_order_change` function to restore listing quantity when order status changes to `cancelled`
- Update the listings SELECT RLS policy to include `out_of_stock` status
- Add a `stock_watchers` table (optional) for "notify when available" feature -- users can subscribe to be notified when an out-of-stock item returns

