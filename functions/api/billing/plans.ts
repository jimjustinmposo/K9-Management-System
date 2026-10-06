import type { AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"

export const onRequestGet: PagesFunction<AppEnv> = async (context) =>
  json({
    data: {
      month: { amount: 15000, currency: "AED", configured: Boolean(context.env.PAYPAL_MONTHLY_PLAN_ID) },
      year: { amount: 162000, currency: "AED", configured: Boolean(context.env.PAYPAL_YEARLY_PLAN_ID) },
    },
  })
