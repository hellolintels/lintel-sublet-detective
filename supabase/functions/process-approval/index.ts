import { useEffect, useState } from "react";

export default function ApproveProcessingPage() {
  const [status, setStatus] = useState("Processing approval...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const id = params.get("id");

    if (!action || !id) {
      setStatus("❌ Missing required parameters.");
      return;
    }

    const supabaseUrl = "https://uejymkggevuvuerldzhv.supabase.co/functions/v1/process-approval";
    const fullUrl = `${supabaseUrl}?action=${action}&id=${id}`;

    console.log("Calling Supabase function:", fullUrl);

    fetch(fullUrl, {
      method: "GET",
      headers: {
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", // works in Vercel
        "Content-Type": "application/json"
      }
    })
      .then((res) => {
        if (res.ok) {
          return res.text().then((html) => {
            document.documentElement.innerHTML = html;
          });
        } else {
          return res.text().then((text) => {
            console.error("Supabase function error:", text);
            setStatus(`❌ Error ${res.status}: ${text}`);
          });
        }
      })
      .catch((err) => {
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
