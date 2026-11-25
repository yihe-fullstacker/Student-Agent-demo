import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PATHS } from "./paths";
import PageLoader from "../components/common/PageLoader";

/** Redirects unauthenticated users to the landing page and opens login, remembering the target. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();
  const location = useLocation();
  if (authLoading) {
    return <PageLoader />;
  }
  if (!isAuthenticated) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to={PATHS.HOME} replace state={{ openAuth: "login", from }} />;
  }
  return children;
}
