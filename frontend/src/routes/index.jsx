import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PATHS } from "./paths";
import ProtectedRoute from "./ProtectedRoute";
import MarketingLayout from "../layouts/MarketingLayout";
import PageLoader from "../components/common/PageLoader";

const Landing = lazy(() => import("../pages/marketing/Landing"));
const Agents = lazy(() => import("../pages/marketing/Agents"));
const Planner = lazy(() => import("../pages/marketing/Planner"));
const Contact = lazy(() => import("../pages/marketing/Contact"));
const AppShell = lazy(() => import("../components/AppShell"));
const NotFound = lazy(() => import("../pages/NotFound"));

/**
 * Route table
 *  /          Landing   public
 *  /agents    Agents    public
 *  /planner   Planner   public
 *  /contact   Contact   public
 *  /app/*     AppShell  protected
 *  *          NotFound  public
 */
export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path={PATHS.HOME} element={<Landing />} />
          <Route path={PATHS.AGENTS} element={<Agents />} />
          <Route path={PATHS.PLANNER} element={<Planner />} />
          <Route path={PATHS.CONTACT} element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path={`${PATHS.APP}/*`}
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
