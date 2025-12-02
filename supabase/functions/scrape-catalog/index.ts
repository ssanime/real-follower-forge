import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { catalogUrl, sourceId } = await req.json();
    console.log('📚 Starting catalog scrape for:', catalogUrl);

    if (!catalogUrl) {
      throw new Error('رابط الكتالوج مطلوب');
    }

    let html = '';
    let usedFirecrawl = false;

    // Try Firecrawl first for better results
    if (FIRECRAWL_API_KEY) {
      try {
        console.log('🔥 Trying Firecrawl for catalog...');
        
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: catalogUrl,
            formats: ['html'],
            onlyMainContent: false,
            waitFor: 3000,
            timeout: 60000,
          }),
        });

        if (firecrawlResponse.ok) {
          const data = await firecrawlResponse.json();
          html = data.data?.html || '';
          if (html.length > 500) {
            usedFirecrawl = true;
            console.log('✅ Firecrawl catalog success, HTML length:', html.length);
          }
        } else {
          console.log('⚠️ Firecrawl failed with status:', firecrawlResponse.status);
        }
      } catch (error) {
        console.log('⚠️ Firecrawl error:', error);
      }
    }

    // Fallback to standard fetch
    if (!usedFirecrawl) {
      console.log('📡 Using standard fetch for catalog...');
      const response = await fetch(catalogUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        }
      });
      html = await response.text();
      console.log('📄 Standard fetch HTML length:', html.length);
    }

    // Extract manga URLs from catalog page
    const mangaUrls: string[] = [];
    
    // Pattern 1: WordPress manga theme (post-title links)
    const postTitlePattern = /<h3[^>]*class="[^"]*post-title[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/gi;
    let matches = Array.from(html.matchAll(postTitlePattern));
    
    for (const match of matches) {
      const url = match[1].trim();
      if (url.startsWith('http') && url.includes('/manga/') && !mangaUrls.includes(url)) {
        mangaUrls.push(url);
      }
    }
    console.log('📖 Pattern 1 (post-title) found:', mangaUrls.length);

    // Pattern 2: Direct manga links in list items
    if (mangaUrls.length === 0) {
      const listItemPattern = /<a[^>]+href="(https?:\/\/[^"]+\/manga\/[^"\/]+\/?)"[^>]*>/gi;
      matches = Array.from(html.matchAll(listItemPattern));
      
      for (const match of matches) {
        const url = match[1].trim();
        if (!mangaUrls.includes(url)) {
          mangaUrls.push(url);
        }
      }
      console.log('📖 Pattern 2 (list-item) found:', mangaUrls.length);
    }

    // Pattern 3: Broader search for manga links
    if (mangaUrls.length === 0) {
      const broadPattern = /<a[^>]+href="([^"]+)"[^>]*>[^<]*<\/a>/gi;
      matches = Array.from(html.matchAll(broadPattern));
      
      for (const match of matches) {
        const url = match[1].trim();
        if (url.includes('/manga/') && url.startsWith('http') && !mangaUrls.includes(url)) {
          // Exclude chapter URLs
          if (!url.match(/\/\d+\/?$/)) {
            mangaUrls.push(url);
          }
        }
      }
      console.log('📖 Pattern 3 (broad) found:', mangaUrls.length);
    }

    // Remove duplicates and clean URLs
    const uniqueUrls = [...new Set(mangaUrls)];
    console.log(`📚 Total unique manga URLs found: ${uniqueUrls.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        mangaUrls: uniqueUrls,
        total: uniqueUrls.length,
        usedFirecrawl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Catalog scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
