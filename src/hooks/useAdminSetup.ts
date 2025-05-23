
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const useAdminSetup = () => {
  const { user, isAdmin } = useAuth();
  const [setupAttempted, setSetupAttempted] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    const setupAdminRole = async () => {
      try {
        if (!user || setupAttempted) return;
        
        console.log("Checking admin role for:", user.email);
        setSetupError(null);
        
        // Check if user already has admin role using more secure method
        const { data: existingRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        if (roleError) {
          console.error("Error checking admin role:", roleError);
          setSetupError("Could not verify admin status");
          return;
        }
        
        // If jamie@lintels.in doesn't have admin role, create it
        if (user.email === "jamie@lintels.in" && !existingRole) {
          console.log("Setting up admin role for:", user.email);
          
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'admin'
            })
            .select()
            .single();
            
          if (insertError) {
            console.error("Error setting up admin role:", insertError);
            setSetupError("Failed to assign admin role");
            toast({
              title: "Admin Setup Failed",
              description: "Could not assign admin privileges. Please contact support.",
              variant: "destructive"
            });
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
      } catch (error) {
        console.error("Admin setup error:", error);
        setSetupError(error instanceof Error ? error.message : "Unknown error");
        toast({
          title: "Admin Setup Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
    };

    // Security improvement: delay the admin setup to avoid freezing the app
    const timeoutId = setTimeout(() => {
      setupAdminRole();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [user, isAdmin, setupAttempted]);

  return { setupAttempted, setupError };
};
