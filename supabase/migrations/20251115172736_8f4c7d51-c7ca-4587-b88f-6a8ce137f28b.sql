-- Add storage bucket for manga images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manga-images',
  'manga-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for manga images
CREATE POLICY "Anyone can view manga images"
ON storage.objects FOR SELECT
USING (bucket_id = 'manga-images');

CREATE POLICY "Authenticated users can upload manga images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'manga-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update manga images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'manga-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete manga images"
ON storage.objects FOR DELETE
USING (bucket_id = 'manga-images' AND auth.role() = 'authenticated');

-- Add alternative titles, release year, and studio to manga table
ALTER TABLE manga 
ADD COLUMN IF NOT EXISTS studio TEXT,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_manga_type ON manga(manga_type);
CREATE INDEX IF NOT EXISTS idx_manga_status ON manga(status);
CREATE INDEX IF NOT EXISTS idx_manga_release_year ON manga(release_year);
CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_manga_id ON chapters(manga_id);
CREATE INDEX IF NOT EXISTS idx_chapter_pages_chapter_id ON chapter_pages(chapter_id);