import { Navigate, Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "./lib/auth"
import AcceptInvitePage from "./pages/AcceptInvitePage"
import ComingSoonPage from "./pages/ComingSoonPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import K9FormPage from "./pages/K9FormPage"
import K9RosterPage from "./pages/K9RosterPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import SubscriptionPage from "./pages/SubscriptionPage"
import TrainingPage from "./pages/TrainingPage"
import UsersPage from "./pages/UsersPage"

const protectedPage = (page: React.ReactNode) => (
  <ProtectedRoute>{page}</ProtectedRoute>
)

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/subscribe" element={protectedPage(<SubscriptionPage />)} />
      <Route path="/subscription" element={protectedPage(<SubscriptionPage />)} />
      <Route path="/account" element={<Navigate to="/" replace />} />
      <Route path="/" element={<Navigate to="/k9-roster" replace />} />
      <Route path="/k9-roster" element={protectedPage(<K9RosterPage />)} />
      <Route
        path="/k9-roster/new"
        element={
          <ProtectedRoute requireWritable>
            <K9FormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/k9-roster/:id/edit"
        element={
          <ProtectedRoute owner requireWritable>
            <K9FormPage />
          </ProtectedRoute>
        }
      />
      <Route path="/training" element={protectedPage(<TrainingPage />)} />
      <Route
        path="/users"
        element={
          <ProtectedRoute owner>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="/todays-task" element={<Navigate to="/k9-roster" replace />} />
      <Route
        path="/medical"
        element={protectedPage(<ComingSoonPage title="Medical" />)}
      />
      <Route
        path="/handlers"
        element={protectedPage(<ComingSoonPage title="Handlers" />)}
      />
      <Route
        path="/reports"
        element={protectedPage(<ComingSoonPage title="Reports" />)}
      />
      <Route path="*" element={<Navigate to="/k9-roster" replace />} />
    </Routes>
  )
}
