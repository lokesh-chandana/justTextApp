# WhatsApp chatbot backend

Node.js/Express webhook receiver for the Meta WhatsApp Cloud API.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set a private `WHATSAPP_VERIFY_TOKEN`. You choose this value yourself.
3. Set `WHATSAPP_APP_SECRET` to the app secret shown in the Meta dashboard.
4. Run:

   ```sh
   npm install
   npm start
   ```

The server runs at `http://localhost:3000`.

## Meta webhook settings

Deploy behind HTTPS (Vercel works), then enter these values in the Meta dashboard:

- **Callback URL:** `https://YOUR-APP.vercel.app/webhook`
- **Verify token:** the exact value of `WHATSAPP_VERIFY_TOKEN`

On Vercel, set `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, and the rotated
`WHATSAPP_ACCESS_TOKEN` in Project Settings → Environment Variables, then
redeploy. Never commit an access token.

## Supabase webhook logs

Run `supabase/migrations/20260728170000_create_webhook_logs.sql` in the
Supabase SQL Editor. Then add these Vercel environment variables:

- `SUPABASE_URL` — Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API Keys → service role key

Redeploy after adding them. Every request to `/webhook` is stored in
`webhook_logs` with its timestamp, HTTP method, and JSON data. The Meta verify
token is deliberately excluded from logs. Incoming message IDs are claimed in
`processed_messages`, preventing duplicate replies when Meta retries delivery.

Incoming messages receive `App is still in development`. The webhook sends its
HTTP acknowledgement before database logging and reply processing, preventing
retries caused by a slow Supabase request.

Run `supabase/migrations/20260728174500_create_application_logs.sql` to add
structured diagnostics. `application_logs` records signature rejection,
deduplication, reply attempts, Graph API failures, and successful message IDs.

Subscribe the webhook to the `messages` field. The GET route verifies the
callback, while Meta sends incoming events to the POST route at the same URL.

Meta cannot call `localhost`. For local development, expose port 3000 with an
HTTPS tunnel and use its `/webhook` URL.

## Hosting notes

- **Vercel:** use the repo as-is. `api/index.js` exports the Express app.
- **Apache:** `.htaccess` reverse-proxies to Node on port 3000 (`mod_rewrite` +
  `mod_proxy`). Not used on Vercel.

## Endpoints

- `GET /health` — health check
- `GET /webhook` — Meta callback verification
- `POST /webhook` — incoming WhatsApp events

Run checks with `npm test`.
