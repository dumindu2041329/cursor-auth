import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import LandingPage from './pages/LandingPage.tsx'
import Dashboard from './pages/Dashboard.tsx'
import ProfileSettings from './pages/ProfileSettings.tsx'
import NotFound from './pages/NotFound.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import RequireAuth from './auth/RequireAuth.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // Render LandingPage for base and modal routes
      { index: true, element: <LandingPage /> },
      { path: 'signin', element: <LandingPage /> },
      { path: 'signup', element: <LandingPage /> },
      { path: '*', element: <NotFound /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'settings', element: <ProfileSettings /> },
        ]
      }
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
