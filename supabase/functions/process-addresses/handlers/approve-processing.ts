
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { extractPostcodesFromContact } from "../utils/postcode-extractor.ts";
import { scrapePostcodes } from "../scraping/bright-data-scraper.ts";
import { generateHtmlReport, generateExcelReport } from "../utils/report-generator.ts";
import { countMatches } from "../utils/report-metrics.ts";
import { createLogger } from "../../_shared/debug-logger.ts";

// Create module-specific logger
const logger = createLogger({ module: 'approve-processing' });

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
  const functionLog = logger.child({ contactId: contact.id });
  functionLog.info(`Starting approval processing for ${contact.full_name} (${contact.email})`);
  functionLog.debug(`Contact details`, {
    id: contact.id,
    name: contact.full_name,
    company: contact.company,
    email: contact.email
  });
  
  // Update contact status to processing
  try {
    functionLog.debug('Updating contact status to processing');
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ 
        status: "processing",
        approved_for_matching: true,
        approved_at: new Date().toISOString()
      })
      .eq("id", contact.id);
      
    if (updateError) {
      functionLog.error("Error updating contact status:", updateError);
      throw new Error(`Failed to update contact status: ${updateError.message}`);
    }
    
    functionLog.info('Contact status updated to processing');
  } catch (error) {
    functionLog.error('Error updating contact status', error);
    throw error;
  }
  
  // Extract postcodes from the address file
  let postcodes: string[];
  try {
    functionLog.debug('Extracting postcodes from contact data');
    postcodes = await functionLog.time(
      'Postcode extraction',
      () => extractPostcodesFromContact(contact)
    );
    functionLog.info(`Extracted ${postcodes.length} postcodes from contact data`);
  } catch (error) {
    functionLog.error('Error extracting postcodes', error);
    throw error;
  }
  
  // Trigger scraping process for each postcode
  let scrapingResults;
  try {
    functionLog.info(`Starting scraping process for ${postcodes.length} postcodes`);
    scrapingResults = await functionLog.time(
      'Bright Data scraping process',
      () => scrapePostcodes(postcodes)
    );
    functionLog.info(`Scraping completed successfully`);
  } catch (error) {
    functionLog.error("Error during scraping process:", error);
    // Create fallback results on error
    functionLog.warn("Creating fallback results due to scraping error");
    scrapingResults = postcodes.map(postcode => ({
      postcode,
      airbnb: { status: "error", message: "Scraping failed" },
      spareroom: { status: "error", message: "Scraping failed" },
      gumtree: { status: "error", message: "Scraping failed" }
    }));
  }
  
  // Generate HTML report
  let htmlReport: string;
  try {
    functionLog.debug("Generating HTML report");
    htmlReport = await functionLog.time(
      'HTML report generation',
      () => generateHtmlReport(scrapingResults)
    );
    functionLog.debug(`HTML report generated (${htmlReport.length} bytes)`);
  } catch (error) {
    functionLog.error('Error generating HTML report', error);
    throw error;
  }
  
  // Create a report record in the database
  let newReportId: string;
  try {
    const matchesCount = countMatches(scrapingResults);
    functionLog.debug(`Creating report record with ${matchesCount} matches`);
    
    const reportData = {
      contact_id: contact.id,
      html_content: htmlReport,
      properties_count: postcodes.length,
      matches_count: matchesCount,
      status: "processed"
    };
    
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert(reportData)
      .select();
      
    if (reportError) {
      functionLog.error("Error creating report:", reportError);
      throw reportError;
    }
    
    newReportId = report[0]?.id;
    functionLog.info(`Created report with ID: ${newReportId}`);
  } catch (error) {
    functionLog.error('Error creating report record', error);
    throw error;
  }
  
  // Update contact status to processed
  try {
    functionLog.debug('Updating contact status to processed');
    await supabase
      .from("contacts")
      .update({ status: "processed" })
      .eq("id", contact.id);
    functionLog.info('Contact status updated to processed');
  } catch (error) {
    functionLog.error('Error updating contact status to processed', error);
    // Don't throw here, continue with email sending
    functionLog.warn('Continuing despite contact status update failure');
  }
  
  // Create a direct link to send results
  const viewReportUrl = `${supabaseUrl}/functions/v1/process-addresses?action=send_results&contact_id=${contact.id}&report_id=${newReportId}`;
  
  // Generate Excel report
  let excelReport;
  try {
    functionLog.debug("Generating Excel report");
    excelReport = await functionLog.time(
      'Excel report generation',
      () => generateExcelReport(scrapingResults, contact)
    );
    functionLog.debug(`Excel report generated`);
  } catch (error) {
    functionLog.error('Error generating Excel report', error);
    throw error;
  }
  
  // Send notification email to the admin with the Excel report attached
  try {
    const reportFileName = `lintels-report-${contact.full_name.replace(/\s+/g, '-')}-${contact.company.replace(/\s+/g, '-')}`;
    
    functionLog.info("Sending report email to admin");
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
          <p><strong>Total Postcodes Processed:</strong> ${postcodes.length}</p>
          <p><strong>Postcodes Requiring Investigation:</strong> ${countMatches(scrapingResults)}</p>
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
        contentType: 'application/vnd.ms-excel'
      }
    );
    
    functionLog.info("Admin report email result:", emailResult);
  } catch (error) {
    functionLog.error('Error sending admin email', error);
    // Don't throw here, continue to return success response
    functionLog.warn('Continuing despite email failure');
  }
  
  // Return success response
  return {
    message: "Address processing completed",
    contact_id: contact.id,
    report_id: newReportId,
    status: "processed",
    postcode_count: postcodes.length,
    matches_count: countMatches(scrapingResults)
  };
}
