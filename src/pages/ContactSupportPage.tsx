import { useState } from "react"
import { Mail, MessageCircle, Phone } from "lucide-react"
import { Link } from "react-router-dom"
import AuthLayout, { authInput, primaryButton } from "../components/AuthLayout"

export default function ContactSupportPage() {
  const [message, setMessage] = useState("")
  const trimmedMessage = message.trim()

  return (
    <AuthLayout title="Contact Support" subtitle="Need help with Caninelogy? Get in touch with the developer.">
      <div className="mt-6 rounded-xl border border-line bg-canvas p-4">
        <h2 className="text-lg font-bold text-ink">Jim Justin M. Poso</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">Developer</p>
        <div className="mt-4 space-y-3 text-sm">
          <a href="tel:+971501905318" className="flex items-center gap-3 rounded text-info underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">
            <Phone className="size-4 shrink-0" aria-hidden="true" />
            <span><span className="block text-xs text-muted">Mobile / WhatsApp</span>+971501905318</span>
          </a>
          <a href="mailto:jimjustinmposo@gmail.com" className="flex items-center gap-3 rounded text-info underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-all">jimjustinmposo@gmail.com</span>
          </a>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="support-message" className="block text-xs font-bold">Your WhatsApp message</label>
        <textarea
          id="support-message"
          className={`${authInput} min-h-36 resize-y`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={2000}
          placeholder="Hi Jim, I need help with…"
          aria-describedby="support-message-help support-message-count"
        />
        <p id="support-message-count" className="mt-1 text-right text-xs text-muted">{message.length}/2000</p>
        <p id="support-message-help" className="mt-2 text-xs leading-5 text-muted">
          Opens a chat with Jim in WhatsApp with your message ready. Press Send in WhatsApp to deliver it. Please do not include passwords or secret keys.
        </p>
        {trimmedMessage ? (
          <a
            href={`https://wa.me/971501905318?text=${encodeURIComponent(trimmedMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButton} mt-4 flex items-center justify-center gap-2`}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Continue to WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <button type="button" disabled className={`${primaryButton} mt-4 flex items-center justify-center gap-2`}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Continue to WhatsApp
          </button>
        )}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-info">
        <Link to="/login" className="hover:underline">Back to sign in</Link>
        <Link to="/dashboard" className="hover:underline">Go to dashboard</Link>
      </div>
    </AuthLayout>
  )
}