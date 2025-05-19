
import { useEffect, useState } from "react";

export default function ApproveProcessingPage() {
  const [status, setStatus] = useState("Processing approval...");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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
    
    // Direct call to the Supabase Edge Function with the full URL
    const supabaseFunctionUrl = `https://uejymkggevuvuerldzhv.functions.supabase.co/process-approval?action=${action}&id=${submissionId}`;
    
    console.log("📤 Sending request to:", supabaseFunctionUrl);

    fetch(supabaseFunctionUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        setIsLoading(false);
        setDebugInfo(prev => `${prev || ''}\n\nResponse status: ${res.status} ${res.statusText}`);
        
        if (res.ok) {
          setStatus("✅ Approval processed successfully.");
          setIsSuccess(true);
          console.log("✅ Approval request succeeded with status:", res.status);
          res.text().then(html => {
            // Adding debug info about the response
            setDebugInfo(prev => `${prev || ''}\n\nResponse content type: ${res.headers.get('content-type')}`);
            
            try {
              // Fix: Check for element existence first, then assign innerHTML
              const responseContainer = document.getElementById('response-container');
              if (responseContainer) {
                responseContainer.innerHTML = html;
                setDebugInfo(prev => `${prev || ''}\n\nResponse HTML loaded into container (${html.length} bytes)`);
              } else {
                setDebugInfo(prev => `${prev || ''}\n\nWarning: response-container element not found in the DOM.`);
              }
            } catch (domError) {
              setDebugInfo(prev => `${prev || ''}\n\nError setting HTML: ${domError.message}`);
            }
          });
        } else {
          res.text().then(text => {
            console.error(`❌ Error from process-approval: ${res.status} ${res.statusText}`, text);
            setStatus(`❌ Error ${res.status}: ${res.statusText}`);
            setErrorDetails(text || "No error details provided by the server");
            setDebugInfo(prev => `${prev || ''}\n\nServer returned error ${res.status}: ${text}`);
          });
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.error("❌ Network error:", err);
        setStatus("❌ Network error sending approval.");
        setErrorDetails(err.message);
        setDebugInfo(prev => `${prev || ''}\n\nNetwork error: ${err.message}\n\nStack: ${err.stack || 'No stack trace available'}`);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Header section similar to site branding */}
      <div className="bg-black py-4 shadow-md">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[hsl(24,85%,50%)]">lintels.in</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-gray-800 bg-opacity-50 shadow-xl">
            <div className="w-16 h-16 border-4 border-t-4 border-t-[hsl(24,85%,50%)] border-gray-400 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-medium text-[hsl(24,85%,50%)]">Processing your request...</h2>
          </div>
        ) : isSuccess ? (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-[hsl(24,85%,50%)] py-4 px-6">
              <h2 className="text-2xl font-bold text-white">Success!</h2>
            </div>
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[hsl(24,85%,50%)] rounded-full flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Thank you! Your file has been successfully submitted for a sample report.</h3>
              </div>
              <p className="text-gray-300 mb-6 text-lg">We will be in touch shortly with your results.</p>
              
              <div className="mt-8 border-t border-gray-700 pt-6">
                <p className="text-sm text-gray-400">If you have any questions, please contact <a href="mailto:support@lintels.in" className="text-[hsl(24,85%,50%)] hover:underline">support@lintels.in</a></p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-red-600 py-4 px-6">
              <h2 className="text-2xl font-bold text-white">{status}</h2>
            </div>
            <div className="p-6">
              {errorDetails && (
                <div className="bg-gray-900 p-4 rounded-md mb-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Error Details:</h3>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words">{errorDetails}</pre>
                </div>
              )}
              
              <div className="mt-6">
                <p className="text-gray-300">If this problem persists, please contact <a href="mailto:support@lintels.in" className="text-[hsl(24,85%,50%)] hover:underline">support@lintels.in</a> with the error details above.</p>
              </div>
            </div>
          </div>
        )}

        {debugInfo && (
          <div className="mt-8 p-6 bg-gray-800 bg-opacity-50 rounded-lg shadow-md text-sm">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">Debug Information:</h3>
            <pre className="bg-gray-900 p-4 rounded text-gray-300 whitespace-pre-wrap break-words text-xs">{debugInfo}</pre>
          </div>
        )}
        
        <div id="response-container" className="mt-6"></div>
      </div>
    </div>
  );
}
