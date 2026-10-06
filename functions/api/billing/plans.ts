import type { AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { paypalPlanDetails } from "../../_lib/paypal"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const results = await Promise.allSettled([
    paypalPlanDetails(context.env, "month"),
    paypalPlanDetails(context.env, "year"),
  ])
  const unavailable = (result: PromiseRejectedResult) => ({
    configured: false as const,
    error:
      result.reason instanceof Error
        ? result.reason.message
        : "PayPal plan is unavailable",
  })
  const fullyConfigured = results.every((result) => result.status === "fulfilled")
  return json(
    {
      data: {
        month:
          results[0].status === "fulfilled"
            ? results[0].value
            : unavailable(results[0]),
        year:
          results[1].status === "fulfilled"
            ? results[1].value
            : unavailable(results[1]),
      },
    },
    200,
    fullyConfigured
      ? { "Cache-Control": "public, max-age=300" }
      : { "Cache-Control": "no-store" },
  )
}
