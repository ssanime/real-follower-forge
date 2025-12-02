import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Starting automatic scraper job...');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get all active scraper sources
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('scraper_sources')
      .select('*')
      .eq('is_active', true);

    if (sourcesError) {
      console.error('❌ Error fetching sources:', sourcesError);
      throw sourcesError;
    }

    console.log(`📚 Found ${sources?.length || 0} active sources`);

    // Get all manga with source URLs for updates
    const { data: mangaList, error: mangaError } = await supabaseAdmin
      .from('manga')
      .select('id, title, source_url, slug')
      .not('source_url', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(20); // Process 20 manga per run to avoid timeout

    if (mangaError) {
      console.error('❌ Error fetching manga:', mangaError);
      throw mangaError;
    }

    console.log(`📖 Found ${mangaList?.length || 0} manga to check for updates`);

    const results = {
      checked: 0,
      updated: 0,
      errors: 0,
      newChapters: 0,
    };

    // Process each manga for new chapters
    for (const manga of mangaList || []) {
      if (!manga.source_url) continue;
      
      try {
        console.log(`🔄 Checking: ${manga.title}`);
        
        // Call scrape-manga function
        const scrapeResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-manga`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sourceUrl: manga.source_url }),
          }
        );

        if (scrapeResponse.ok) {
          const scrapeResult = await scrapeResponse.json();
          results.checked++;
          
          if (scrapeResult.chaptersScraped > 0) {
            results.updated++;
            results.newChapters += scrapeResult.chaptersScraped;
            console.log(`✅ ${manga.title}: ${scrapeResult.chaptersScraped} new chapters`);
          } else {
            console.log(`📖 ${manga.title}: No new chapters`);
          }
        } else {
          results.errors++;
          console.error(`❌ Failed to scrape ${manga.title}`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.errors++;
        console.error(`❌ Error processing ${manga.title}:`, error);
      }
    }

    // Update last_scraped_at for all active sources
    for (const source of sources || []) {
      await supabaseAdmin
        .from('scraper_sources')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', source.id);
    }

    console.log('🎉 Auto-scraper job completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم فحص ${results.checked} مانجا، تحديث ${results.updated}، فصول جديدة: ${results.newChapters}`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Auto-scraper error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
