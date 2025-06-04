
export async function callRailwayAPI(railwayPayload: any) {
  const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
  const railwayApiKey = Deno.env.get('RAILWAY_API_KEY');
  
  if (!railwayApiUrl || !railwayApiKey) {
    throw new Error("Railway API credentials not configured");
  }
  
  console.log(`🔄 Sending ${railwayPayload.postcodes.length} postcodes to Railway API`);
  
  const railwayResponse = await fetch(`${railwayApiUrl}/api/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${railwayApiKey}`
    },
    body: JSON.stringify(railwayPayload)
  });
  
  if (!railwayResponse.ok) {
    const errorText = await railwayResponse.text();
    throw new Error(`Railway API error: ${railwayResponse.status} - ${errorText}`);
  }
  
  const railwayResult = await railwayResponse.json();
  console.log(`✅ Railway job started:`, railwayResult);
  
  return railwayResult;
}
