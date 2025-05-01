
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  
  // Check if user email is admin
  const isAdmin = user?.email === "jamie@lintels.in";
  
  // While checking authentication status, show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[hsl(24,97%,40%)]"></div>
      </div>
    );
  }
  
  // If not authenticated or not admin, redirect to login
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If authenticated and admin, render the protected content
  return <>{children}</>;
};

export default AdminRoute;
