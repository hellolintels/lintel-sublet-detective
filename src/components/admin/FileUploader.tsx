
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const FileUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      // Upload file to storage
      const filename = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('address-lists')
        .upload(filename, file);
      
      if (error) throw error;
      
      toast({
        title: "Upload successful",
        description: "File has been uploaded and will be processed",
      });
      
      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Upload Address List</CardTitle>
        <CardDescription className="text-gray-400">Upload address lists for checking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file" className="text-white">Select CSV File</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="bg-gray-900 border-gray-800 text-white"
            />
          </div>
          <Button 
            className="w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading ? "Uploading..." : "Upload Address List"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
