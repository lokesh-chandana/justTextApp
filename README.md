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

On Vercel, set `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET` in Project
Settings → Environment Variables, then redeploy.

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
