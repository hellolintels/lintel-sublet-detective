import { useEffect, useState } from "react";

export default function ApproveProcessingPage() {
  const [status, setStatus] = useState("Processing approval...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const contactId = params.get("contact_id");

    if (!action || !contactId) {
      setStatus("Missing required parameters.");
      return;
    }

    fetch("https://uejymkggevuvuuerldzhv.supabase.co/functions/v1/process-addresses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: action,
        contact_id: contactId
      })
    })
      .then((res) => {
        if (res.ok) {
          setStatus("Approval processed successfully.");
        } else {
          setStatus(`Error: ${res.status}`);
        }
      })
      .catch((err) => {
        console.error(err);
        setStatus("Error sending approval.");
      });
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>{status}</h1>
    </div>
  );
}
