
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
      
      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      // If jamie@lintels.in doesn't have admin role, create it
      if (user.email === "jamie@lintels.in" && !existingRole) {
        console.log("Setting up admin role for:", user.email);
        
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'admin'
          });
          
        if (error) {
          console.error("Error setting up admin role:", error);
        } else {
          console.log("Admin role created successfully");
          toast({
            title: "Admin Role Assigned",
            description: "You have been granted admin privileges.",
          });
        }
      } else if (isAdmin) {
        console.log("Admin user detected:", user.email);
        toast({
          title: "Admin Access Confirmed",
          description: "You have admin privileges.",
        });
      }
      
      setSetupAttempted(true);
    };

    setupAdminRole();
  }, [user, isAdmin, setupAttempted]);

  return { setupAttempted };
};
