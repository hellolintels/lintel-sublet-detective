
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  onLogout: () => Promise<void>;
}

export const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  const { user } = useAuth();

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {user?.email && (
          <p className="text-gray-400 mt-1">Logged in as: {user.email}</p>
        )}
      </div>
      <Button 
        variant="destructive" 
        onClick={onLogout}
      >
        Logout
      </Button>
    </div>
  );
};
