# Accounts and deployment setup

## Cloudflare D1

Apply every migration to preview and production. The authentication schema stores users, workspaces, memberships, sessions, invitations, password resets, and subscription access state.

The current release has no payment-provider integration. Workspaces remain view-only until a replacement billing provider is implemented and verifies an active subscription.

## Resend

Verify the sending domain in Resend. Store the API key and a sender on that domain as `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Set `APP_URL` to the public application origin so invitation and password-reset links point to the correct deployment.

Never commit `.dev.vars` or production secrets. `.dev.vars.example` contains names only.

## Google and Facebook login

Apply migration `0012_oauth_accounts.sql`, then configure these Cloudflare Pages secrets/variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `APP_URL`

Register these exact production callback URLs with the providers:

- Google: `https://martina-k9-management-system.pages.dev/api/auth/oauth/callback/google`
- Facebook: `https://martina-k9-management-system.pages.dev/api/auth/oauth/callback/facebook`

For local Pages development, register the equivalent callback URLs using the local `wrangler pages dev` origin. Social login requires Pages Functions and is not emulated by plain `vite dev`.
