import { Link } from "react-router-dom"
import ThemeToggle from "../components/ThemeToggle"

const policies = {
  terms: {
    title: "Terms of Service",
    sections: [
      ["Ownership and scope", "Caninelogy’s K9 Management System is owned and operated by Jim Justin M. Poso in the United Arab Emirates. These Terms of Service govern the use of the platform and services provided by Jim Justin M. Poso. For support, contact jimjustinmposo@gmail.com."],
      ["Using the service", "Caninelogy’s K9 Management System helps you organise K9 records, care and team activities. Use the service lawfully, keep your sign-in details secure and only upload information you are authorised to manage."],
      ["Your workspace", "You remain responsible for the accuracy of your records and the access you give team members. The service is an administrative tool, not a substitute for veterinary advice or professional judgement."],
      ["Subscriptions", "For paid plans, the price, billing interval and any trial are shown before purchase. Paddle processes purchases under its buyer terms. Recurring subscriptions renew until cancelled; cancellation and refund requests are separate actions."],
      ["Responsible access", "Do not misuse the service, interfere with its security or access another workspace without permission. Nothing in these terms excludes rights that cannot be waived under applicable law."],
    ],
  },
  privacy: {
    title: "Privacy Notice",
    sections: [
      ["Information we use", "The service processes your account name, email, sign-in credentials, workspace membership and the records you or your team enter. Billing identifiers and subscription status are used to manage paid access."],
      ["Why it is needed", "This information supports sign-in, workspace permissions, record management and subscription access. Records are available to authorised workspace members according to their roles; avoid entering unnecessary personal or sensitive information."],
      ["Service providers and storage", "Cloudflare hosts the application and database. For Paddle purchases, Paddle processes payment information under its own privacy notice. The app uses a session cookie for sign-in and browser storage for preferences and local functionality."],
      ["Managing your information", "Your workspace owner manages team access and workspace records. Contact your workspace owner about corrections or removal of records; payment-data enquiries can be directed to Paddle. Removing browser storage does not delete server-held records."],
    ],
  },
  refund: {
    title: "Refund Policy",
    sections: [
      ["Purchases through Paddle", "Refund requests for purchases processed by Paddle are reviewed under Paddle’s Refund Policy and applicable consumer law. This page does not limit any mandatory refund or withdrawal rights."],
      ["Requesting a refund", "Use the support link in your Paddle receipt or visit Paddle Buyer Support. Include your purchase email, transaction reference and a short explanation so your purchase can be located."],
      ["Cancelling renewal", "You can manage cancellation through the subscription link in your Paddle confirmation email. Cancelling future renewals does not itself request a refund for an earlier payment; submit a separate refund request if needed."],
    ],
  },
} as const

export default function LegalPage({ kind }: { kind: keyof typeof policies }) {
  const policy = policies[kind]
  const linkClass = "underline underline-offset-4 decoration-gold/60 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-ink sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 flex items-center justify-between gap-4">
          <Link to="/login" className="rounded focus-visible:outline-2 focus-visible:outline-gold">
            <img src="/Caninelogy.png" alt="Caninelogy — sign in" className="h-10 w-auto" />
          </Link>
          <ThemeToggle />
        </header>
        <article className="app-panel rounded-2xl border border-line bg-surface p-6 sm:p-9" aria-labelledby="policy-title">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">K9 Management System</p>
          <h1 id="policy-title" className="mt-2 text-3xl font-bold">{policy.title}</h1>
          <div className="mt-7 space-y-5">
            {policy.sections.map(([heading, text]) => (
              <section key={heading}>
                <h2 className="text-sm font-bold">{heading}</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted">{text}</p>
              </section>
            ))}
          </div>
          <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
            {kind === "terms" && <a className={linkClass} href="https://www.paddle.com/legal/buyer-terms">Paddle Buyer Terms</a>}
            {kind === "privacy" && <a className={linkClass} href="https://www.paddle.com/legal/privacy">Paddle Privacy Notice</a>}
            {kind === "refund" && <><a className={linkClass} href="https://www.paddle.com/legal/refund-policy">Paddle Refund Policy</a>{" · "}<a className={linkClass} href="https://paddle.net">Paddle Buyer Support</a></>}
          </p>
        </article>
        <nav aria-label="Policies" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-muted">
          {Object.entries(policies).map(([key, value]) => (
            <Link key={key} to={`/${key}`} className={linkClass} aria-current={key === kind ? "page" : undefined}>{value.title}</Link>
          ))}
        </nav>
        <p className="mt-6 flex flex-wrap justify-center gap-5 text-sm"><Link to="/" className={linkClass}>Home</Link><Link to="/contact" className={linkClass}>Contact support</Link><Link to="/login" className={linkClass}>Back to sign in</Link></p>
      </div>
    </main>
  )
}