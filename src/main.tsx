import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './lib/auth'

// Remove legacy training records as each browser loads the reset app.
for (const key of [
  "sentinel-training-sessions-v1",
  "sentinel-training-types-v1",
  "sentinel-training-goals-v1",
]) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage may be disabled; the blank training page does not use it.
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><App /></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

