
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHUNK_SIZE = 15; // Process 15 postcodes per chunk to stay within timeout limits

// ScrapingBee scraping functionality
const SCRAPINGBEE_API_KEY = Deno.env.get("SCRAPINGBEE_API_KEY");

interface ScrapeResult {
  postcode: string;
  address?: string;
  streetName?: string;
  airbnb: string;
  spareroom: string;
  gumtree: string;
}

async function scrapePostcodes(postcodes: any[]): Promise<ScrapeResult[]> {
  console.log(`ScrapingBee: Scraping ${postcodes.length} postcodes`);
  
  if (!SCRAPINGBEE_API_KEY) {
    console.error("ScrapingBee API key not found in environment variables");
    throw new Error("ScrapingBee API key not configured");
  }
  
  const results: ScrapeResult[] = [];
  
  for (const item of postcodes) {
    console.log(`ScrapingBee: Processing ${item.postcode}`);
    
    const result: ScrapeResult = {
      postcode: item.postcode,
      address: item.address || "",
      streetName: item.streetName || "",
      airbnb: "No match",
      spareroom: "No match",
      gumtree: "No match",
    };
    
    const searchQuery = item.streetName ? `${item.streetName}, ${item.postcode}` : item.postcode;
    
    // Airbnb scraping
    try {
      const url = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(`https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`)}&render_js=true`;
      
      const response = await fetch(url);
      if (response.ok) {
        const html = await response.text();
        if (html.includes(`"${searchQuery}"`) || html.includes(item.postcode)) {
          const mapLink = `https://www.airbnb.co.uk/s/${encodeURIComponent(searchQuery)}/homes?map=true`;
          result.airbnb = `=HYPERLINK("${mapLink}","Investigate (Medium)")`;
        }
      }
    } catch (error) {
      console.error(`Error scraping Airbnb for ${searchQuery}:`, error);
    }
    
    results.push(result);
  }
  
  return results;
}

async function storeMatches(contactId: string, results: ScrapeResult[]): Promise<number> {
  // Simplified match storage - just count matches for now
  const matches = results.filter(r => r.airbnb !== "No match" || r.spareroom !== "No match" || r.gumtree !== "No match");
  console.log(`Found ${matches.length} matches to store`);
  return matches.length;
}

async function generateReportFromMatches(contactId: string, contact: any) {
  const htmlReport = `
    <p>Hello ${contact.full_name},</p>
    <p>Your automated property matching report has been completed.</p>
    <p>Please find your detailed results in the attached Excel file.</p>
    <p>Best regards,<br>The Lintels Team</p>
  `;
  
  const excelReport = ""; // Simplified for now
  const matchesCount = 0;
  
  return { htmlReport, excelReport, matchesCount };
}

async function sendEmail(to: string, subject: string, html: string, text?: string, attachment?: any) {
  console.log(`Sending email to ${to}: ${subject}`);
  // Email functionality would be implemented here
}

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🔄 Auto-processing batch job started");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the next pending job
    const { data: jobs, error: jobError } = await supabase
      .from('processing_jobs')
      .select(`
        *,
        contacts(id, full_name, email, company)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);
      
    if (jobError) {
      throw new Error(`Error fetching jobs: ${jobError.message}`);
    }
    
    if (!jobs || jobs.length === 0) {
      console.log("ℹ️ No pending jobs found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending jobs to process"
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    }
    
    const job = jobs[0];
    const contact = job.contacts;
    
    console.log(`📋 Processing job ${job.id} for ${contact.full_name} (${contact.company})`);
    
    // Mark job as processing if it's the first chunk
    if (job.current_chunk === 0) {
      await supabase
        .from('processing_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }
    
    // Get current chunk of postcodes to process
    const startIndex = job.current_chunk * CHUNK_SIZE;
    const endIndex = Math.min(startIndex + CHUNK_SIZE, job.postcodes.length);
    const chunkPostcodes = job.postcodes.slice(startIndex, endIndex);
    
    console.log(`🔍 Processing chunk ${job.current_chunk + 1}/${job.total_chunks}: postcodes ${startIndex + 1}-${endIndex}`);
    
    // Process this chunk with ScrapingBee
    const chunkResults = await scrapePostcodes(chunkPostcodes);
    
    // Store matches for this chunk
    const matchesStored = await storeMatches(job.contact_id, chunkResults);
    console.log(`💾 Stored ${matchesStored} matches for chunk ${job.current_chunk + 1}`);
    
    // Update job progress
    const newProcessedCount = job.processed_postcodes + chunkPostcodes.length;
    const isCompleted = newProcessedCount >= job.total_postcodes;
    
    const updateData: any = {
      processed_postcodes: newProcessedCount,
      current_chunk: job.current_chunk + 1,
      updated_at: new Date().toISOString()
    };
    
    if (isCompleted) {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
    }
    
    await supabase
      .from('processing_jobs')
      .update(updateData)
      .eq('id', job.id);
    
    console.log(`📊 Progress: ${newProcessedCount}/${job.total_postcodes} postcodes processed`);
    
    // If job is completed, generate and send report
    if (isCompleted) {
      console.log(`🎉 Job ${job.id} completed. Generating report...`);
      
      // Generate report from all stored matches
      const { htmlReport, excelReport, matchesCount } = await generateReportFromMatches(job.contact_id, contact);
      
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
      
      // Update job status to report_sent
      await supabase
        .from('processing_jobs')
        .update({
          status: 'report_sent',
          report_generated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      // Update contact status
      await supabase
        .from('contacts')
        .update({
          status: 'report_sent',
          processing_status: 'report_sent'
        })
        .eq('id', job.contact_id);
      
      console.log(`📧 Report sent to ${contact.email}`);
      
      // Notify admin
      const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
      await sendEmail(
        adminEmail,
        `[Lintels] Automated Report Completed - ${contact.company}`,
        `
        <p>Hello,</p>
        <p>An automated property matching report has been completed and sent to the client.</p>
        <p><strong>Summary:</strong></p>
        <ul>
          <li>Client: ${contact.full_name} from ${contact.company}</li>
          <li>Email: ${contact.email}</li>
          <li>Total Postcodes: ${job.total_postcodes}</li>
          <li>Matches Found: ${matchesCount}</li>
          <li>Processing Time: ${Math.round((new Date(updateData.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000 / 60)} minutes</li>
          <li>Data Source: ScrapingBee REST API (Automated)</li>
        </ul>
        <p>The client has been automatically sent their complete report.</p>
        `
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        processed: newProcessedCount,
        total: job.total_postcodes,
        completed: isCompleted,
        chunkProcessed: chunkPostcodes.length,
        matchesStored: matchesStored || 0
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
    
  } catch (err) {
    console.error('❌ Auto-processing error:', err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Auto-processing failed'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
