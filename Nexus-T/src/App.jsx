import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { config } from './lib/config'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Home from './pages/Home'
import Docente from './pages/Docente'
import JefeGrupo from './pages/JefeGrupo'
import Orientacion from './pages/Orientacion'
import Tutor from './pages/Tutor'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import ConnectionTest from './components/ConnectionTest'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/home" replace /> : <Landing />}
      />
      <Route
        path="/signin"
        element={user ? <Navigate to="/home" replace /> : <SignIn />}
      />
      <Route
        path="/signup"
        element={
          config.allowSignUp ? (
            user ? <Navigate to="/home" replace /> : <SignUp />
          ) : (
            <Navigate to="/signin" replace />
          )
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/docente"
        element={
          <ProtectedRoute>
            <Docente />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jefe-grupo"
        element={
          <ProtectedRoute>
            <JefeGrupo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orientacion"
        element={
          <ProtectedRoute>
            <Orientacion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutor"
        element={
          <ProtectedRoute>
            <Tutor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>
      <Route
        path="/test-connection"
        element={
          <ProtectedRoute>
            <ConnectionTest />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}