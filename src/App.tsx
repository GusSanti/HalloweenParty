import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './components/PublicLayout'
import { HomePage } from './pages/HomePage'
import './App.css'

const TicketEntryPage = lazy(() => import('./features/account/TicketEntryPage'))
const MyAccountPage = lazy(() => import('./features/account/MyAccountPage'))
const PostsPage = lazy(() => import('./features/posts/PostsPage'))
const PostDetailPage = lazy(() => import('./features/posts/PostDetailPage'))
const AdminLoginPage = lazy(() => import('./features/auth/AdminLoginPage'))
const AdminLayout = lazy(() => import('./features/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'))
const AdminInvitationsPage = lazy(() => import('./features/admin/AdminInvitationsPage'))
const AdminQrReaderPage = lazy(() => import('./features/admin/AdminQrReaderPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RouteLoading() {
  return <main className="route-loading" aria-live="polite">Preparando a página...</main>
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="ingresso" element={<TicketEntryPage />} />
          <Route path="meu-ingresso" element={<MyAccountPage />} />
          <Route path="entrar" element={<Navigate to="/ingresso" replace />} />
          <Route path="minha-conta" element={<Navigate to="/ingresso" replace />} />
          <Route path="ingressos" element={<Navigate to="/ingresso" replace />} />
          <Route path="novidades" element={<PostsPage />} />
          <Route path="novidades/:slug" element={<PostDetailPage />} />
          <Route path="politica-de-privacidade" element={<PrivacyPage />} />
        </Route>
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="convites" element={<AdminInvitationsPage />} />
          <Route path="ler-qr" element={<AdminQrReaderPage />} />
          <Route path="check-in" element={<Navigate to="/admin/ler-qr" replace />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
