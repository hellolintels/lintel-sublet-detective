import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getContactById } from './utils/get-contact.ts';
import { extractPostcodes } from './utils/postcode-extractor.ts';
import { downloadFileContent } from '../_shared/storage.ts';
import { countRows, MAX_ROWS } from '../_shared/file-processing.ts';
import { updateContactStatus, createReport } from '../_shared/db.ts';
import { sendEmail, buildTooManyAddressesEmail, buildAdminReportEmail } from '../_shared/email.ts';
import { storeMatches, generateReportFromMatches } from './utils/match-processor.ts';
import { scrapePostcodes } from './scraping/scraping-bee-scraper.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🔄 Process addresses request received");
    
    const { contactId, action, reportId, postcodes, testType } = await req.json();
    
    // Handle different actions
    if (action === 'send_results') {
      if (!contactId) {
        console.error("Missing required parameter: contactId for send_results");
        return new Response(
          JSON.stringify({ error: "Missing required parameter: contactId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handleSendResults(contactId, reportId);
    } else if (action === 'approve_processing') {
      if (!contactId) {
        console.error("Missing required parameter: contactId for approve_processing");
        return new Response(
          JSON.stringify({ error: "Missing required parameter: contactId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handleApproveProcessing(contactId);
    } else if (action === 'test_scrapingbee') {
      return await handleTestScrapingBee(postcodes, testType);
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action specified" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error('❌ ERROR in process-addresses function:', err);
    
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleTestScrapingBee(postcodes: string[], testType: string = 'basic') {
  console.log(`🧪 Testing ScrapingBee connection with ${postcodes?.length || 0} postcodes`);
  
  if (!postcodes || !Array.isArray(postcodes) || postcodes.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: "Missing or invalid postcodes array",
        connectionStatus: "error",
        connectionError: "No postcodes provided for testing"
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Convert postcodes to the format expected by the scraper
    const postcodeData = postcodes.map(postcode => ({
      postcode: postcode.trim(),
      address: `Test address for ${postcode}`,
      streetName: undefined
    }));

    console.log(`🔍 Starting ScrapingBee test scraping for postcodes: ${postcodes.join(', ')}`);
    
    // Test the ScrapingBee API connection
    const scrapingResults = await scrapePostcodes(postcodeData);
    
    console.log(`✅ ScrapingBee test completed successfully`);
    
    // Format results for the test component
    const formattedResults = scrapingResults.map(result => ({
      postcode: result.postcode,
      airbnb: formatPlatformResult(result.airbnb),
      spareroom: formatPlatformResult(result.spareroom),
      gumtree: formatPlatformResult(result.gumtree)
    }));

    return new Response(
      JSON.stringify({
        results: formattedResults,
        connectionStatus: "success",
        testType: testType,
        message: `Successfully tested ${postcodes.length} postcodes using ScrapingBee REST API`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ ScrapingBee test failed:', error);
    
    return new Response(
      JSON.stringify({
        connectionStatus: "error",
        connectionError: error.message || 'Unknown error occurred during testing',
        testType: testType,
        message: "ScrapingBee connection test failed"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

function formatPlatformResult(platformResult: any) {
  if (!platformResult) {
    return { status: "error", message: "No result data" };
  }
  
  // Handle different result statuses
  if (platformResult.status === "investigate") {
    return {
      status: "investigate",
      count: platformResult.count || 0,
      url: platformResult.url
    };
  } else if (platformResult.status === "no_match") {
    return {
      status: "no match",
      count: 0,
      url: platformResult.url
    };
  } else if (platformResult.status === "error") {
    return {
      status: "error",
      message: platformResult.message || "Scraping error"
    };
  }
  
  // Default fallback
  return {
    status: platformResult.status || "error",
    count: platformResult.count || 0,
    url: platformResult.url,
    message: platformResult.message
  };
}

async function handleApproveProcessing(contactId: string) {
  console.log(`Processing addresses for contact: ${contactId}`);
  
  // Get contact details
  const contact = await getContactById(contactId);
  console.log(`Processing addresses for ${contact.full_name} (${contact.email})`);
  
  // Download and validate file
  const fileContent = await downloadFileContent("approved-uploads", contact.approved_file_path);
  const rowCount = countRows(fileContent);
  console.log(`File contains ${rowCount} rows`);
  
  if (rowCount > MAX_ROWS) {
    console.log(`Row count (${rowCount}) exceeds maximum allowed (${MAX_ROWS})`);
    
    await updateContactStatus(contactId, "too_many_addresses");
    
    await sendEmail(
      contact.email,
      "Regarding Your Address List Submission - Lintels.in",
      buildTooManyAddressesEmail(contact, MAX_ROWS)
    );
    
    return new Response(
      JSON.stringify({
        message: "Address file exceeds maximum allowed rows",
        contact_id: contactId,
        status: "too_many_addresses"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Extract postcodes and start scraping
  const postcodes = extractPostcodes(fileContent);
  console.log(`Extracted ${postcodes.length} unique postcodes`);
  
  // Update status to scraping
  await updateContactStatus(contactId, "scraping");
  
  // Use ScrapingBee for real data
  console.log("Starting ScrapingBee scraping...");
  const scrapingResults = await scrapePostcodes(postcodes);
  console.log("ScrapingBee scraping completed");
  
  // Store individual matches in the database
  const matchesStored = await storeMatches(contactId, scrapingResults);
  console.log(`Stored ${matchesStored} matches for contact ${contactId}`);
  
  // Update contact status to indicate matches were found
  await updateContactStatus(contactId, "matches_found");
  
  // Send notification to admin about matches ready for review
  const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
  const projectRef = Deno.env.get('PROJECT_REF') || 'uejymkggevuvuerldzhv';
  const dashboardUrl = `https://${projectRef}.supabase.co/dashboard/project/${projectRef}`;
  
  await sendEmail(
    adminEmail,
    `[Lintels] Property Matches Ready for Review - ${contact.company}`,
    `
    <p>Hello,</p>
    <p>Property matches have been found using ScrapingBee for ${contact.full_name} from ${contact.company}.</p>
    <p><strong>Summary:</strong></p>
    <ul>
      <li>Total Postcodes: ${postcodes.length}</li>
      <li>Matches Found: ${matchesStored}</li>
      <li>Contact Email: ${contact.email}</li>
      <li>Data Source: ScrapingBee REST API</li>
    </ul>
    <p>Please review the matches in the admin dashboard. All "no match" results include search URLs for audit verification.</p>
    <p><a href="${dashboardUrl}">View Admin Dashboard</a></p>
    `
  );
  
  return new Response(
    JSON.stringify({
      message: "Data processing completed successfully",
      contact_id: contactId,
      postcodes_count: postcodes.length,
      matches_count: matchesStored,
      status: "matches_found",
      data_source: "scrapingbee_api"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleSendResults(contactId: string, reportId: string) {
  console.log(`Sending results for contact: ${contactId}, report: ${reportId}`);
  
  // Get contact details
  const contact = await getContactById(contactId);
  
  // Generate report from stored matches
  const { htmlReport, excelReport, matchesCount } = await generateReportFromMatches(contactId, contact);
  
  // Create report record if not provided
  let finalReportId = reportId;
  if (!reportId) {
    finalReportId = await createReport(contactId, 0, matchesCount, htmlReport);
  }
  
  // Send email to client with results
  const reportFileName = `lintels-report-${contact.full_name.replace(/\s+/g, '-')}-${contact.company.replace(/\s+/g, '-')}`;
  
  await sendEmail(
    contact.email,
    `Your Lintels Property Report - ${contact.company}`,
    htmlReport,
    undefined,
    {
      content: excelReport,
      filename: `${reportFileName}.xls`,
      contentType: 'application/vnd.ms-excel'
    }
  );
  
  // Update contact status
  await updateContactStatus(contactId, "report_sent");
  
  return new Response(
    JSON.stringify({
      message: "Results sent successfully",
      contact_id: contactId,
      report_id: finalReportId,
      status: "report_sent"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
