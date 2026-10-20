import { Navigate, Route, Routes } from "react-router-dom"
import { ProtectedRoute, useAuth } from "./lib/auth"
import BoardingFormPage from "./pages/BoardingFormPage"
import BoardingPage from "./pages/BoardingPage"
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
import MedicalFormPage from "./pages/MedicalFormPage"
import { MedicalHomePage, MedicalListPage } from "./pages/MedicalPages"
import HandlerFormPage from "./pages/HandlerFormPage"
import HandlersPage from "./pages/HandlersPage"
import TrainingLogPage from "./pages/TrainingLogPage"
import TrainingFormPage from "./pages/TrainingFormPage"
import FeedingPage from "./pages/FeedingPage"
import FeedingFormPage from "./pages/FeedingFormPage"
import WeightsPage from "./pages/WeightsPage"
import WeightFormPage from "./pages/WeightFormPage"
import FoodInventoryPage from "./pages/FoodInventoryPage"
import FoodInventoryFormPage from "./pages/FoodInventoryFormPage"
import ShoppingPage from "./pages/ShoppingPage"
import ShoppingFormPage from "./pages/ShoppingFormPage"
import InSeasonPage from "./pages/InSeasonPage"
import InSeasonFormPage from "./pages/InSeasonFormPage"
import GroomingPage from "./pages/GroomingPage"
import GroomingFormPage from "./pages/GroomingFormPage"
import CarUsagePage from "./pages/CarUsagePage"
import CarUsageFormPage from "./pages/CarUsageFormPage"

const protectedPage = (page: React.ReactNode) => (
  <ProtectedRoute>{page}</ProtectedRoute>
)

function OwnerPage({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  return session?.role === "owner" ? <>{children}</> : <Navigate to="/k9-roster" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/subscribe" element={protectedPage(<OwnerPage><SubscriptionPage /></OwnerPage>)} />
      <Route path="/subscription" element={protectedPage(<OwnerPage><SubscriptionPage /></OwnerPage>)} />
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
      <Route path="/training/:discipline" element={protectedPage(<TrainingLogPage />)} />
      <Route path="/training/:discipline/new" element={<ProtectedRoute requireWritable><TrainingFormPage /></ProtectedRoute>} />
      <Route path="/training/:discipline/:id/edit" element={<ProtectedRoute requireWritable><TrainingFormPage /></ProtectedRoute>} />
      <Route path="/grooming" element={protectedPage(<GroomingPage />)} />
      <Route path="/grooming/new" element={<ProtectedRoute requireWritable><GroomingFormPage /></ProtectedRoute>} />
      <Route path="/grooming/:id/edit" element={<ProtectedRoute owner requireWritable><GroomingFormPage /></ProtectedRoute>} />
      <Route path="/car-usage" element={protectedPage(<CarUsagePage />)} />
      <Route path="/car-usage/new" element={<ProtectedRoute requireWritable><CarUsageFormPage /></ProtectedRoute>} />
      <Route path="/car-usage/:id/edit" element={<ProtectedRoute owner requireWritable><CarUsageFormPage /></ProtectedRoute>} />
      <Route path="/boarding" element={protectedPage(<BoardingPage />)} />
      <Route
        path="/boarding/new"
        element={
          <ProtectedRoute requireWritable>
            <BoardingFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boarding/:id/edit"
        element={
          <ProtectedRoute owner requireWritable>
            <BoardingFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute owner>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="/todays-task" element={<Navigate to="/k9-roster" replace />} />
      <Route path="/medical" element={protectedPage(<MedicalHomePage />)} />
      <Route path="/medical/medications" element={protectedPage(<MedicalListPage kind="medications" />)} />
      <Route path="/medical/medications/new" element={<ProtectedRoute requireWritable><MedicalFormPage kind="medications" /></ProtectedRoute>} />
      <Route path="/medical/medications/:id/edit" element={<ProtectedRoute owner requireWritable><MedicalFormPage kind="medications" /></ProtectedRoute>} />
      <Route path="/medical/records" element={protectedPage(<MedicalListPage kind="records" />)} />
      <Route path="/medical/records/new" element={<ProtectedRoute requireWritable><MedicalFormPage kind="records" /></ProtectedRoute>} />
      <Route path="/medical/records/:id/edit" element={<ProtectedRoute owner requireWritable><MedicalFormPage kind="records" /></ProtectedRoute>} />
      <Route path="/medical/conditions" element={protectedPage(<MedicalListPage kind="conditions" />)} />
      <Route path="/medical/conditions/new" element={<ProtectedRoute requireWritable><MedicalFormPage kind="conditions" /></ProtectedRoute>} />
      <Route path="/medical/conditions/:id/edit" element={<ProtectedRoute owner requireWritable><MedicalFormPage kind="conditions" /></ProtectedRoute>} />
      <Route path="/handlers" element={protectedPage(<HandlersPage />)} />
      <Route path="/handlers/new" element={<ProtectedRoute owner requireWritable><HandlerFormPage /></ProtectedRoute>} />
      <Route path="/handlers/:id/edit" element={<ProtectedRoute owner requireWritable><HandlerFormPage /></ProtectedRoute>} />
      <Route path="/feeding" element={protectedPage(<FeedingPage />)} />
      <Route path="/feeding/new" element={<ProtectedRoute requireWritable><FeedingFormPage /></ProtectedRoute>} />
      <Route path="/feeding/:id/edit" element={<ProtectedRoute owner requireWritable><FeedingFormPage /></ProtectedRoute>} />
      <Route path="/weights" element={protectedPage(<WeightsPage />)} />
      <Route path="/weights/:id/edit" element={<ProtectedRoute owner requireWritable><WeightFormPage /></ProtectedRoute>} />
      <Route path="/food-inventory" element={protectedPage(<FoodInventoryPage />)} />
      <Route path="/food-inventory/new" element={<ProtectedRoute requireWritable><FoodInventoryFormPage /></ProtectedRoute>} />
      <Route path="/food-inventory/:id/edit" element={<ProtectedRoute owner requireWritable><FoodInventoryFormPage /></ProtectedRoute>} />
      <Route path="/shopping" element={protectedPage(<ShoppingPage />)} />
      <Route path="/shopping/new" element={<ProtectedRoute requireWritable><ShoppingFormPage /></ProtectedRoute>} />
      <Route path="/shopping/:id/edit" element={<ProtectedRoute owner requireWritable><ShoppingFormPage /></ProtectedRoute>} />
      <Route path="/in-season" element={protectedPage(<InSeasonPage />)} />
      <Route path="/in-season/new" element={<ProtectedRoute requireWritable><InSeasonFormPage /></ProtectedRoute>} />
      <Route path="/in-season/:id/edit" element={<ProtectedRoute owner requireWritable><InSeasonFormPage /></ProtectedRoute>} />
      <Route
        path="/reports"
        element={protectedPage(<OwnerPage><ComingSoonPage title="Reports" /></OwnerPage>)}
      />
      <Route path="*" element={<Navigate to="/k9-roster" replace />} />
    </Routes>
  )
}
