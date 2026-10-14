# Security Specification for Rawaq (رواق)

## Data Invariants
1. A store owner's personal phone number is strictly stored in `/store_applications` and NEVER exposed in public `/stores` or `/products` documents.
2. A store cannot have `isVerified: true` or `status: 'active'` created directly by a general public user; verification is granted exclusively via the admin review workflow.
3. Only the designated administrator account (`azhyr2913@gmail.com` or verified admin document in `/admins/{adminId}`) has privileges to access the Developer Dashboard and approve/reject stores.
4. Product prices and order items are snapshotted in each Order document at purchase time. Historical order totals are immutable to ensure tamper-proof accounting.
5. In-app chat messages can only be viewed and authored by the participating buyer and the store owner, preserving private communications.
6. Only the developer/administrator can modify global application configurations (such as developer WhatsApp contact and marketplace cities).
