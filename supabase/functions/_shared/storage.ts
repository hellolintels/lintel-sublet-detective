
import { corsHeaders } from './cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Initialize storage system and ensure required buckets exist
 */
export async function ensureStorageSetup(): Promise<boolean> {
  try {
    console.log("Initializing storage setup");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Storage configuration error: Missing credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if required buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Failed to list storage buckets:", bucketsError);
      throw new Error("Storage system error: " + bucketsError.message);
    }
    
    const pendingBucketExists = buckets?.some(b => b.name === 'pending-uploads') || false;
    const approvedBucketExists = buckets?.some(b => b.name === 'approved-uploads') || false;
    
    // Create buckets if they don't exist
    if (!pendingBucketExists) {
      console.log("Creating pending-uploads bucket");
      const { error } = await supabase.storage.createBucket('pending-uploads', {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        console.error("Failed to create pending-uploads bucket:", error);
        throw new Error("Storage setup error: " + error.message);
      }
    }
    
    if (!approvedBucketExists) {
      console.log("Creating approved-uploads bucket");
      const { error } = await supabase.storage.createBucket('approved-uploads', {
        public: false,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        console.error("Failed to create approved-uploads bucket:", error);
        throw new Error("Storage setup error: " + error.message);
      }
    }
    
    console.log("Storage setup complete");
    return true;
  } catch (error) {
    console.error("Storage setup failed:", error);
    return false;
  }
}

/**
 * Upload file to pending bucket
 */
export async function uploadFileToPendingBucket(
  fileContent: string,
  fileName: string,
  userEmail: string
): Promise<string> {
  try {
    console.log(`Uploading file ${fileName} to pending bucket`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Storage configuration error: Missing credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate a unique path for the file
    const userPrefix = userEmail.split('@')[0].replace(/[^a-z0-9]/gi, '');
    const timestamp = new Date().getTime();
    const storagePath = `${userPrefix}/${timestamp}-${fileName}`;
    
    // Convert string content to Blob
    const fileBlob = new Blob([fileContent], { type: 'text/csv' });
    
    // Upload the file
    const { error } = await supabase
      .storage
      .from('pending-uploads')
      .upload(storagePath, fileBlob, {
        contentType: 'text/csv',
        upsert: false
      });
      
    if (error) {
      console.error("File upload failed:", error);
      throw new Error("Storage error: " + error.message);
    }
    
    console.log("File uploaded successfully at path:", storagePath);
    return storagePath;
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
}

/**
 * Move file from pending to approved bucket
 */
export async function moveFileToApprovedBucket(
  sourcePath: string,
  contactId: string
): Promise<string> {
  try {
    console.log(`Moving file from ${sourcePath} to approved bucket`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Storage configuration error: Missing credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const fileName = sourcePath.split('/').pop() || 'file.csv';
    const destinationPath = `approved/${contactId}-${fileName}`;
    
    // Copy the file to the approved bucket
    const { error } = await supabase
      .storage
      .from('pending-uploads')
      .copy(sourcePath, `../approved-uploads/${destinationPath}`);
      
    if (error) {
      console.error("File move failed:", error);
      throw new Error("Storage error: " + error.message);
    }
    
    // Delete the original file
    await supabase
      .storage
      .from('pending-uploads')
      .remove([sourcePath]);
      
    console.log("File moved successfully to:", destinationPath);
    return destinationPath;
  } catch (error) {
    console.error("File move error:", error);
    throw error;
  }
}

/**
 * Download file content from storage
 */
export async function downloadFileContent(
  bucket: string,
  path: string
): Promise<string> {
  try {
    console.log(`Downloading file from ${bucket}/${path}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Storage configuration error: Missing credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .download(path);
      
    if (error) {
      console.error("File download failed:", error);
      throw new Error("Storage error: " + error.message);
    }
    
    if (!data) {
      throw new Error("No file data returned");
    }
    
    const content = await data.text();
    console.log("File downloaded successfully, size:", content.length);
    return content;
  } catch (error) {
    console.error("File download error:", error);
    throw error;
  }
}
