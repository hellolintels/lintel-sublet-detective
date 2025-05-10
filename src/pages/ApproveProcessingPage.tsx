// ApproveProcessingPage.tsx
import { useEffect, useState } from "react";

export default function ApproveProcessingPage() {
  const [status, setStatus] = useState("Processing approval...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const submissionId = params.get("id"); // ✅ NOW matches Supabase backend

    if (!action || !submissionId) {
      setStatus("❌ Missing required parameters.");
      return;
    }

    const supabaseFunctionUrl = `https://uejymkggevuvuerldzhv.supabase.co/functions/v1/process-approval?action=${action}&id=${submissionId}`;
    console.log("📤 Sending GET to Supabase Edge Function:", supabaseFunctionUrl);

    fetch(supabaseFunctionUrl, {
      method: "GET",
      headers: {
        apikey: "YOUR_ANON_KEY_HERE" // Optional if not using RLS
      }
    })
      .then(res => {
        if (res.ok) {
          setStatus("✅ Approval processed successfully.");
        } else {
          res.text().then(text => {
            console.error("❌ Error from Supabase:", text);
            setStatus(`❌ Error ${res.status}: ${text}`);
          });
        }
      })
      .catch(err => {
        console.error("❌ Network error:", err);
        setStatus("❌ Network error sending approval.");
      });
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>{status}</h1>
    </div>
  );
}
