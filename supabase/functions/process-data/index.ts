
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/db.ts';
import { downloadFileContent } from '../_shared/storage.ts';
import { countRows, extractPostcodes, MAX_ROWS, generatePlaceholderReport, generatePlaceholderExcel } from '../_shared/file-processing.ts';
import { scrapePlaceholders, getScraperForType, countMatches } from '../_shared/scrapers.ts';
import { createReport, updateContactStatus } from '../_shared/db.ts';
import { sendEmail, buildTooManyAddressesEmail, buildAdminReportEmail } from '../_shared/email.ts';
import { PostcodeResult } from '../_shared/types.ts';

/**
 * Process submitted data
 */
serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🔄 Data processing request received");
    
    // Get parameters
    const url = new URL(req.url);
    const contactId = url.searchParams.get("contact_id");
    const scraperType = url.searchParams.get("scraper_type") || "placeholder";
    
    if (!contactId) {
      console.error("Missing required parameter: contact_id");
      return new Response(
        JSON.stringify({ error: "Missing required parameter: contact_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Processing data for contact: ${contactId}, using scraper: ${scraperType}`);
    
    // Get contact details
    const supabase = getSupabaseClient();
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();
      
    if (contactError || !contact) {
      console.error("Error fetching contact:", contactError);
      return new Response(
        JSON.stringify({ error: "Contact not found", details: contactError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Processing data for ${contact.full_name} (${contact.email})`);
    
    // Download file
    let fileContent: string;
    try {
      fileContent = await downloadFileContent("approved-uploads", contact.approved_file_path);
    } catch (downloadError) {
      console.error("Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file", details: downloadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate row count
    const rowCount = countRows(fileContent);
    console.log(`File contains ${rowCount} rows`);
    
    if (rowCount > MAX_ROWS) {
      console.log(`Row count (${rowCount}) exceeds maximum allowed (${MAX_ROWS})`);
      
      // Update contact status
      await updateContactStatus(contactId, "too_many_addresses");
      
      // Send email to client about too many addresses
      await sendEmail(
        contact.email,
        "Regarding Your Address List Submission - Lintels.in",
        buildTooManyAddressesEmail(contact, MAX_ROWS)
      );
      
      return new Response(
        JSON.stringify({
          message: "Address file exceeds maximum allowed rows",
          contact_id: contactId,
          status: "too_many_addresses",
          email_sent: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract postcodes
    const postcodes = extractPostcodes(fileContent);
    console.log(`Extracted ${postcodes.length} unique postcodes`);
    
    // Scrape data
    let scrapingResults: PostcodeResult[];
    try {
      const scraper = getScraperForType(scraperType);
      scrapingResults = await scraper(postcodes);
    } catch (scrapingError) {
      console.error("Error during scraping:", scrapingError);
      // Use original postcodes with no matches as fallback
      scrapingResults = postcodes;
    }
    
    // Generate HTML report
    const htmlReport = generatePlaceholderReport(scrapingResults);
    
    // Create report record
    const matchesCount = countMatches(scrapingResults);
    const reportId = await createReport(contactId, postcodes.length, matchesCount, htmlReport);
    console.log(`Created report with ID: ${reportId}`);
    
    // Update contact status
    await updateContactStatus(contactId, "processed");
    
    // Send email to admin with Excel report
    const projectRef = Deno.env.get('PROJECT_REF') || 'uejymkggevuvuerldzhv';
    const viewReportUrl = `https://${projectRef}.functions.supabase.co/process-data?action=send_results&contact_id=${contactId}&report_id=${reportId}`;
    
    // Generate Excel report
    const excelReport = generatePlaceholderExcel(scrapingResults, contact);
    
    // Send email notification to admin with the report
    const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
    const reportFileName = `lintels-report-${contact.full_name.replace(/\s+/g, '-')}-${contact.company.replace(/\s+/g, '-')}`;
    
    await sendEmail(
      adminEmail,
      `[Lintels] Address Results - ${contact.company} - ${contact.full_name}`,
      buildAdminReportEmail(contact, postcodes.length, matchesCount, viewReportUrl),
      undefined,
      {
        content: excelReport,
        filename: `${reportFileName}.xls`,
        contentType: 'application/vnd.ms-excel'
      }
    );
    
    // Return success response
    return new Response(
      JSON.stringify({
        message: "Data processing completed successfully",
        contact_id: contactId,
        report_id: reportId,
        postcodes_count: postcodes.length,
        matches_count: matchesCount,
        status: "processed"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('❌ ERROR in process-data function:', err);
    
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
