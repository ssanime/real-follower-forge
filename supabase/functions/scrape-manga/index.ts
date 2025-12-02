import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import Firecrawl for better scraping with browser support
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceUrl } = await req.json();
    console.log('Starting scrape for URL:', sourceUrl);

    // Validate URL format
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      throw new Error('رابط غير صالح - الرجاء إدخال رابط صحيح');
    }

    // Check if it's a valid URL
    try {
      new URL(sourceUrl);
    } catch {
      throw new Error('رابط غير صالح - الرجاء إدخال رابط صحيح للمانجا');
    }

    // Check if URL starts with http/https
    if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
      throw new Error('الرابط يجب أن يبدأ بـ http:// أو https://');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Use Firecrawl to bypass protection and get clean content with automatic fallback
    let html = '';
    let usedFirecrawl = false;
    
    if (FIRECRAWL_API_KEY) {
      try {
        console.log('Trying Firecrawl API to bypass protection...');
        
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: sourceUrl,
            formats: ['html'],
            onlyMainContent: false,
            waitFor: 2000,
            timeout: 30000, // 30 seconds timeout
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          html = firecrawlData.data?.html || '';
          if (html.length > 100) {
            usedFirecrawl = true;
            console.log('✅ Firecrawl successful, HTML length:', html.length);
          }
        } else {
          console.log('⚠️ Firecrawl failed with status:', firecrawlResponse.status, '- falling back to standard fetch');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log('⚠️ Firecrawl error:', errorMsg, '- falling back to standard fetch');
      }
    }
    
    // Fallback to standard fetch if Firecrawl failed or not available
    if (!usedFirecrawl) {
      console.log('Using standard fetch...');
      const response = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        }
      });
      html = await response.text();
      console.log('Standard fetch HTML length:', html.length);
    }

    // Parse HTML using basic string methods
    const extractText = (html: string, startTag: string, endTag: string): string => {
      const start = html.indexOf(startTag);
      if (start === -1) return '';
      const end = html.indexOf(endTag, start + startTag.length);
      if (end === -1) return '';
      return html.substring(start + startTag.length, end).trim();
    };

    const extractAll = (html: string, pattern: RegExp): string[] => {
      const matches = html.matchAll(pattern);
      return Array.from(matches, m => m[1]);
    };

    const cleanText = (text: string): string => {
      return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    // Extract manga information with multiple patterns
    console.log('📊 Starting data extraction...');
    
    let title = '';
    
    // Try different title patterns
    const titlePatterns = [
      { pattern: /<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>([^<]+)<\/h1>/i, name: 'post-title' },
      { pattern: /<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i, name: 'entry-title' },
      { pattern: /<div[^>]*class="[^"]*post-title[^"]*"[^>]*>[\s\S]*?<h1[^>]*>([^<]+)<\/h1>/i, name: 'div-post-title' },
      { pattern: /<h1[^>]*>([^<]+)<\/h1>/i, name: 'h1-general' },
      { pattern: /<meta\s+property="og:title"\s+content="([^"]+)"/i, name: 'og:title' },
    ];

    for (const { pattern, name } of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = cleanText(match[1]);
        if (title && !title.includes('navbar') && !title.includes('الرئيسية') && title.length > 2) {
          console.log(`✅ Title found via ${name}: "${title}"`);
          break;
        }
      }
    }

    // Fallback to page title
    if (!title || title.length < 3 || title === 'الرئيسية') {
      const pageTitle = extractText(html, '<title>', '</title>');
      title = cleanText(pageTitle.split('|')[0].split('-')[0].split('–')[0]);
      console.log(`📝 Title fallback to page title: "${title}"`);
    }

    // Extract description with better patterns
    let description = '';
    const descPatterns = [
      { pattern: /<div[^>]*class="[^"]*summary__content[^"]*"[^>]*>([\s\S]*?)<\/div>/i, name: 'summary__content' },
      { pattern: /<div[^>]*class="[^"]*description-summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i, name: 'description-summary' },
      { pattern: /<div[^>]*class="[^"]*manga-excerpt[^"]*"[^>]*>([\s\S]*?)<\/div>/i, name: 'manga-excerpt' },
      { pattern: /<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i, name: 'p-description' },
      { pattern: /<meta\s+property="og:description"\s+content="([^"]+)"/i, name: 'og:description' },
      { pattern: /<meta\s+name="description"\s+content="([^"]+)"/i, name: 'meta-description' },
    ];

    for (const { pattern, name } of descPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        description = cleanText(match[1]);
        if (description && description.length > 30 && !description.includes('افضل موقع')) {
          console.log(`✅ Description found via ${name}: "${description.substring(0, 80)}..."`);
          break;
        }
      }
    }

    // Extract manga type (manga / manhwa / manhua) with better detection
    let mangaType: 'manga' | 'manhwa' | 'manhua' = 'manga';
    const typePatterns = [
      { pattern: /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*summary-content[^"]*"[^>]*>\s*(Manhwa|Manhua|Manga|مانهوا|مانها|مانجا)\s*<\/div>/gi, name: 'summary-content' },
      { pattern: /<a[^>]*class="[^"]*manga-type[^"]*"[^>]*>([^<]+)<\/a>/i, name: 'manga-type-link' },
      { pattern: /<span[^>]*class="[^"]*type[^"]*"[^>]*>\s*(Manhwa|Manhua|Manga|مانهوا|مانها|مانجا)\s*<\/span>/i, name: 'type-span' },
      { pattern: /نوع[\s:]+(?:<[^>]*>)?\s*(مانهوا|مانها|مانجا|Manhwa|Manhua|Manga)/i, name: 'type-text' },
      { pattern: /Type[\s:]+(?:<[^>]*>)?\s*(Manhwa|Manhua|Manga)/i, name: 'type-english' },
    ];

    for (const { pattern, name } of typePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const typeText = match[1].toLowerCase();
        if (typeText.includes('manhwa') || typeText.includes('مانهوا')) {
          mangaType = 'manhwa';
          console.log(`✅ Type detected via ${name}: manhwa`);
          break;
        } else if (typeText.includes('manhua') || typeText.includes('مانها')) {
          mangaType = 'manhua';
          console.log(`✅ Type detected via ${name}: manhua`);
          break;
        } else if (typeText.includes('manga') || typeText.includes('مانجا')) {
          mangaType = 'manga';
          console.log(`✅ Type detected via ${name}: manga`);
          break;
        }
      }
    }

    // Also check URL for type hints
    if (mangaType === 'manga') {
      if (sourceUrl.toLowerCase().includes('manhwa')) {
        mangaType = 'manhwa';
        console.log('📝 Type detected from URL: manhwa');
      } else if (sourceUrl.toLowerCase().includes('manhua')) {
        mangaType = 'manhua';
        console.log('📝 Type detected from URL: manhua');
      }
    }

    // Extract rating with better patterns
    let rating: number | null = null;
    const ratingPatterns = [
      { pattern: /itemprop="ratingValue"[^>]*content="([0-9.]+)"/i, name: 'schema-rating' },
      { pattern: /itemprop="ratingValue"[^>]*>([0-9.]+)<\/span>/i, name: 'schema-rating-span' },
      { pattern: /<span[^>]*class="[^"]*score[^"]*"[^>]*>[\s\n]*([0-9.]+)[\s\n]*<\/span>/i, name: 'score-span' },
      { pattern: /<div[^>]*class="[^"]*total_votes[^"]*"[^>]*>[\s\n]*([0-9.]+)[\s\n]*<\/div>/i, name: 'total_votes' },
      { pattern: /<span[^>]*class="[^"]*num[^"]*"[^>]*>[\s\n]*([0-9.]+)[\s\n]*<\/span>/i, name: 'num-span' },
      { pattern: /rating[^>]*>[\s\n]*([0-9.]+)[\s\n]*</i, name: 'rating-general' },
    ];

    for (const { pattern, name } of ratingPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0 && value <= 10) {
          rating = value;
          console.log(`✅ Rating found via ${name}: ${rating}`);
          break;
        }
      }
    }

    // Extract cover image
    let coverImage = '';
    const imagePatterns = [
      { pattern: /<div[^>]*class="[^"]*summary_image[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i, name: 'summary_image' },
      { pattern: /<div[^>]*class="[^"]*tab-summary[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i, name: 'tab-summary' },
      { pattern: /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i, name: 'wp-post-image' },
      { pattern: /<meta\s+property="og:image"\s+content="([^"]+)"/i, name: 'og:image' },
      { pattern: /<img[^>]*class="[^"]*thumbnail[^"]*"[^>]*src="([^"]+)"/i, name: 'thumbnail' },
    ];

    for (const { pattern, name } of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].startsWith('http') && !match[1].includes('logo') && !match[1].includes('TeamX')) {
        coverImage = match[1];
        console.log(`✅ Cover image found via ${name}: ${coverImage.substring(0, 60)}...`);
        break;
      }
    }

    // Extract genres
    const genrePatterns = [
      { pattern: /<a[^>]+href="[^"]*\/manga-genre\/[^"]*"[^>]*>([^<]+)<\/a>/gi, name: 'manga-genre' },
      { pattern: /<a[^>]+href="[^"]*genre[^"]*"[^>]*>([^<]+)<\/a>/gi, name: 'genre-link' },
      { pattern: /<a[^>]+href="[^"]*category[^"]*"[^>]*>([^<]+)<\/a>/gi, name: 'category-link' },
    ];

    let genreMatches: string[] = [];
    for (const { pattern, name } of genrePatterns) {
      const matches = extractAll(html, pattern);
      if (matches.length > 0) {
        genreMatches = matches.map(g => cleanText(g)).filter(g => g.length > 1 && g.length < 30);
        if (genreMatches.length > 0) {
          console.log(`✅ Genres found via ${name}: ${genreMatches.join(', ')}`);
          break;
        }
      }
    }

    console.log('📊 Extraction summary:', { 
      title, 
      descriptionLength: description?.length || 0, 
      mangaType,
      rating,
      coverImage: coverImage ? 'Found' : 'Not found', 
      genresCount: genreMatches.length 
    });

    // Generate slug for manga
    const generateSlug = (text: string): string => {
      return text
        .trim()
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const mangaSlug = generateSlug(title);
    console.log(`📝 Generated manga slug: ${mangaSlug}`);

    // Check if manga already exists (by slug or title)
    const { data: existingManga } = await supabaseAdmin
      .from('manga')
      .select('id, slug')
      .or(`slug.eq.${mangaSlug},title.eq.${title}`)
      .maybeSingle();

    let mangaId: string;
    let finalSlug = mangaSlug;

    if (existingManga) {
      mangaId = existingManga.id;
      finalSlug = existingManga.slug || mangaSlug;
      console.log('📚 Manga already exists, will update metadata and chapters for:', mangaId);

      // Update basic metadata if we scraped better info
      const { error: updateError } = await supabaseAdmin
        .from('manga')
        .update({
          slug: finalSlug,
          description: description || null,
          cover_image_url: coverImage || null,
          manga_type: mangaType,
          rating,
          source_url: sourceUrl,
          author: extractText(html, 'class="author">', '</') || null,
          artist: extractText(html, 'class="artist">', '</') || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mangaId);

      if (updateError) {
        console.error('❌ Error updating existing manga:', updateError);
      }
    } else {
      // Insert manga if it does not exist
      const { data: manga, error: mangaError } = await supabaseAdmin
        .from('manga')
        .insert({
          title,
          slug: mangaSlug,
          description: description || null,
          cover_image_url: coverImage || null,
          manga_type: mangaType,
          status: 'ongoing',
          rating,
          source_url: sourceUrl,
          author: extractText(html, 'class="author">', '</') || null,
          artist: extractText(html, 'class="artist">', '</') || null,
        })
        .select()
        .single();

      if (mangaError) {
        console.error('❌ Error inserting manga:', mangaError);
        throw mangaError;
      }

      mangaId = manga.id;
      finalSlug = manga.slug;
      console.log('✅ Manga inserted:', mangaId, 'with slug:', finalSlug);
    }

    // Insert genres
    for (const genreName of genreMatches) {
      const slug = genreName.toLowerCase().replace(/\s+/g, '-');
      
      const { data: genre } = await supabaseAdmin
        .from('genres')
        .upsert({ name: genreName, slug }, { onConflict: 'slug' })
        .select()
        .single();

      if (genre) {
        const { error: genreError } = await supabaseAdmin
          .from('manga_genres')
          .insert({ manga_id: mangaId, genre_id: genre.id });
        
        if (genreError && !genreError.message.includes('duplicate')) {
          console.error('Error inserting manga_genre:', genreError);
        }
      }
    }

    // Extract chapters - specifically from main version-chap list to ensure we get ALL chapters
    let chapterLinks: string[] = [];

    // Strategy 0: Target the main chapter list container directly
    const mainChapContainerPattern = /<ul[^>]*class="[^"]*main[^"]*version-chap[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
    const mainChapMatch = mainChapContainerPattern.exec(html);

    if (mainChapMatch && mainChapMatch[1]) {
      const mainHtml = mainChapMatch[1];
      const liPattern = /<li[^>]*class="[^"]*wp-manga-chapter[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/gi;
      const mainLinks = Array.from(mainHtml.matchAll(liPattern));

      for (const m of mainLinks) {
        const url = m[1].trim();
        if (url.startsWith('http') && !chapterLinks.includes(url)) {
          chapterLinks.push(url);
        }
      }

      console.log('Strategy 0 - main version-chap list found chapters:', chapterLinks.length);
    }

    // Strategy 1: Look for wp-manga-chapter class (most common)
    if (chapterLinks.length === 0) {
      const chapterItemPattern = /<li[^>]*class="[^"]*wp-manga-chapter[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
      let chapterItems = Array.from(html.matchAll(chapterItemPattern));
      
      console.log('Strategy 1 - Found wp-manga-chapter items:', chapterItems.length);
      
      for (const item of chapterItems) {
        const hrefMatch = item[1].match(/<a[^>]+href="([^"]+)"[^>]*>/i);
        if (hrefMatch && hrefMatch[1]) {
          const url = hrefMatch[1].trim();
          if (url.startsWith('http') && !chapterLinks.includes(url)) {
            chapterLinks.push(url);
          }
        }
      }
    }
    
    // Strategy 2: If no chapters found, try broader patterns
    if (chapterLinks.length === 0) {
      console.log('📖 Strategy 2 - Trying broader chapter patterns...');
      
      // Look for chapter list container
      const chapterListPattern = /<div[^>]*class="[^"]*version-chap[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      const chapterListMatch = html.match(chapterListPattern);
      
      if (chapterListMatch && chapterListMatch[0]) {
        const linkPattern = /<a[^>]+href="([^"]+chapter[^"]*)"[^>]*>/gi;
        const links = Array.from(chapterListMatch[0].matchAll(linkPattern));
        for (const link of links) {
          const url = link[1].trim();
          if (url.startsWith('http') && !chapterLinks.includes(url)) {
            chapterLinks.push(url);
          }
        }
        console.log('📖 Strategy 2 - Found links:', chapterLinks.length);
      }
    }
    
    // Strategy 3: OlympusStaff and similar sites - look for chapter links in different patterns
    if (chapterLinks.length === 0) {
      console.log('📖 Strategy 3 - Trying OlympusStaff/TeamX patterns...');
      
      // Pattern for OlympusStaff style sites
      const olympusPatterns = [
        /<a[^>]+href="([^"]+\/series\/[^"]+\/\d+[^"]*)"[^>]*>/gi,
        /<a[^>]+href="([^"]+\/chapter\/[^"]+)"[^>]*>/gi,
        /<div[^>]*class="[^"]*eplister[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/gi,
        /<li[^>]*data-num="[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/gi,
      ];
      
      for (const pattern of olympusPatterns) {
        const matches = Array.from(html.matchAll(pattern));
        for (const match of matches) {
          const url = match[1].trim();
          if (url.startsWith('http') && !chapterLinks.includes(url) && !url.includes('/manga/') && !url.includes('/series/') || url.match(/\/\d+\/?$/)) {
            chapterLinks.push(url);
          }
        }
        if (chapterLinks.length > 0) {
          console.log(`📖 Strategy 3 - Found ${chapterLinks.length} chapter links`);
          break;
        }
      }
    }
    
    // Strategy 4: Generic patterns for other sites
    if (chapterLinks.length === 0) {
      console.log('📖 Strategy 4 - Trying generic chapter patterns...');
      
      const containerPatterns = [
        /<ul[^>]*class="[^"]*version-chap[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi,
        /<div[^>]*class="[^"]*chapter-list[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class="[^"]*chapters[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*id="[^"]*chapters[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      ];
      
      for (const pattern of containerPatterns) {
        const match = html.match(pattern);
        if (match && match[0]) {
          const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>/gi;
          const links = Array.from(match[0].matchAll(linkPattern));
          for (const link of links) {
            const url = link[1].trim();
            if (url.startsWith('http') && !chapterLinks.includes(url)) {
              chapterLinks.push(url);
            }
          }
          if (chapterLinks.length > 0) break;
        }
      }
      console.log(`📖 Strategy 4 - Found ${chapterLinks.length} chapter links`);
    }

    console.log('Found chapter links:', chapterLinks.length);

    // Process all chapters (no limit)
    let successfulChapters = 0;
    const totalChapters = chapterLinks.length;
    console.log(`Processing all ${totalChapters} chapters...`);

    for (let i = 0; i < totalChapters; i++) {
      const chapterUrl = chapterLinks[i].startsWith('http') 
        ? chapterLinks[i] 
        : new URL(chapterLinks[i], sourceUrl).href;

      try {
        let chapterHtml = '';
        let usedFirecrawlForChapter = false;
        
        // Try Firecrawl for chapter pages with fallback
        if (FIRECRAWL_API_KEY) {
          try {
            const chapterFirecrawl = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: chapterUrl,
                formats: ['html'],
                onlyMainContent: false,
                waitFor: 1500,
                timeout: 25000,
              }),
            });
            
            if (chapterFirecrawl.ok) {
              const chapterData = await chapterFirecrawl.json();
              chapterHtml = chapterData.data?.html || '';
              if (chapterHtml.length > 100) {
                usedFirecrawlForChapter = true;
              }
            }
          } catch (error) {
            console.log(`Chapter ${i}: Firecrawl failed, using standard fetch`);
          }
        }
        
        // Fallback to standard fetch
        if (!usedFirecrawlForChapter) {
          const chapterResponse = await fetch(chapterUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
          });
          chapterHtml = await chapterResponse.text();
        }

        // Extract chapter title and number
        let chapterTitle = '';
        const chapterTitlePatterns = [
          /<h1[^>]*>([^<]+)<\/h1>/i,
          /<meta\s+property="og:title"\s+content="([^"]+)"/i,
        ];

        for (const pattern of chapterTitlePatterns) {
          const match = chapterHtml.match(pattern);
          if (match && match[1]) {
            chapterTitle = cleanText(match[1]);
            break;
          }
        }

        const chapterNumber = parseFloat(chapterTitle.match(/\d+(\.\d+)?/)?.[0] || String(i + 1));
        const chapterSlug = String(chapterNumber).replace(/[^0-9.]+/g, '');

        // Check if chapter exists for this manga
        const { data: existingChapter } = await supabaseAdmin
          .from('chapters')
          .select('id')
          .eq('manga_id', mangaId)
          .eq('chapter_number', chapterNumber)
          .maybeSingle();

        if (existingChapter) {
          console.log(`📖 Chapter ${chapterNumber} already exists, skipping`);
          successfulChapters++; // Count existing as success for accurate reporting
          continue;
        }

        const { data: chapter } = await supabaseAdmin
          .from('chapters')
          .insert({
            manga_id: mangaId,
            title: chapterTitle || `الفصل ${chapterNumber}`,
            chapter_number: chapterNumber,
            slug: chapterSlug,
          })
          .select()
          .single();

        if (chapter) {
          // Extract chapter images - specifically for wp-manga-chapter-img class
          let imageUrls: string[] = [];
          
          // Strategy 1: Look for wp-manga-chapter-img class (most common on lekmanga.net)
          const wpMangaPattern = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="([^"]+)"[^>]*>/gi;
          let matches = Array.from(chapterHtml.matchAll(wpMangaPattern));
          
          if (matches.length > 0) {
            imageUrls = matches.map(m => m[1]).filter(url => url.startsWith('http'));
            console.log(`Found ${imageUrls.length} images with wp-manga-chapter-img class`);
          }
          
          // Strategy 2: If no images found, try data-src attribute
          if (imageUrls.length === 0) {
            const dataSrcPattern = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*data-src="([^"]+)"[^>]*>/gi;
            matches = Array.from(chapterHtml.matchAll(dataSrcPattern));
            if (matches.length > 0) {
              imageUrls = matches.map(m => m[1]).filter(url => url.startsWith('http'));
              console.log(`Found ${imageUrls.length} images with data-src attribute`);
            }
          }
          
          // Strategy 3: Look for img tags with id="image-*"
          if (imageUrls.length === 0) {
            const imageIdPattern = /<img[^>]*id="image-\d+"[^>]*src="([^"]+)"[^>]*>/gi;
            matches = Array.from(chapterHtml.matchAll(imageIdPattern));
            if (matches.length > 0) {
              imageUrls = matches.map(m => m[1]).filter(url => url.startsWith('http'));
              console.log(`Found ${imageUrls.length} images with image-* id`);
            }
          }
          
          // Strategy 4: Broader search - any img with valid image URL
          if (imageUrls.length === 0) {
            const broadPattern = /<img[^>]+src="([^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"[^>]*>/gi;
            matches = Array.from(chapterHtml.matchAll(broadPattern));
            if (matches.length > 0) {
              imageUrls = matches
                .map(m => m[1])
                .filter(url => {
                  // Filter for valid image URLs from known domains
                  return url.startsWith('http') && 
                         (url.includes('lekmanga') || url.includes('tempsolo') || 
                          url.includes('olympus') || url.includes('teamx') ||
                          url.includes('cdn') || url.includes('uploads'));
                });
              console.log(`📷 Found ${imageUrls.length} images with broad search`);
            }
          }
          
          // Strategy 5: OlympusStaff/TeamX specific patterns
          if (imageUrls.length === 0) {
            const olympusImgPattern = /<img[^>]*class="[^"]*ts-main-image[^"]*"[^>]*src="([^"]+)"[^>]*>/gi;
            matches = Array.from(chapterHtml.matchAll(olympusImgPattern));
            if (matches.length > 0) {
              imageUrls = matches.map(m => m[1]).filter(url => url.startsWith('http'));
              console.log(`📷 Found ${imageUrls.length} images with ts-main-image pattern`);
            }
          }
          
          // Strategy 6: data-src lazy loading pattern
          if (imageUrls.length === 0) {
            const lazySrcPattern = /<img[^>]*data-src="([^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"[^>]*>/gi;
            matches = Array.from(chapterHtml.matchAll(lazySrcPattern));
            if (matches.length > 0) {
              imageUrls = matches.map(m => m[1]).filter(url => url.startsWith('http'));
              console.log(`📷 Found ${imageUrls.length} images with data-src pattern`);
            }
          }
          
          // Remove duplicates while preserving order
          imageUrls = Array.from(new Set(imageUrls));
          
          console.log(`Total ${imageUrls.length} images for chapter ${chapterNumber}`);

          for (let pageNum = 0; pageNum < imageUrls.length; pageNum++) {
            const { error: pageError } = await supabaseAdmin
              .from('chapter_pages')
              .insert({
                chapter_id: chapter.id,
                page_number: pageNum + 1,
                image_url: imageUrls[pageNum],
              });
            
            if (pageError && !pageError.message.includes('duplicate')) {
              console.error('Error inserting page:', pageError);
            }
          }

          successfulChapters++;
          console.log(`Chapter ${chapterNumber} inserted with ${imageUrls.length} pages`);
        }
      } catch (error) {
        console.error(`Error scraping chapter ${i}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم سحب ${successfulChapters} فصل بنجاح`,
        mangaId,
        title: title,
        chaptersFound: chapterLinks.length,
        chaptersScraped: successfulChapters
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});