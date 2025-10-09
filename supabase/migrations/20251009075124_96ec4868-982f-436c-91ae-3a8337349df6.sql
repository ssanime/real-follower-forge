-- Allow service role to manage all tables (for edge functions)
-- These policies allow the edge function to insert/update/delete data

-- Manga table policies
CREATE POLICY "Service role can manage manga"
ON public.manga
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Genres table policies
CREATE POLICY "Service role can manage genres"
ON public.genres
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Manga genres table policies
CREATE POLICY "Service role can manage manga_genres"
ON public.manga_genres
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Chapters table policies
CREATE POLICY "Service role can manage chapters"
ON public.chapters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Chapter pages table policies
CREATE POLICY "Service role can manage chapter_pages"
ON public.chapter_pages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Scraper sources table policies
CREATE POLICY "Service role can manage scraper_sources"
ON public.scraper_sources
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);