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
    const { sourceUrl } = await req.json();
    console.log('Starting scrape for URL:', sourceUrl);

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

    // Fetch the HTML content
    const response = await fetch(sourceUrl);
    const html = await response.text();
    console.log('Fetched HTML, length:', html.length);

    // Parse HTML using basic string methods (no external parser needed)
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

    // Extract manga information
    const title = extractText(html, '<h1', '</h1>').replace(/<[^>]*>/g, '').trim() || 
                  extractText(html, '<title>', '</title>').split('|')[0].trim();
    
    const description = extractText(html, '<meta name="description" content="', '"') ||
                       extractText(html, 'class="description">', '</div>') ||
                       extractText(html, 'class="summary">', '</div>');

    // Extract cover image
    const coverImage = extractText(html, '<meta property="og:image" content="', '"') ||
                       html.match(/<img[^>]+class="[^"]*cover[^"]*"[^>]+src="([^"]+)"/)?.[1] ||
                       html.match(/<img[^>]+src="([^"]+)"[^>]*class="[^"]*cover[^"]*"/)?.[1];

    // Extract genres
    const genreMatches = extractAll(html, /<a[^>]+class="[^"]*genre[^"]*"[^>]*>([^<]+)<\/a>/gi) ||
                        extractAll(html, /<span[^>]+class="[^"]*genre[^"]*"[^>]*>([^<]+)<\/span>/gi);

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

    // Extract chapters
    const chapterLinks = extractAll(html, /<a[^>]+href="([^"]*chapter[^"]*)"[^>]*>/gi);
    console.log('Found chapter links:', chapterLinks.length);

    for (let i = 0; i < Math.min(chapterLinks.length, 10); i++) {
      const chapterUrl = chapterLinks[i].startsWith('http') 
        ? chapterLinks[i] 
        : new URL(chapterLinks[i], sourceUrl).href;

      try {
        const chapterResponse = await fetch(chapterUrl);
        const chapterHtml = await chapterResponse.text();

        const chapterTitle = extractText(chapterHtml, '<h1', '</h1>').replace(/<[^>]*>/g, '').trim();
        const chapterNumber = parseFloat(chapterTitle.match(/\d+(\.\d+)?/)?.[0] || String(i + 1));

        // Check if chapter exists
        const { data: existingChapter } = await supabaseAdmin
          .from('chapters')
          .select('id')
          .eq('manga_id', manga.id)
          .eq('chapter_number', chapterNumber)
          .maybeSingle();

        if (existingChapter) continue;

        const { data: chapter } = await supabaseAdmin
          .from('chapters')
          .insert({
            manga_id: manga.id,
            title: chapterTitle || `Chapter ${chapterNumber}`,
            chapter_number: chapterNumber,
          })
          .select()
          .single();

        if (chapter) {
          // Extract chapter images
          const imageUrls = extractAll(chapterHtml, /<img[^>]+src="([^"]+\.(jpg|jpeg|png|webp|gif))"[^>]*>/gi);
          
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

          console.log(`Chapter ${chapterNumber} inserted with ${imageUrls.length} pages`);
        }
      } catch (error) {
        console.error(`Error scraping chapter ${i}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم السحب بنجاح',
        mangaId: manga.id,
        chaptersScraped: Math.min(chapterLinks.length, 10)
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