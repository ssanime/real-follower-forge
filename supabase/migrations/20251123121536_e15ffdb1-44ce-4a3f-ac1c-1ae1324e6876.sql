-- Add slug columns for SEO-friendly URLs
ALTER TABLE public.manga
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

ALTER TABLE public.chapters
ADD COLUMN IF NOT EXISTS slug text;

-- Ensure chapter slugs are unique per manga
CREATE UNIQUE INDEX IF NOT EXISTS chapters_manga_id_slug_key
ON public.chapters(manga_id, slug);