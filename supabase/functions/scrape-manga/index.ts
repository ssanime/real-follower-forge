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
    let title = '';
    
    // Try different title patterns
    const titlePatterns = [
      /<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = cleanText(match[1]);
        if (title && !title.includes('navbar') && title.length > 2) break;
      }
    }

    // Fallback to page title
    if (!title || title.length < 3) {
      title = cleanText(extractText(html, '<title>', '</title>').split('|')[0].split('-')[0]);
    }

    // Extract description
    let description = '';
    const descPatterns = [
      /<meta\s+name="description"\s+content="([^"]+)"/i,
      /<meta\s+property="og:description"\s+content="([^"]+)"/i,
      /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/div>/i,
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]{0,500}?)<\/div>/i,
      /<p[^>]*class="[^"]*story[^"]*"[^>]*>([^<]+)<\/p>/i,
    ];

    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        description = cleanText(match[1]);
        if (description && description.length > 20) break;
      }
    }

    // Extract cover image
    let coverImage = '';
    const imagePatterns = [
      /<meta\s+property="og:image"\s+content="([^"]+)"/i,
      /<img[^>]*class="[^"]*thumbnail[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i,
      /<div[^>]*class="[^"]*post-thumbnail[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i,
    ];

    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].startsWith('http')) {
        coverImage = match[1];
        break;
      }
    }

    // Extract genres
    const genrePatterns = [
      /<a[^>]+href="[^"]*genre[^"]*"[^>]*>([^<]+)<\/a>/gi,
      /<a[^>]+href="[^"]*category[^"]*"[^>]*>([^<]+)<\/a>/gi,
      /<span[^>]+class="[^"]*genre[^"]*"[^>]*>([^<]+)<\/span>/gi,
    ];

    let genreMatches: string[] = [];
    for (const pattern of genrePatterns) {
      const matches = extractAll(html, pattern);
      if (matches.length > 0) {
        genreMatches = matches.map(g => cleanText(g)).filter(g => g.length > 1 && g.length < 30);
        if (genreMatches.length > 0) break;
      }
    }

    console.log('Extracted data:', { title, description: description?.substring(0, 100), coverImage, genres: genreMatches });

    // Check if manga already exists
    const { data: existingManga } = await supabaseAdmin
      .from('manga')
      .select('id')
      .eq('title', title)
      .maybeSingle();

    if (existingManga) {
      console.log('Manga already exists:', existingManga.id);
      return new Response(
        JSON.stringify({ message: 'المانجا موجودة مسبقاً', mangaId: existingManga.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert manga
    const { data: manga, error: mangaError } = await supabaseAdmin
      .from('manga')
      .insert({
        title,
        description: description || null,
        cover_image_url: coverImage || null,
        manga_type: 'manga',
        status: 'ongoing',
        author: extractText(html, 'class="author">', '</') || null,
        artist: extractText(html, 'class="artist">', '</') || null,
      })
      .select()
      .single();

    if (mangaError) {
      console.error('Error inserting manga:', mangaError);
      throw mangaError;
    }

    console.log('Manga inserted:', manga.id);

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
          .insert({ manga_id: manga.id, genre_id: genre.id });
        
        if (genreError && !genreError.message.includes('duplicate')) {
          console.error('Error inserting manga_genre:', genreError);
        }
      }
    }

    // Extract chapters - multiple strategies for better coverage
    let chapterLinks: string[] = [];
    
    // Strategy 1: Look for wp-manga-chapter class (most common)
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
    
    // Strategy 2: If no chapters found, try broader patterns
    if (chapterLinks.length === 0) {
      console.log('Strategy 2 - Trying broader chapter patterns...');
      
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
        console.log('Strategy 2 - Found links:', chapterLinks.length);
      }
    }
    
    // Strategy 3: Look for any links containing 'chapter' in href
    if (chapterLinks.length === 0) {
      console.log('Strategy 3 - Looking for any chapter links...');
      const anyChapterPattern = /<a[^>]+href="([^"]+chapter[^"]+)"[^>]*>/gi;
      const matches = Array.from(html.matchAll(anyChapterPattern));
      for (const match of matches) {
        const url = match[1].trim();
        if (url.startsWith('http') && !chapterLinks.includes(url)) {
          chapterLinks.push(url);
        }
      }
      console.log('Strategy 3 - Found links:', chapterLinks.length);
    }
    
    // If no chapters found with wp-manga-chapter, try alternative patterns
    if (chapterLinks.length === 0) {
      console.log('No wp-manga-chapter found, trying alternative patterns...');
      
      // Try finding chapter list container
      const containerPatterns = [
        /<ul[^>]*class="[^"]*version-chap[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi,
        /<div[^>]*class="[^"]*chapter-list[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      ];
      
      for (const pattern of containerPatterns) {
        const match = html.match(pattern);
        if (match && match[0]) {
          // Extract all links from container
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

        // Check if chapter exists
        const { data: existingChapter } = await supabaseAdmin
          .from('chapters')
          .select('id')
          .eq('manga_id', manga.id)
          .eq('chapter_number', chapterNumber)
          .maybeSingle();

        if (existingChapter) {
          console.log(`Chapter ${chapterNumber} already exists, skipping`);
          continue;
        }

        const { data: chapter } = await supabaseAdmin
          .from('chapters')
          .insert({
            manga_id: manga.id,
            title: chapterTitle || `الفصل ${chapterNumber}`,
            chapter_number: chapterNumber,
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
                  // Filter for valid image URLs from lekmanga domains
                  return url.startsWith('http') && 
                         (url.includes('lekmanga') || url.includes('tempsolo'));
                });
              console.log(`Found ${imageUrls.length} images with broad search`);
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
        mangaId: manga.id,
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