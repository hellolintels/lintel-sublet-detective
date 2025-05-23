
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const useAdminSetup = () => {
  const { user, isAdmin } = useAuth();
  const [setupAttempted, setSetupAttempted] = useState(false);

  useEffect(() => {
    const setupAdminRole = async () => {
      if (!user || setupAttempted) return;
      
      // Check if this is the admin user and they don't have a role yet
      if (user.email === "jamie@lintels.in" && !isAdmin) {
        try {
          const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' })
            .select()
            .single();
          
          if (error && !error.message.includes('duplicate')) {
            console.error("Error setting up admin role:", error);
            toast({
              title: "Setup Notice",
              description: "Admin role setup may require manual configuration.",
              variant: "default",
            });
          } else if (!error) {
            toast({
              title: "Admin Setup Complete",
              description: "Admin privileges have been configured.",
            });
          }
        } catch (error) {
          console.error("Admin setup error:", error);
        }
      }
      
      setSetupAttempted(true);
    };

    setupAdminRole();
  }, [user, isAdmin, setupAttempted]);

  return { setupAttempted };
};
