
import { supabase } from "@/integrations/supabase/client";

/**
 * Verifies and sets up storage buckets for file uploads
 * @returns A promise that resolves to true if storage is ready
 */
export async function ensureStorageSetup(): Promise<boolean> {
  try {
    console.log("Checking if storage buckets exist");
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Could not check storage buckets:", bucketsError);
      
      // Check if this is a permissions error
      if (bucketsError.message.includes("permission") || bucketsError.message.includes("not authorized")) {
        throw new Error("Storage access permission denied. Please contact support.");
      }
      
      throw new Error("Unable to access storage system");
    }
    
    const pendingBucketExists = buckets?.some(b => b.name === 'pending-uploads') || false;
    console.log("pending-uploads bucket exists:", pendingBucketExists);
    
    if (!pendingBucketExists) {
      console.log("pending-uploads bucket doesn't exist, calling setup function");
      
      // Call the setup function to create the buckets
      const { error: setupError } = await supabase.functions.invoke("setup");
      
      if (setupError) {
        console.error("Setup function error:", setupError);
        
        // More specific error messages
        if (setupError.message.includes("permission") || setupError.message.includes("not authorized")) {
          throw new Error("Setup function permission denied. Anonymous uploads may not be enabled.");
        }
        
        throw new Error("Storage system setup failed: " + setupError.message);
      }
      
      // Verify buckets were created successfully
      const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
      
      if (verifyError) {
        console.error("Verify buckets error:", verifyError);
        throw new Error("Failed to verify storage setup");
      }
      
      const bucketsExist = verifyBuckets?.some(b => b.name === 'pending-uploads') || false;
      
      if (!bucketsExist) {
        throw new Error("Storage buckets setup failed - buckets were not created");
      }
      
      console.log("Storage buckets created successfully");
      return true;
    }
    
    return pendingBucketExists;
  } catch (setupError) {
    console.error("Error setting up storage:", setupError);
    // Provide more specific error message to users
    if (setupError.message.includes("permission") || setupError.message.includes("not authorized")) {
      throw new Error("Storage permission denied. Please try again later or contact support.");
    }
    throw new Error(`Storage system setup failed: ${setupError.message}`);
  }
}

/**
 * Uploads a file to the pending-uploads bucket
 * @param file The file to upload
 * @param emailPrefix Email prefix to use in the file path
 * @returns The storage path of the uploaded file
 */
export async function uploadFileToPendingBucket(file: File, emailPrefix: string): Promise<string> {
  // Generate a unique file path
  const { v4: uuidv4 } = await import("uuid");
  const fileExt = file.name.split(".").pop() || "";
  const uniqueFileName = `${uuidv4()}.${fileExt}`;
  const storagePath = `${emailPrefix}-${uniqueFileName}`;

  // Upload file to Supabase Storage
  console.log(`Uploading file to Supabase Storage at path: ${storagePath}`);
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("pending-uploads")
    .upload(storagePath, file);

  if (uploadError) {
    console.error("Supabase Storage upload error:", uploadError);
    
    // Handle specific error cases
    if (uploadError.message.includes("Bucket not found")) {
      throw new Error("Storage system not configured properly. Please try again later.");
    }
    
    if (uploadError.message.includes("permission") || uploadError.message.includes("not authorized")) {
      throw new Error("Upload permission denied. Anonymous uploads may not be enabled.");
    }
    
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  console.log("File uploaded successfully:", uploadData);
  return storagePath;
}

/**
 * Deletes a file from the pending-uploads bucket
 * @param storagePath The storage path of the file to delete
 */
export async function deleteFileFromPendingBucket(storagePath: string): Promise<void> {
  try {
    await supabase.storage.from("pending-uploads").remove([storagePath]);
    console.log("Cleaned up uploaded file after function error.");
  } catch (cleanupError) {
    console.error("Failed to cleanup uploaded file after function error:", cleanupError);
  }
}
