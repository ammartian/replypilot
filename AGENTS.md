<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:meta-whatsapp-rules -->
# Meta WhatsApp Cloud API

All WhatsApp/Meta integration work MUST reference `META_CLOUD_API_SETUP.md` in the project root before writing any code.

Key rules:
- API version: **v25.0** (latest as of Feb 2026) — do not use v22.0 or older
- Graph API base URL: `https://graph.facebook.com/v25.0`
- Route incoming messages by `metadata.phone_number_id`, never by display phone number
- Send messages using the agent's own `metaPhoneNumberId` + `metaAccessToken` (not a shared system token)
- All webhook verification must check `META_WEBHOOK_VERIFY_TOKEN` env var
- Embedded Signup flow: code → short-lived token → long-lived token (60d) — never store the raw short-lived token
- Token expiry: store `metaTokenExpiresAt` (Unix ms), warn user 7 days before expiry
- Schema fields on agents table: `metaPhoneNumberId`, `metaWabaId`, `metaAccessToken`, `metaTokenExpiresAt`
- Index required: `by_metaPhoneNumberId` on agents table for O(1) webhook routing
- Env vars: `META_APP_ID`, `META_APP_SECRET`, `META_SYSTEM_USER_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`, `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_CONFIG_ID`
- Remove all `DIALOG360_*` env vars and references when migrating
- Supported message types: text, image, audio, video, document, sticker, reaction, location, contacts, interactive (buttons, lists, media carousel), templates (marketing, utility, authentication, coupon, limited-time-offer)
- Platform also supports Groups and Calling (business/user-initiated) — check META_CLOUD_API_SETUP.md before implementing these
<!-- END:meta-whatsapp-rules -->
