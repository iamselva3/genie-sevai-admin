import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StaffLayout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const BookingDetailPage = lazy(() => import('./pages/BookingDetailPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const CitiesPage = lazy(() => import('./pages/CitiesPage'));
const ProfessionalsPage = lazy(() => import('./pages/ProfessionalsPage'));
const ProfessionalDetailPage = lazy(() => import('./pages/ProfessionalDetailPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const CouponsPage = lazy(() => import('./pages/CouponsPage'));
const BannersPage = lazy(() => import('./pages/BannersPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const EnquiriesPage = lazy(() => import('./pages/EnquiriesPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ProPortalPage = lazy(() => import('./pages/ProPortalPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RequireStaff({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.kind === 'pro') return <Navigate to="/jobs" replace />;
  if (adminOnly && session.user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequirePro({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.kind !== 'pro') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/jobs"
        element={
          <RequirePro>
            <Page>
              <ProPortalPage />
            </Page>
          </RequirePro>
        }
      />
      <Route
        element={
          <RequireStaff>
            <StaffLayout />
          </RequireStaff>
        }
      >
        <Route index element={<Page><DashboardPage /></Page>} />
        <Route path="bookings" element={<Page><BookingsPage /></Page>} />
        <Route path="bookings/:id" element={<Page><BookingDetailPage /></Page>} />
        <Route path="services" element={<Page><ServicesPage /></Page>} />
        <Route path="categories" element={<Page><CategoriesPage /></Page>} />
        <Route path="cities" element={<Page><CitiesPage /></Page>} />
        <Route path="professionals" element={<Page><ProfessionalsPage /></Page>} />
        <Route path="professionals/:id" element={<Page><ProfessionalDetailPage /></Page>} />
        <Route path="customers" element={<Page><CustomersPage /></Page>} />
        <Route path="customers/:id" element={<Page><CustomerDetailPage /></Page>} />
        <Route path="coupons" element={<Page><CouponsPage /></Page>} />
        <Route path="banners" element={<Page><BannersPage /></Page>} />
        <Route path="reviews" element={<Page><ReviewsPage /></Page>} />
        <Route path="enquiries" element={<Page><EnquiriesPage /></Page>} />
        <Route path="applications" element={<Page><ApplicationsPage /></Page>} />
        <Route
          path="staff"
          element={
            <RequireStaff adminOnly>
              <Page>
                <StaffPage />
              </Page>
            </RequireStaff>
          }
        />
        <Route path="*" element={<Page><NotFoundPage /></Page>} />
      </Route>
    </Routes>
  );
}
