
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUp, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { signInWithGoogle, uploadToGoogleDrive } from "@/services/googleWorkspace";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

const formSchema = z.object({
  fullName: z.string()
    .min(2, { message: "Full name must be at least 2 characters" })
    .regex(/^[a-zA-Z\s-']+$/, { message: "Name can only contain letters, spaces, hyphens and apostrophes" }),
  position: z.string()
    .min(2, { message: "Position must be at least 2 characters" })
    .regex(/^[a-zA-Z\s-']+$/, { message: "Position can only contain letters, spaces and hyphens" }),
  company: z.string()
    .min(2, { message: "Company name must be at least 2 characters" })
    .regex(/^[\w\s-'&.]+$/, { message: "Company name contains invalid characters" }),
  email: z.string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .regex(/^[0-9+\s()-]+$/, { message: "Please enter a valid phone number" }),
  addressFile: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "File is required")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      "Max file size is 5MB"
    )
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only Excel and CSV files are accepted"
    ),
  useGoogleWorkspace: z.boolean().optional().default(false),
});

export function ContactForm() {
  const [open, setOpen] = useState(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<{ name: string, email: string, picture: string } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      position: "",
      company: "",
      email: "",
      phone: "",
      useGoogleWorkspace: false,
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      const userInfo = await signInWithGoogle();
      if (userInfo) {
        setIsGoogleSignedIn(true);
        setGoogleUserInfo(userInfo);
        
        // Pre-fill form with user data if available
        if (userInfo.name) form.setValue('fullName', userInfo.name);
        if (userInfo.email) form.setValue('email', userInfo.email);
        
        toast.success("Successfully signed in with Google");
      }
    } catch (error) {
      console.error("Google Sign-In error:", error);
      toast.error("Failed to sign in with Google");
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const files = values.addressFile as FileList;
      if (files && files[0]) {
        // If user chose to use Google Workspace
        if (values.useGoogleWorkspace) {
          // Make sure user is signed in with Google
          if (!isGoogleSignedIn) {
            await handleGoogleSignIn();
          }
          
          // Upload file to Google Drive
          const fileId = await uploadToGoogleDrive(files[0], "Lintels Address Files");
          
          if (fileId) {
            // Success, file uploaded to Google Drive
            toast.success("Thank you! We've received your submission and uploaded your file to Google Drive. We'll send your sample report within 48 hours.", {
              duration: 6000
            });
            setOpen(false);
            form.reset();
            return;
          } else {
            throw new Error("Failed to upload to Google Drive");
          }
        }
        
        // Standard submission flow (without Google Workspace)
        const subject = encodeURIComponent(`Sample request from ${values.company}`);
        const body = encodeURIComponent(`
Name: ${values.fullName}
Position: ${values.position}
Company: ${values.company}
Email: ${values.email}
Phone: ${values.phone}

A CSV file with addresses has been attached to this email.
        `);
        
        // Create a temporary link to download the file
        const fileURL = URL.createObjectURL(files[0]);
        const tempLink = document.createElement('a');
        tempLink.href = fileURL;
        tempLink.download = 'addresses.csv';
        
        // Trigger file download
        tempLink.click();
        URL.revokeObjectURL(fileURL);

        // Open email client with pre-filled details
        window.location.href = `mailto:jamie@lintels.in?subject=${subject}&body=${body}`;
        
        toast.success("Thank you! We've received your submission and will send your sample report within 48 hours. Please check your email for confirmation.", {
          duration: 6000
        });
        setOpen(false);
        form.reset();
      } else {
        throw new Error("No file selected");
      }
    } catch (error) {
      toast.error("Sorry that didn't work. Please try again or email support@lintels.in attaching the sample CSV");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="lg"
        className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-8 py-4 text-lg rounded-full font-medium transition-colors duration-200"
        onClick={() => setOpen(true)}
      >
        Request a Sample Report
      </Button>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-4">Request a Sample Report</DialogTitle>
        </DialogHeader>
        
        {/* Google Sign-in Button */}
        {!isGoogleSignedIn ? (
          <div className="flex justify-center mb-4">
            <Button 
              className="bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 flex items-center justify-center gap-2 px-4 py-2 w-full"
              onClick={handleGoogleSignIn}>
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center mb-4 gap-2 p-2 bg-gray-100 rounded-lg">
            {googleUserInfo?.picture && (
              <img src={googleUserInfo.picture} className="w-8 h-8 rounded-full" alt="Profile" />
            )}
            <div className="text-sm">
              Signed in as <span className="font-bold">{googleUserInfo?.email}</span>
            </div>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isGoogleSignedIn && (
              <>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Property Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="07XXX XXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <FormField
              control={form.control}
              name="addressFile"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Upload Addresses</FormLabel>
                  <FormControl>
                    <div className="relative w-full">
                      <Input
                        type="file"
                        accept=".csv,.xls,.xlsx"
                        onChange={(e) => onChange(e.target.files)}
                        {...field}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center justify-center w-full border-2 border-dashed border-primary/50 rounded-lg p-4 hover:bg-primary/5 transition-colors">
                        <Upload className="mr-2 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Upload addresses (CSV or Excel)
                        </span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="text-center mt-1">
                    CSV or Excel file with street addresses and postcodes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isGoogleSignedIn && (
              <FormField
                control={form.control}
                name="useGoogleWorkspace"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Upload file to Google Drive
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}
            
            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
