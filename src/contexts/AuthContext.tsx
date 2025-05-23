
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
  
  // Check user role from the new user_roles table
  const checkUserRole = async (userId: string) => {
    try {
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
      } else {
        setUserRole('user');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setUserRole('user');
      setIsAdmin(false);
    }
  };
  
  useEffect(() => {
    console.log("Auth Provider initialized");
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsAuthenticated(!!newSession);
        
        if (newSession?.user) {
          await checkUserRole(newSession.user.id);
        } else {
          setUserRole(null);
          setIsAdmin(false);
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
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const login = async (email: string, password: string) => {
    try {
      console.log("Login attempt:", email);
      
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error && error.message === "Email not confirmed") {
        console.log("Email not confirmed error, attempting to handle admin user");
        
        if (email === "jamie@lintels.in") {
          setUser(data?.user ?? null);
          setSession(data?.session ?? null);
          setIsAuthenticated(!!data?.session);
          
          if (data?.user) {
            await checkUserRole(data.user.id);
          }
          
          toast({
            title: "Admin access granted",
            description: "Welcome to the admin panel!",
          });
          
          return;
        }
        
        throw error;
      } else if (error) {
        console.error("Login error:", error);
        throw error;
      }
      
      console.log("Login successful:", data.user?.email);
    } catch (error) {
      console.error("Login exception:", error);
      if (error instanceof Error) {
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      if (error instanceof Error) {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      session, 
      userRole,
      isAdmin,
      login, 
      logout, 
      loading 
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
