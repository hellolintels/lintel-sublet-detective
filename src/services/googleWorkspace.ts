
// Google Workspace integration service
import { toast } from "sonner";

// This would normally come from environment variables
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // Replace with your actual Google Client ID

// Types for Google Drive API responses
interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

export const initializeGoogleApi = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client:auth2', () => {
        window.gapi.client.init({
          clientId: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        }).then(() => {
          resolve();
        }).catch((error: any) => {
          console.error("Error initializing Google API", error);
          reject(error);
        });
      });
    };
    script.onerror = (error) => {
      console.error("Error loading Google API script", error);
      reject(error);
    };
    document.body.appendChild(script);
  });
};

export const signInWithGoogle = async (): Promise<GoogleUserInfo | null> => {
  try {
    if (!window.gapi || !window.gapi.auth2) {
      await initializeGoogleApi();
    }
    
    const authInstance = window.gapi.auth2.getAuthInstance();
    const googleUser = await authInstance.signIn();
    
    // Get user profile information
    const profile = googleUser.getBasicProfile();
    return {
      email: profile.getEmail(),
      name: profile.getName(),
      picture: profile.getImageUrl()
    };
  } catch (error) {
    console.error("Google Sign-In error:", error);
    toast.error("Google Sign-In failed. Please try again.");
    return null;
  }
};

export const uploadToGoogleDrive = async (file: File, folderName?: string): Promise<string | null> => {
  try {
    if (!window.gapi || !window.gapi.client) {
      await initializeGoogleApi();
    }
    
    // Check if user is signed in
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      await signInWithGoogle();
    }
    
    // Create folder if folderName is provided
    let folderId = '';
    if (folderName) {
      const folderResponse = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id)'
      });
      
      if (folderResponse.result.files && folderResponse.result.files.length > 0) {
        folderId = folderResponse.result.files[0].id;
      } else {
        // Create new folder
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        };
        
        const folderCreateResponse = await window.gapi.client.drive.files.create({
          resource: folderMetadata,
          fields: 'id'
        });
        
        folderId = folderCreateResponse.result.id;
      }
    }
    
    // Upload file
    const metadata = {
      name: file.name,
      mimeType: file.type,
      ...(folderId && { parents: [folderId] })
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    // Get access token
    const accessToken = window.gapi.auth.getToken().access_token;
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    });
    
    const result = await response.json();
    
    if (result.id) {
      toast.success("File uploaded to Google Drive successfully");
      return result.id;
    } else {
      throw new Error("Failed to upload file");
    }
  } catch (error) {
    console.error("Google Drive upload error:", error);
    toast.error("Failed to upload file to Google Drive");
    return null;
  }
};

// Add type definitions for the global gapi object
declare global {
  interface Window {
    gapi: any;
  }
}
