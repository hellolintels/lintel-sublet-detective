
import { useEffect, useState } from "react";

export default function ApproveProcessingPage() {
  const [status, setStatus] = useState("Processing approval...");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const submissionId = params.get("id");

    if (!action || !submissionId) {
      setStatus("❌ Missing required parameters.");
      setIsLoading(false);
      return;
    }

    // Add debug info
    setDebugInfo(`Processing ${action} for submission ID: ${submissionId}`);
    
    // UPDATED: Use the correct URL path for accessing the Edge Function
    // The issue might be with the vercel.json rewrites not matching correctly
    const supabaseFunctionUrl = `https://uejymkggevuvuerldzhv.functions.supabase.co/process-approval?action=${action}&id=${submissionId}`;
    
    console.log("📤 Sending request to:", supabaseFunctionUrl);

    fetch(supabaseFunctionUrl)
      .then(res => {
        setIsLoading(false);
        if (res.ok) {
          setStatus("✅ Approval processed successfully.");
          console.log("✅ Approval request succeeded with status:", res.status);
          res.text().then(html => {
            // Fix: Check for element existence first, then assign innerHTML
            const responseContainer = document.getElementById('response-container');
            if (responseContainer) {
              responseContainer.innerHTML = html;
              
              // Add more debug info about the response
              setDebugInfo(prev => `${prev || ''}\n\nResponse received and processed successfully.`);
            } else {
              setDebugInfo(prev => `${prev || ''}\n\nWarning: response-container element not found in the DOM.`);
            }
          });
        } else {
          res.text().then(text => {
            console.error("❌ Error from process-approval:", text);
            setStatus(`❌ Error ${res.status}`);
            setErrorDetails(text);
            setDebugInfo(prev => `${prev || ''}\n\nServer returned error ${res.status}: ${text}`);
          });
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.error("❌ Network error:", err);
        setStatus("❌ Network error sending approval.");
        setErrorDetails(err.message);
        setDebugInfo(prev => `${prev || ''}\n\nNetwork error: ${err.message}`);
      });
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>{status}</h1>
      
      {isLoading && (
        <div style={{ textAlign: "center", margin: "2rem 0" }}>
          <div style={{ 
            width: "50px", 
            height: "50px", 
            border: "5px solid #f3f3f3", 
            borderTop: "5px solid #3498db", 
            borderRadius: "50%",
            margin: "0 auto",
            animation: "spin 2s linear infinite",
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {errorDetails && (
        <div style={{ 
          padding: "1rem", 
          backgroundColor: "#ffebee", 
          border: "1px solid #ffcdd2",
          borderRadius: "4px",
          marginTop: "1rem"
        }}>
          <h3>Error Details:</h3>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{errorDetails}</pre>
        </div>
      )}
      
      {debugInfo && (
        <div style={{ 
          padding: "1rem", 
          backgroundColor: "#e8f5e9", 
          border: "1px solid #c8e6c9",
          borderRadius: "4px",
          marginTop: "1rem",
          fontSize: "14px"
        }}>
          <h3>Debug Information:</h3>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{debugInfo}</pre>
        </div>
      )}
      
      <div id="response-container"></div>
    </div>
  );
}
