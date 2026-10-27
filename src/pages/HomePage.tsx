import { Link } from "react-router-dom"
import { ArrowUpRight, Check, ClipboardList, Dog, HeartPulse, Users } from "lucide-react"

const planInclusions = [
  "Full K9 Management System access",
  "Cloud hosting",
  "Owner and member access",
  "Technical support",
  "SSL/HTTPS security",
]

const features = [
  { icon: Dog, title: "Know every K9", text: "Maintain individual dog profiles and keep weight, feeding and care records connected to the right animal." },
  { icon: ClipboardList, title: "Keep training organized", text: "Record obedience, detection, tracking, protection and socialization work in dedicated training registers." },
  { icon: HeartPulse, title: "Coordinate daily care", text: "Manage medical records, medications, boarding stays, grooming and food inventory in one workspace." },
  { icon: Users, title: "Work as a team", text: "Maintain your handler directory and give workspace owners and members appropriate access to operational records." },
]

export default function HomePage({ page = "home" }: { page?: "home" | "features" | "pricing" | "about" }) {
  const SectionTitle = page === "home" ? "h2" : "h1"
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#product" className="sr-only focus:not-sr-only focus:block focus:p-4">Skip to product information</a>
      <header className="border-b border-line">
        <nav aria-label="Public navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="text-lg font-semibold tracking-wide">CANINELOGY<span className="ml-2 text-gold">/</span></Link>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link to="/features" aria-current={page === "features" ? "page" : undefined}>Features</Link>
            <Link to="/pricing" aria-current={page === "pricing" ? "page" : undefined}>Pricing</Link>
            <Link to="/about" aria-current={page === "about" ? "page" : undefined}>About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login" className="button-primary">Sign in <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </nav>
      </header>
      <main id="product" className="mx-auto max-w-6xl px-6">
        {page === "home" && <section className="grid gap-12 border-b border-line py-16 md:grid-cols-[1.4fr_1fr] md:py-24" aria-labelledby="product-title">
          <div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-gold">K9 management software</p>
            <h1 id="product-title" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.05 }} className="max-w-2xl tracking-tight">More time for your dogs.<br /><span className="text-muted">Less scattered paperwork.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate">Caninelogy brings your K9 roster, training logs, medical records and daily care into one web-based workspace. Built for the people who manage dogs and the teams who care for them.</p>
            <div className="mt-8 flex flex-wrap items-center gap-5"><a href="#features" className="button-primary">Explore the system <ArrowUpRight size={16} aria-hidden="true" /></a><Link to="/login" className="text-sm underline underline-offset-4">Existing customer? Sign in</Link></div>
          </div>
          <aside className="app-panel self-center rounded-2xl border border-line bg-surface p-8" aria-label="Product overview">
            <img src="/Caninelogy.png" alt="Caninelogy" className="mb-8 max-h-24 max-w-full object-contain" />
            <p className="text-xs uppercase tracking-widest text-muted">One connected workspace</p>
            <ul className="mt-5 divide-y divide-line text-sm">
              {["K9 profiles & care history", "Training & handler records", "Medical & boarding management", "Owner reporting & team access"].map((item, index) => <li key={item} className="flex gap-4 py-4"><span className="font-mono text-gold">0{index + 1}</span>{item}</li>)}
            </ul>
          </aside>
        </section>}
        {page === "about" && <section className="max-w-3xl py-16" aria-labelledby="about-title">
          <p className="text-xs uppercase tracking-widest text-gold">K9 management software</p>
          <h1 id="about-title" className="mt-3 text-3xl font-semibold">About Caninelogy</h1>
          <p className="mt-6 text-base leading-8 text-slate">Caninelogy brings your K9 roster, training logs, medical records and daily care into one web-based workspace. Built for the people who manage dogs and the teams who care for them.</p>
          <p className="mt-4 text-base leading-8 text-slate">Manage dog profiles, training, boarding and care records, with role-based access for workspace owners and members.</p>
          <div className="mt-8 flex flex-wrap gap-5"><Link to="/features" className="button-primary">Explore features</Link><Link to="/contact" className="underline underline-offset-4">Contact support</Link></div>
        </section>}
        {(page === "home" || page === "features") && <section id="features" className="py-16" aria-labelledby="features-title">
          <p className="text-xs uppercase tracking-widest text-gold">Built around daily operations</p>
          <SectionTitle id="features-title" style={{ fontSize: "2rem" }} className="mt-3">A clear record. A coordinated team.</SectionTitle>
          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-line bg-surface p-7"><Icon size={24} className="mb-6 text-gold" aria-hidden="true" /><h3 style={{ fontSize: "1.1rem" }}>{title}</h3><p className="mt-3 text-sm leading-7 text-slate">{text}</p></article>)}
          </div>
        </section>}
        {(page === "home" || page === "pricing") && <section id="pricing" className="border-t border-line py-16" aria-labelledby="pricing-title">
          <p className="text-xs uppercase tracking-widest text-gold">Subscription plans</p>
          <SectionTitle id="pricing-title" style={{ fontSize: "2rem" }} className="mt-3">Choose your billing interval.</SectionTitle>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate">Both plans include access to the K9 management system for one owner and up to five active members. All prices are in USD. Taxes are calculated at checkout. New paid subscriptions are not available on this public page.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[{ name: "Monthly", amount: "$41", interval: "per month", detail: "Billed every month" }, { name: "Yearly", amount: "$443", interval: "per year", detail: "Billed yearly" }].map((plan) => (
              <article key={plan.name} className="rounded-xl border border-line bg-surface p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3>{plan.name}</h3>
                  {plan.name === "Yearly" && <span className="rounded-full bg-positive-soft px-3 py-1 text-xs font-semibold text-positive">10% discount</span>}
                </div>
                <p className="my-5"><strong className="text-4xl font-semibold">{plan.amount}</strong><span className="ml-3 text-sm text-muted">{plan.interval}</span></p>
                <p className="text-sm text-slate">{plan.detail}</p>
              </article>
            ))}
          </div>
          <div className="app-panel mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h3 style={{ fontSize: "1.1rem" }}>What's included in both plans</h3>
            <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {planInclusions.map((inclusion) => (
                <li key={inclusion} className="flex items-start gap-3 text-sm leading-6 text-slate">
                  <Check size={18} className="mt-1 shrink-0 text-positive" aria-hidden="true" />
                  <span>{inclusion}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-line pt-6">
              <h3>Owner and Member Access</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate">Includes one owner and up to five active members with role-based permissions.</p>
            </div>
          </div>
        </section>}
      </main>
      <footer className="border-t border-line px-6 py-7">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 text-sm text-muted">
          <span>Caninelogy · K9 management software</span>
          <nav aria-label="Policies and support" className="flex flex-wrap gap-x-5 gap-y-3">
            <Link to="/terms" className="underline underline-offset-4">Terms and Conditions</Link>
            <Link to="/privacy-policy" className="underline underline-offset-4">Privacy Policy</Link>
            <Link to="/refund-policy" className="underline underline-offset-4">Refund and Cancellation Policy</Link>
            <Link to="/contact" className="underline underline-offset-4">Contact support</Link>
            <Link to="/login" className="underline underline-offset-4">Customer sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}