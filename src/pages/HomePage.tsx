import { Link } from "react-router-dom"
import { ArrowUpRight, Check, ClipboardList, Dog, HeartPulse, Users } from "lucide-react"

const planInclusions = [
  "Full K9 Management System access",
  "Cloud hosting",
  "Database hosting and maintenance",
  "Routine database optimization",
  "Scheduled database backups",
  "Security monitoring and updates",
  "Bug fixes and system maintenance",
  "Performance optimization",
  "Technical support",
  "Existing feature updates",
  "SSL/HTTPS security",
  "System availability monitoring",
]

const features = [
  { icon: Dog, title: "Know every K9", text: "Maintain individual dog profiles and keep weight, feeding and care records connected to the right animal." },
  { icon: ClipboardList, title: "Keep training organized", text: "Record obedience, detection, tracking, protection and socialization work in dedicated training registers." },
  { icon: HeartPulse, title: "Coordinate daily care", text: "Manage medical records, medications, boarding stays, grooming and food inventory in one workspace." },
  { icon: Users, title: "Work as a team", text: "Maintain your handler directory and give workspace owners and members appropriate access to operational records." },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#product" className="sr-only focus:not-sr-only focus:block focus:p-4">Skip to product information</a>
      <header className="border-b border-line">
        <nav aria-label="Public navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="text-lg font-semibold tracking-wide">CANINELOGY<span className="ml-2 text-gold">/</span></Link>
          <div className="flex items-center gap-6 text-sm">
            <a href="#features">Features</a><a href="#pricing">Pricing</a>
            <Link to="/login" className="button-primary">Sign in <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </nav>
      </header>
      <main id="product" className="mx-auto max-w-6xl px-6">
        <section className="grid gap-12 border-b border-line py-16 md:grid-cols-[1.4fr_1fr] md:py-24" aria-labelledby="product-title">
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
        </section>
        <section id="features" className="py-16" aria-labelledby="features-title">
          <p className="text-xs uppercase tracking-widest text-gold">Built around daily operations</p>
          <h2 id="features-title" style={{ fontSize: "2rem" }} className="mt-3">A clear record. A coordinated team.</h2>
          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-line bg-surface p-7"><Icon size={24} className="mb-6 text-gold" aria-hidden="true" /><h3 style={{ fontSize: "1.1rem" }}>{title}</h3><p className="mt-3 text-sm leading-7 text-slate">{text}</p></article>)}
          </div>
        </section>
        <section id="pricing" className="border-t border-line py-16" aria-labelledby="pricing-title">
          <p className="text-xs uppercase tracking-widest text-gold">Subscription plans</p>
          <h2 id="pricing-title" style={{ fontSize: "2rem" }} className="mt-3">Choose your billing interval.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate">Both plans include access to the K9 management system. New paid subscriptions are not available on this public page.</p>
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
              <h3>Individual Access Plan</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate">Provides complete access for one owner, perfect for solo operators who need full control of the system.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line px-6 py-7"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 text-sm text-muted"><span>Caninelogy · K9 management software</span><Link to="/login" className="underline underline-offset-4">Customer sign in</Link></div></footer>
    </div>
  )
}