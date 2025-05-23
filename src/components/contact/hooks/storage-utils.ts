
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
    
    // Check if required buckets exist
    const pendingBucketExists = buckets?.some(b => b.name === 'pending-uploads') || false;
    
    if (!pendingBucketExists) {
      console.log("Required buckets don't exist, calling setup function");
      
      // Call setup function to create them
      const { data: setupData, error: setupError } = await supabase.functions.invoke("setup");
      
      if (setupError) {
        console.error("Error setting up storage:", setupError);
        throw new Error("Storage system setup failed");
      }
      
      console.log("Storage setup completed:", setupData);
    }
    
    console.log("Storage is ready for use");
    return true;
  } catch (error) {
    console.error("Storage setup error:", error);
    throw new Error("Could not access storage system. Please try again later.");
  }
}

/**
 * Uploads a file to the pending-uploads bucket
 * @param file The file to upload
 * @param userEmail The user's email (used for path generation)
 * @returns The storage path where the file was uploaded
 */
export async function uploadFileToPendingBucket(file: File, userEmail: string): Promise<string> {
  try {
    console.log("Uploading file to pending-uploads bucket:", file.name);
    
    // Create a unique path using timestamp and a slug from the email
    const userPrefix = userEmail.split('@')[0].replace(/[^a-z0-9]/gi, '');
    const timestamp = new Date().getTime();
    const storagePath = `${userPrefix}/${timestamp}-${file.name}`;
    
    const { error } = await supabase
      .storage
      .from('pending-uploads')
      .upload(storagePath, file);
      
    if (error) {
      console.error("Error uploading file:", error);
      throw new Error(`File upload failed: ${error.message}`);
    }
    
    console.log("File uploaded successfully:", storagePath);
    return storagePath;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

/**
 * Deletes a file from the pending-uploads bucket
 * @param storagePath The path to the file to delete
 */
export async function deleteFileFromPendingBucket(storagePath: string): Promise<void> {
  try {
    console.log("Deleting file from pending-uploads bucket:", storagePath);
    
    const { error } = await supabase
      .storage
      .from('pending-uploads')
      .remove([storagePath]);
      
    if (error) {
      console.error("Error deleting file:", error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
    
    console.log("File deleted successfully");
  } catch (error) {
    console.error("Delete error:", error);
    // Don't throw the error, just log it, as this is usually cleanup
    console.warn("File deletion failed but proceeding anyway");
  }
}
