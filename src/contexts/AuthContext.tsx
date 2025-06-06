import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Check user role from the new user_roles table
  const checkUserRole = async (userId: string) => {
    try {
      setRoleLoading(true);
      // Validate UUID format to prevent injection attacks
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error("Invalid user ID format");
        setUserRole('user');
        setIsAdmin(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        console.log("No role found for user, defaulting to 'user'");
        setUserRole('user');
        setIsAdmin(false);
        return;
      }
      
      if (data?.role) {
        setUserRole(data.role);
        setIsAdmin(data.role === 'admin');
        console.log(`User role set to: ${data.role}`);
      } else {
        setUserRole('user');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setUserRole('user');
      setIsAdmin(false);
    } finally {
      setRoleLoading(false);
    }
  };
  
  useEffect(() => {
    console.log("Auth Provider initialized");
    setAuthError(null);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsAuthenticated(!!newSession);
        
        if (newSession?.user) {
          // Use setTimeout for database call to avoid auth deadlocks
          setTimeout(async () => {
            await checkUserRole(newSession.user!.id);
          }, 0);
        } else {
          setUserRole(null);
          setIsAdmin(false);
          setRoleLoading(false);
        }
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: `Welcome${newSession?.user?.email ? ` ${newSession.user.email}` : ''}!`,
          });
        }
        
        if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out successfully",
            description: "You have been signed out.",
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      console.log("Existing session check:", currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsAuthenticated(!!currentSession);
      
      if (currentSession?.user) {
        await checkUserRole(currentSession.user.id);
      } else {
        setRoleLoading(false);
      }
      
      setLoading(false);
    }).catch(error => {
      console.error("Error getting session:", error);
      setLoading(false);
      setRoleLoading(false);
      setAuthError("Failed to retrieve authentication session");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const login = async (email: string, password: string) => {
    try {
      console.log("Login attempt:", email);
      setAuthError(null);
      
      // Validate input format to prevent injection attacks
      if (!email || !password || email.length < 5 || password.length < 6) {
        throw new Error("Invalid email or password format");
      }
      
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("Login error:", error);
        throw error;
      }
      
      console.log("Login successful");
    } catch (error) {
      console.error("Login exception:", error);
      if (error instanceof Error) {
        setAuthError(error.message);
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      console.log("Logout attempt");
      setAuthError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      if (error instanceof Error) {
        setAuthError(error.message);
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };
  
  // Don't finish loading until both auth and role checks are complete
  const finalLoading = loading || roleLoading;
  
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      session, 
      userRole,
      isAdmin,
      login, 
      logout, 
      loading: finalLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
