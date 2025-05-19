
import LoginForm from "./LoginForm";
import RequestAccessForm from "./RequestAccessForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LoginTabs = () => {
  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid grid-cols-2 mb-4 mx-6">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="request">Request Access</TabsTrigger>
      </TabsList>
      
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
      
      <TabsContent value="request">
        <RequestAccessForm />
      </TabsContent>
    </Tabs>
  );
};

export default LoginTabs;
