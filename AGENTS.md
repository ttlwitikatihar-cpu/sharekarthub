- Store user-entered service options in the existing `service_subcategory` text field with a `custom:` prefix, and parse that format centrally so unlisted services do not require schema changes.

- Load the approved service catalog through one cached query and merge it with the baseline catalog so new entries appear consistently without per-card requests.
- Capture Other service names in a deduplicated review queue and apply admin mappings atomically through a role-validated database function to prevent unauthorized catalog edits.
- Keep search interests account-scoped in browser storage with bounded history and expiry; rank listings locally to avoid extra homepage requests.
- Use the shared seller directory for item cards rather than one profile request per seller to keep marketplace loading fast.
