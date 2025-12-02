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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const baseUrl = req.headers.get('origin') || 'https://your-domain.com';
    const currentDate = new Date().toISOString().split('T')[0];

    // Fetch all manga
    const { data: mangaList } = await supabaseAdmin
      .from('manga')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false });

    // Fetch all chapters with manga slugs
    const { data: chapters } = await supabaseAdmin
      .from('chapters')
      .select('slug, chapter_number, manga_id, created_at, manga(slug)')
      .order('created_at', { ascending: false })
      .limit(5000);

    // Generate XML sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Browse page -->
  <url>
    <loc>${baseUrl}/browse</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Add manga pages
    for (const manga of mangaList || []) {
      if (manga.slug) {
        const lastmod = manga.updated_at 
          ? new Date(manga.updated_at).toISOString().split('T')[0]
          : currentDate;
        
        sitemap += `
  <url>
    <loc>${baseUrl}/manga/${manga.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Add chapter pages
    for (const chapter of chapters || []) {
      const mangaSlug = (chapter.manga as any)?.slug;
      if (mangaSlug && chapter.slug) {
        const lastmod = chapter.created_at 
          ? new Date(chapter.created_at).toISOString().split('T')[0]
          : currentDate;
        
        sitemap += `
  <url>
    <loc>${baseUrl}/manga/${mangaSlug}/${chapter.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    }

    sitemap += `
</urlset>`;

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
