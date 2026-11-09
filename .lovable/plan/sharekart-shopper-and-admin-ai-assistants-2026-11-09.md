# ShareKart shopper and admin AI assistants

## What will be added
- A ShareKart Help assistant for broad marketplace questions and finding live listings, with one conversation saved in the current browser.
- A separate assistant tab in the admin panel that can suggest catalog-review mappings and platform commission updates. It will show the exact effect and require an explicit apply confirmation before changing data.
- A clear boundary for whole-site code or layout edits: the admin assistant may draft recommendations, but executable site changes remain reviewed and published through the normal build workflow.

## Implementation approach
- Call the workspace AI Gateway only from protected Lovable Cloud functions; keep prompts and credentials out of browser code.
- Let the shopper function search only active or out-of-stock, non-hidden listing fields, returning real item links and no private seller details.
- Recheck the caller's admin role in the admin function. Use existing role-validated catalog review behavior and admin-only settings access for confirmed changes; do not expose arbitrary SQL, code execution, account deletion, or unbounded writes to the model.
- Use AI Elements for chat messages, scrolling, markdown, prompt input, and loading state. Keep shopper history in localStorage and admin chat ephemeral.

## Validation
- Typecheck and run relevant tests, inspect the current build log, and exercise the shopper chat plus the confirmed admin recommendation flow where credentials and preview access allow.
- If authenticated admin execution cannot be verified, report that limit clearly rather than claiming it was tested.
