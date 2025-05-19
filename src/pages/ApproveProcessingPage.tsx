
// ApproveProcessingPage.tsx
import { useEffect, useState } from "react";

export default function ApproveProcessingPage() {
  const [status, setStatus] = useState("Processing approval...");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const submissionId = params.get("id");

    if (!action || !submissionId) {
      setStatus("❌ Missing required parameters.");
      setIsLoading(false);
      return;
    }

    // Use the process-approval Edge Function directly
    const supabaseFunctionUrl = `https://uejymkggevuvuerldzhv.supabase.co/functions/v1/process-approval?action=${action}&id=${submissionId}`;
    console.log("📤 Sending request to:", supabaseFunctionUrl);

    fetch(supabaseFunctionUrl)
      .then(res => {
        setIsLoading(false);
        if (res.ok) {
          setStatus("✅ Approval processed successfully.");
          res.text().then(html => {
            // Fix: Check for element existence first, then assign innerHTML
            const responseContainer = document.getElementById('response-container');
            if (responseContainer) {
              responseContainer.innerHTML = html;
            }
          });
        } else {
          res.text().then(text => {
            console.error("❌ Error from process-approval:", text);
            setStatus(`❌ Error ${res.status}`);
            setErrorDetails(text);
          });
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.error("❌ Network error:", err);
        setStatus("❌ Network error sending approval.");
        setErrorDetails(err.message);
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
      
      <div id="response-container"></div>
    </div>
  );
}
