
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { extractPostcodesFromContact } from "../utils/postcode-extractor.ts";
import { scrapePostcodes } from "../scraping/bright-data-scraper.ts";
import { generateHtmlReport, generateExcelReport } from "../utils/report-generator.ts";
import { countMatches } from "../utils/report-metrics.ts";

/**
 * Handle approval of processing a contact's address file
 * @param supabase Supabase client
 * @param contact Contact details
 * @param reportId Optional existing report ID
 * @param supabaseUrl Supabase URL for creating links
 * @returns Response object
 */
export async function handleApproveProcessing(
  supabase: ReturnType<typeof createClient>,
  contact: any,
  reportId: string | undefined,
  supabaseUrl: string
) {
  console.log(`Starting approve processing for contact: ${contact.id}`);
  console.log(`Contact full name: ${contact.full_name}, email: ${contact.email}`);
  
  // Update contact status to processing
  const { error: updateError } = await supabase
    .from("contacts")
    .update({ 
      status: "processing",
      approved_for_matching: true,
      approved_at: new Date().toISOString()
    })
    .eq("id", contact.id);
    
  if (updateError) {
    console.error("Error updating contact status:", updateError);
    throw updateError;
  }
  
  console.log(`Updated contact status to 'processing' and set approved_for_matching=true`);
  
  // Extract postcodes from the address file
  const postcodes = extractPostcodesFromContact(contact);
  
  // Trigger scraping process for each postcode
  console.log("Starting Bright Data scraping process for postcodes...");
  let scrapingResults;
  
  try {
    // This will be an async process that scrapes each platform for each postcode
    scrapingResults = await scrapePostcodes(postcodes);
    console.log("Scraping completed successfully");
  } catch (error) {
    console.error("Error during scraping process:", error);
    scrapingResults = postcodes.map(postcode => ({
      postcode,
      airbnb: { status: "error", message: "Scraping failed" },
      spareroom: { status: "error", message: "Scraping failed" },
      gumtree: { status: "error", message: "Scraping failed" }
    }));
  }
  
  // Generate HTML report from scraping results - still needed for database storage
  console.log("Generating HTML report from scraping results...");
  const htmlReport = generateHtmlReport(scrapingResults);
  
  // Create a report record in the database
  const reportData = {
    contact_id: contact.id,
    html_content: htmlReport,
    properties_count: postcodes.length,
    matches_count: countMatches(scrapingResults),
    status: "processed"
  };
  
  console.log("Creating report with data:", {
    contact_id: reportData.contact_id,
    properties_count: reportData.properties_count,
    matches_count: reportData.matches_count,
    status: reportData.status
  });
  
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert(reportData)
    .select();
    
  if (reportError) {
    console.error("Error creating report:", reportError);
    throw reportError;
  }
  
  const newReportId = report[0]?.id;
  console.log(`Created report with ID: ${newReportId || 'unknown'}`);
  
  // Update contact status to processed
  await supabase
    .from("contacts")
    .update({ status: "processed" })
    .eq("id", contact.id);
  
  // Create a direct link to send results
  const viewReportUrl = `${supabaseUrl}/functions/v1/process-addresses?action=send_results&contact_id=${contact.id}&report_id=${newReportId}`;
  
  // Generate Excel report
  console.log("Generating Excel report from scraping results...");
  const excelReport = generateExcelReport(scrapingResults, contact);
  
  // Send notification email to the admin with the Excel report attached
  console.log("Sending report email to admin...");
  
  const reportFileName = `lintels-report-${contact.full_name.replace(/\s+/g, '-')}-${contact.company.replace(/\s+/g, '-')}`;
  const emailResult = await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] Address Results - ${contact.company} - ${contact.full_name}`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #4CAF50; border-radius: 5px;">
      <h1 style="color: #4CAF50; text-align: center;">Address Matching Report</h1>
      
      <p style="font-size: 16px;">The address matching process for <strong>${contact.full_name}</strong> from <strong>${contact.company}</strong> (${contact.email}) is now complete.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Client Details:</h3>
        <p><strong>Company:</strong> ${contact.company}</p>
        <p><strong>Position:</strong> ${contact.position}</p>
        <p><strong>Full Name:</strong> ${contact.full_name}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Phone:</strong> ${contact.phone}</p>
        
        <h3>Report Summary:</h3>
        <p><strong>Total Postcodes Processed:</strong> ${reportData.properties_count}</p>
        <p><strong>Postcodes Requiring Investigation:</strong> ${reportData.matches_count}</p>
      </div>
      
      <p>The complete report is attached to this email in Excel format (XLS). This report includes hyperlinks to the property listings that require investigation.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${viewReportUrl}" 
           style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 5px; display: inline-block;">
          Mark as Reviewed
        </a>
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `,
    {
      filename: `${reportFileName}.xls`,
      content: Buffer.from(excelReport).toString('base64'),
      type: 'application/vnd.ms-excel'
    }
  );
  
  console.log("Admin report email result:", emailResult);
  
  return new Response(
    JSON.stringify({
      message: "Address processing completed",
      contact_id: contact.id,
      report_id: newReportId,
      status: "processed",
      email_status: emailResult.success ? "sent" : "failed",
      postcode_count: reportData.properties_count,
      matches_count: reportData.matches_count
    }),
    { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}
