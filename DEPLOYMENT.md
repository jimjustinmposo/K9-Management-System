# Accounts and billing setup

## Cloudflare D1

1. Replace the placeholder D1 database ID in `wrangler.toml`.
2. Apply all migrations, including `0005_accounts_and_billing.sql`, to preview and production.
3. The first workspace whose Stripe subscription becomes active claims existing K9 rows that have no workspace.

## Stripe

Create one product with monthly and yearly recurring base prices, and one extra-member product with monthly and yearly licensed recurring prices. Add the four Price IDs and the Stripe secret key as Cloudflare Pages secrets using the names in `.dev.vars.example`.

Enable the Stripe customer portal for payment-method changes, invoice history, and cancellation. Register this webhook endpoint:

`https://YOUR_DOMAIN/api/billing/webhook`

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Store its signing secret as `STRIPE_WEBHOOK_SECRET`. Use Stripe test keys and test Price IDs in preview, and separate live values in production.

Use a restricted Stripe key (`rk_`) with only the Customer, Checkout Session, Billing Portal, Price, Subscription, and Subscription Item permissions needed by the integration. The app pins Stripe API version `2026-07-29.dahlia` on REST requests.

### Invoicing and recovery

Stripe Billing automatically creates invoices for subscriptions. Configure invoice branding, Smart Retries, failed-payment emails, and automatic card updates in the Stripe Dashboard. Keep the Customer Portal enabled for invoice history, payment methods, and cancellation.

### Stripe Tax

Do not set `STRIPE_TAX_ENABLED=true` until all of the following are complete:

1. Set the business head-office address in Stripe Tax settings.
2. Confirm the correct SaaS product tax code with a tax adviser and apply it to both Stripe products.
3. Set explicit tax behavior on all four Prices.
4. Add at least one active Stripe Tax registration where the business must collect tax.
5. Run test-mode Checkout sessions and verify the taxability reason and customer address.

After those checks, set `STRIPE_TAX_ENABLED=true`. Checkout then collects a billing address and enables automatic tax. Stripe Tax does not file returns automatically; configure a filing partner or filing process separately.

## Resend

Verify the sending domain in Resend. Store the API key and a sender on that domain as `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Set `APP_URL` to the public application origin so invitation and password-reset links point to the correct deployment.

Never commit `.dev.vars` or production secrets. `.dev.vars.example` contains names only.
