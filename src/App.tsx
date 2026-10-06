import { Navigate, Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "./lib/auth"
import AcceptInvitePage from "./pages/AcceptInvitePage"
import BillingSuccessPage from "./pages/BillingSuccessPage"
import ComingSoonPage from "./pages/ComingSoonPage"
import DashboardPage from "./pages/DashboardPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import K9FormPage from "./pages/K9FormPage"
import K9RosterPage from "./pages/K9RosterPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import SubscribePage from "./pages/SubscribePage"
import SubscriptionPage from "./pages/SubscriptionPage"
import TodaysTaskPage from "./pages/TodaysTaskPage"
import TrainingPage from "./pages/TrainingPage"

const protectedPage = (page: React.ReactNode) => (
  <ProtectedRoute>{page}</ProtectedRoute>
)

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route
        path="/subscribe"
        element={
          <ProtectedRoute owner allowInactive>
            <SubscribePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute owner allowInactive>
            <SubscriptionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/success"
        element={
          <ProtectedRoute owner allowInactive>
            <BillingSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route path="/account" element={<Navigate to="/subscription" replace />} />
      <Route path="/" element={protectedPage(<DashboardPage />)} />
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
          <ProtectedRoute owner>
            <K9FormPage />
          </ProtectedRoute>
        }
      />
      <Route path="/training" element={protectedPage(<TrainingPage />)} />
      <Route path="/todays-task" element={protectedPage(<TodaysTaskPage />)} />
      <Route
        path="/medical"
        element={protectedPage(<ComingSoonPage title="Medical" />)}
      />
      <Route
        path="/deployments"
        element={protectedPage(<ComingSoonPage title="Deployments" />)}
      />
      <Route
        path="/handlers"
        element={protectedPage(<ComingSoonPage title="Handlers" />)}
      />
      <Route
        path="/reports"
        element={protectedPage(<ComingSoonPage title="Reports" />)}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
