import { type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { stripe, stripePrice } from "../../_lib/stripe"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  try {
    const result: Record<string, any> = {}
    for (const interval of ["month", "year"]) {
      const [base, seat] = await Promise.all([
        stripe(context.env, `prices/${stripePrice(context.env, interval)}`),
        stripe(
          context.env,
          `prices/${stripePrice(context.env, interval, true)}`,
        ),
      ])
      result[interval] = {
        base: {
          id: base.id,
          amount: base.unit_amount,
          currency: base.currency,
        },
        seat: {
          id: seat.id,
          amount: seat.unit_amount,
          currency: seat.currency,
        },
      }
    }
    return json({ data: result })
  } catch (error) {
    return json(
      { error: "Billing plans are not configured", detail: String(error) },
      503,
    )
  }
}
