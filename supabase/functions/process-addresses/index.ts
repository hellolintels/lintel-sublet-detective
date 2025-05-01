
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Property = {
  address: string;
  postcode: string;
  price?: number;
  bedrooms?: number;
  platform?: string;
  url?: string;
};

interface ProcessRequest {
  fileId: string;
  contactId: string;
  emails: string[];
}

// Function to clean and standardize addresses
function cleanAddress(address: string): string {
  if (!address) return '';
  
  // Remove multiple spaces, normalize case
  let cleaned = address.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Remove common abbreviations and standardize
  cleaned = cleaned
    .replace(/\brd\b/g, 'road')
    .replace(/\bst\b/g, 'street')
    .replace(/\bave\b/g, 'avenue')
    .replace(/\bapt\b/g, 'apartment')
    .replace(/\bapt\.\b/g, 'apartment')
    .replace(/\bflat\b/g, 'flat')
    .replace(/\bfl\b/g, 'floor')
    .replace(/\bno\.\b/g, 'number')
    .replace(/\bno\b/g, 'number');
  
  return cleaned;
}

// Function to clean and standardize postcodes
function cleanPostcode(postcode: string): string {
  if (!postcode) return '';
  
  // Remove all spaces and convert to uppercase
  let cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  
  // Format UK postcode with space in the correct position
  if (/^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/i.test(cleaned)) {
    const inward = cleaned.slice(-3);
    const outward = cleaned.slice(0, -3);
    cleaned = `${outward} ${inward}`;
  }
  
  return cleaned;
}

// Function to compare two properties and determine if they're the same location
function compareProperties(prop1: Property, prop2: Property): boolean {
  // If postcodes don't match at all, they're different properties
  if (!prop1.postcode || !prop2.postcode) return false;
  
  const cleanedPostcode1 = cleanPostcode(prop1.postcode);
  const cleanedPostcode2 = cleanPostcode(prop2.postcode);
  
  // If postcodes don't match, they're different properties
  if (cleanedPostcode1 !== cleanedPostcode2) return false;
  
  // If addresses are provided, compare them as well for more accuracy
  if (prop1.address && prop2.address) {
    const cleanedAddr1 = cleanAddress(prop1.address);
    const cleanedAddr2 = cleanAddress(prop2.address);
    
    // Simple string matching - can be improved with fuzzy matching
    if (cleanedAddr1 === cleanedAddr2) return true;
    
    // Check if one address contains the other (for partial matches)
    if (cleanedAddr1.includes(cleanedAddr2) || cleanedAddr2.includes(cleanedAddr1)) return true;
    
    // Here you could implement more sophisticated matching like:
    // - Levenshtein distance for typos
    // - Token-based matching (comparing individual parts of addresses)
    // - Geocoding to compare actual coordinates
    
    return false;
  }
  
  // If no address info, just rely on postcode match
  return true;
}

// Function to find matches between user properties and platform listings
function findMatches(userProperties: Property[], platformListings: Property[]): Record<string, Property[]> {
  const matches: Record<string, Property[]> = {};
  
  // For each property the user submitted
  for (const userProp of userProperties) {
    const key = `${cleanAddress(userProp.address)}_${cleanPostcode(userProp.postcode)}`;
    matches[key] = [];
    
    // Find all matching properties from platform listings
    for (const listing of platformListings) {
      if (compareProperties(userProp, listing)) {
        matches[key].push(listing);
      }
    }
  }
  
  return matches;
}

// Mock function to get platform listings (in production this would fetch from a database)
async function getPlatformListings(supabase: any): Promise<Property[]> {
  // In production, this would fetch real data from a database or API
  // For now, we'll return an empty array as we don't have actual listings yet
  return [];
  
  // Example of how this would work with real data:
  // const { data, error } = await supabase
  //   .from('platform_listings')
  //   .select('*');
  // return data || [];
}

// Function to process CSV data
function processCSV(csvData: string): Property[] {
  try {
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true
    });
    
    if (results.errors && results.errors.length > 0) {
      console.error("CSV parsing errors:", results.errors);
    }
    
    // Map the CSV data to our Property type
    return (results.data as any[]).map(row => {
      const property: Property = {
        address: row.address || row.Address || '',
        postcode: row.postcode || row.Postcode || row.postal_code || row.PostalCode || '',
        price: row.price ? parseFloat(row.price) : undefined,
        bedrooms: row.bedrooms ? parseInt(row.bedrooms) : undefined
      };
      return property;
    }).filter(p => p.address || p.postcode); // Filter out rows with no address or postcode
  } catch (error) {
    console.error("Error processing CSV:", error);
    return [];
  }
}

// Function to generate HTML report
function generateHTMLReport(matches: Record<string, Property[]>): string {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .property { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .match { margin-left: 20px; padding: 10px; background-color: #f9f9f9; margin-bottom: 10px; }
        h1 { color: #333366; }
        h2 { color: #666; }
        .platform { font-weight: bold; color: #333; }
        .price { color: #009900; font-weight: bold; }
        .no-matches { color: #cc0000; font-style: italic; }
      </style>
    </head>
    <body>
      <h1>Lintels Property Match Report</h1>
      <p>The following report shows potential matches for your properties:</p>
  `;
  
  let totalMatches = 0;
  let propertiesWithMatches = 0;
  
  Object.keys(matches).forEach(key => {
    const [address, postcode] = key.split('_');
    const propertyMatches = matches[key];
    
    html += `
      <div class="property">
        <h2>Property: ${address || 'N/A'}, ${postcode || 'N/A'}</h2>
    `;
    
    if (propertyMatches && propertyMatches.length > 0) {
      propertiesWithMatches++;
      totalMatches += propertyMatches.length;
      
      html += `<p>Found ${propertyMatches.length} potential match(es):</p>`;
      
      propertyMatches.forEach(match => {
        html += `
          <div class="match">
            <p class="platform">Platform: ${match.platform || 'Unknown'}</p>
            <p>Address: ${match.address || 'N/A'}</p>
            <p>Postcode: ${match.postcode || 'N/A'}</p>
            ${match.price ? `<p class="price">Price: £${match.price}</p>` : ''}
            ${match.bedrooms ? `<p>Bedrooms: ${match.bedrooms}</p>` : ''}
            ${match.url ? `<p><a href="${match.url}" target="_blank">View Listing</a></p>` : ''}
          </div>
        `;
      });
    } else {
      html += `<p class="no-matches">No matches found for this property.</p>`;
    }
    
    html += `</div>`;
  });
  
  html += `
      <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px;">
        <p>Summary: Found ${totalMatches} match(es) across ${propertiesWithMatches} properties.</p>
        <p>Report generated by Lintels on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create Supabase client with admin privileges for server-side operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { fileId, contactId, emails } = await req.json() as ProcessRequest;
    
    if (!fileId || !contactId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get contact information
    const { data: contactData, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    
    if (contactError) {
      console.error("Error fetching contact:", contactError);
      return new Response(
        JSON.stringify({ error: "Could not retrieve contact information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get file data from contact record if base64 encoded
    let csvData = '';
    if (contactData.file_data) {
      // Decode base64 file data
      const binary = atob(contactData.file_data);
      csvData = binary;
    } else {
      return new Response(
        JSON.stringify({ error: "No file data found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Process the CSV data
    const userProperties = processCSV(csvData);
    
    if (userProperties.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid properties found in CSV" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get platform listings
    const platformListings = await getPlatformListings(supabaseAdmin);
    
    // Find matches
    const matches = findMatches(userProperties, platformListings);
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(matches);
    
    // Store the report in Supabase
    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('reports')
      .insert({
        contact_id: contactId,
        html_content: htmlReport,
        properties_count: userProperties.length,
        matches_count: Object.values(matches).flat().length,
        status: 'completed'
      })
      .select()
      .single();
    
    if (reportError) {
      console.error("Error saving report:", reportError);
    }
    
    // Update contact status
    await supabaseAdmin
      .from('contacts')
      .update({ status: 'processed' })
      .eq('id', contactId);
    
    // Here you would typically call another function to email the report
    // This would involve setting up an email service like Resend, SendGrid, etc.
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Address processing completed", 
        properties_processed: userProperties.length,
        report_id: reportData?.id || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing addresses:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
