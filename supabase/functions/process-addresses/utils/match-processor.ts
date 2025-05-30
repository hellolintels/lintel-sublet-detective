
import { getSupabaseClient } from '../../_shared/db.ts';
import { PostcodeResult } from '../../_shared/types.ts';
import { generatePlaceholderReport, generatePlaceholderExcel } from '../../_shared/file-processing.ts';

/**
 * Store individual matches in the database with proper URL handling
 */
export async function storeMatches(contactId: string, scrapingResults: any[]): Promise<number> {
  const supabase = getSupabaseClient();
  let storedCount = 0;
  
  console.log(`Storing matches for contact ${contactId}`);
  
  for (const result of scrapingResults) {
    // Process each platform result (airbnb, spareroom, gumtree)
    const platforms = ['airbnb', 'spareroom', 'gumtree'];
    
    for (const platform of platforms) {
      const platformResult = result[platform];
      
      if (!platformResult) continue;
      
      try {
        if (platformResult.status === 'investigate' && platformResult.matches) {
          // Store each individual match
          for (const match of platformResult.matches) {
            const matchData = {
              contact_id: contactId,
              postcode: result.postcode,
              address: result.address || null,
              platform: platform,
              matched_listing_url: match.url || platformResult.url,
              listing_title: match.title || null,
              listing_details: match,
              outcome: 'investigate',
              notes: `Confidence: ${match.confidenceScore || 0.8}`
            };
            
            const { error } = await supabase
              .from('match_results')
              .insert(matchData);
              
            if (error) {
              console.error('Error storing match:', error);
            } else {
              storedCount++;
            }
          }
        } else {
          // Store "no match" or "error" with search URL for audit trail
          const noMatchData = {
            contact_id: contactId,
            postcode: result.postcode,
            address: result.address || null,
            platform: platform,
            matched_listing_url: platformResult.url || '', // Always store the search URL
            outcome: platformResult.status === 'error' ? 'no_match' : platformResult.status,
            notes: platformResult.message || (platformResult.status === 'no_match' ? 'No matching listings found' : null)
          };
          
          const { error } = await supabase
            .from('match_results')
            .insert(noMatchData);
            
          if (error) {
            console.error('Error storing no-match result:', error);
          } else {
            storedCount++;
          }
        }
      } catch (error) {
        console.error('Error processing platform result:', error);
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
    
    // Add matches marked as "investigate" that have valid URLs
    if (match.outcome === 'investigate' && match.matched_listing_url && match.matched_listing_url.length > 0) {
      postcodeResult.matches!.push({
        platform: match.platform,
        url: match.matched_listing_url,
        details: match.listing_details
      });
    }
    
    // Also track "no_match" results with URLs for audit trail
    if (match.outcome === 'no_match' && match.matched_listing_url && match.matched_listing_url.length > 0) {
      // Add no_match entries to a separate array for audit purposes
      if (!postcodeResult.no_matches) {
        postcodeResult.no_matches = [];
      }
      postcodeResult.no_matches.push({
        platform: match.platform,
        url: match.matched_listing_url,
        details: { reason: match.notes || 'No matches found' }
      });
    }
  }
  
  // Convert map to array
  postcodeResults.push(...postcodeMap.values());
  
  // Count total matches (investigate only)
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
