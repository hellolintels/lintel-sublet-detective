
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
  
  // Determine admin status based on email (temporary until role-based system is implemented)
  const checkAdminStatus = (userEmail: string | undefined) => {
    const adminStatus = userEmail === "jamie@lintels.in";
    setIsAdmin(adminStatus);
    setUserRole(adminStatus ? 'admin' : 'user');
    return adminStatus;
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
          checkAdminStatus(newSession.user.email);
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
        checkAdminStatus(currentSession.user.email);
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
            checkAdminStatus(data.user.email);
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
