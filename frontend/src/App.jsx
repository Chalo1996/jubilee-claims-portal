import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth     from './components/RequireAuth';
import Navbar          from './components/Navbar';
import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import CreateClaimPage from './pages/CreateClaimPage';
import ClaimDetailPage from './pages/ClaimDetailPage';
import NotFoundPage    from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <div className="min-h-screen bg-gray-50 flex flex-col">
                  <Navbar />
                  <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                      <Route path="/"           element={<DashboardPage />} />
                      <Route path="/claims/new" element={<CreateClaimPage />} />
                      <Route path="/claims/:id" element={<ClaimDetailPage />} />
                      <Route path="*"           element={<NotFoundPage />} />
                    </Routes>
                  </main>
                  <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-bronze-700">
                    Jubilee Insurance — Claims Processing Portal
                  </footer>
                </div>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
