
import { getSupabaseClient } from '../../_shared/db.ts';
import { PostcodeResult } from '../../_shared/types.ts';
import { generatePlaceholderReport, generatePlaceholderExcel } from '../../_shared/file-processing.ts';

/**
 * Store individual matches in the database
 */
export async function storeMatches(contactId: string, scrapingResults: PostcodeResult[]): Promise<number> {
  const supabase = getSupabaseClient();
  let storedCount = 0;
  
  console.log(`Storing matches for contact ${contactId}`);
  
  for (const result of scrapingResults) {
    // For each postcode result, check if it has matches
    if (result.matches && result.matches.length > 0) {
      for (const match of result.matches) {
        try {
          const matchData = {
            contact_id: contactId,
            postcode: result.postcode,
            address: result.address || null,
            platform: match.platform,
            matched_listing_url: match.url,
            listing_title: match.details?.title || null,
            listing_details: match.details || null,
            outcome: 'investigate', // Potential matches need investigation
            notes: null
          };
          
          const { error } = await supabase
            .from('match_results')
            .insert(matchData);
            
          if (error) {
            console.error('Error storing match:', error);
          } else {
            storedCount++;
          }
        } catch (error) {
          console.error('Error processing match:', error);
        }
      }
    } else {
      // Store a "no match" entry for tracking purposes
      try {
        const noMatchData = {
          contact_id: contactId,
          postcode: result.postcode,
          address: result.address || null,
          platform: 'bright-data',
          matched_listing_url: '',
          outcome: 'no_match',
          notes: result.error || 'No matches found'
        };
        
        const { error } = await supabase
          .from('match_results')
          .insert(noMatchData);
          
        if (error) {
          console.error('Error storing no-match result:', error);
        } else {
          storedCount++;
        }
      } catch (error) {
        console.error('Error processing no-match:', error);
      }
    }
  }
  
  console.log(`Successfully stored ${storedCount} match results`);
  return storedCount;
}

/**
 * Generate report from stored matches for a contact
 */
export async function generateReportFromMatches(contactId: string, contact: any) {
  const supabase = getSupabaseClient();
  
  console.log(`Generating report from stored matches for contact ${contactId}`);
  
  // Fetch all matches for this contact
  const { data: matches, error } = await supabase
    .from('match_results')
    .select('*')
    .eq('contact_id', contactId)
    .order('postcode', { ascending: true });
    
  if (error) {
    console.error('Error fetching matches:', error);
    throw new Error(`Failed to fetch matches: ${error.message}`);
  }
  
  if (!matches || matches.length === 0) {
    throw new Error('No matches found for this contact');
  }
  
  // Convert matches back to PostcodeResult format for report generation
  const postcodeResults: PostcodeResult[] = [];
  const postcodeMap = new Map<string, PostcodeResult>();
  
  for (const match of matches) {
    const postcode = match.postcode;
    
    if (!postcodeMap.has(postcode)) {
      postcodeMap.set(postcode, {
        postcode,
        address: match.address,
        matches: []
      });
    }
    
    const postcodeResult = postcodeMap.get(postcode)!;
    
    // Only add matches marked as "investigate" that have valid URLs
    if (match.outcome === 'investigate' && match.matched_listing_url && match.matched_listing_url.length > 0) {
      postcodeResult.matches!.push({
        platform: match.platform,
        url: match.matched_listing_url,
        details: match.listing_details
      });
    }
  }
  
  // Convert map to array
  postcodeResults.push(...postcodeMap.values());
  
  // Count total matches
  const matchesCount = postcodeResults.reduce((total, result) => {
    return total + (result.matches?.length || 0);
  }, 0);
  
  console.log(`Generated report with ${matchesCount} matches from ${postcodeResults.length} postcodes`);
  
  // Generate HTML and Excel reports
  const htmlReport = generatePlaceholderReport(postcodeResults);
  const excelReport = generatePlaceholderExcel(postcodeResults, contact);
  
  return {
    htmlReport,
    excelReport,
    matchesCount,
    postcodesCount: postcodeResults.length
  };
}
