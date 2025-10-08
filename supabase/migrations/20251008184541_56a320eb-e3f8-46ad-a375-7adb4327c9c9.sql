-- Create enum for manga types
CREATE TYPE manga_type AS ENUM ('manga', 'manhwa', 'manhua');

-- Create enum for manga status
CREATE TYPE manga_status AS ENUM ('ongoing', 'completed', 'hiatus', 'cancelled');

-- Create manga table
CREATE TABLE public.manga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  alternative_titles TEXT[],
  description TEXT,
  cover_image_url TEXT,
  manga_type manga_type NOT NULL,
  status manga_status DEFAULT 'ongoing',
  author TEXT,
  artist TEXT,
  release_year INTEGER,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 10),
  total_views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create genres table
CREATE TABLE public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create manga_genres junction table
CREATE TABLE public.manga_genres (
  manga_id UUID REFERENCES public.manga(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (manga_id, genre_id)
);

-- Create chapters table
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id UUID REFERENCES public.manga(id) ON DELETE CASCADE NOT NULL,
  chapter_number DECIMAL(10,2) NOT NULL,
  title TEXT,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(manga_id, chapter_number)
);

-- Create chapter_pages table
CREATE TABLE public.chapter_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chapter_id, page_number)
);

-- Create scraper_sources table for tracking scraping sources
CREATE TABLE public.scraper_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_manga_type ON public.manga(manga_type);
CREATE INDEX idx_manga_status ON public.manga(status);
CREATE INDEX idx_chapters_manga_id ON public.chapters(manga_id);
CREATE INDEX idx_chapter_pages_chapter_id ON public.chapter_pages(chapter_id);
CREATE INDEX idx_manga_created_at ON public.manga(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.manga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manga_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for manga content)
CREATE POLICY "Anyone can view manga" ON public.manga FOR SELECT USING (true);
CREATE POLICY "Anyone can view genres" ON public.genres FOR SELECT USING (true);
CREATE POLICY "Anyone can view manga_genres" ON public.manga_genres FOR SELECT USING (true);
CREATE POLICY "Anyone can view chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Anyone can view chapter_pages" ON public.chapter_pages FOR SELECT USING (true);
CREATE POLICY "Anyone can view scraper_sources" ON public.scraper_sources FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manga table
CREATE TRIGGER update_manga_updated_at
BEFORE UPDATE ON public.manga
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default genres
INSERT INTO public.genres (name, slug) VALUES
  ('Action', 'action'),
  ('Adventure', 'adventure'),
  ('Comedy', 'comedy'),
  ('Drama', 'drama'),
  ('Fantasy', 'fantasy'),
  ('Horror', 'horror'),
  ('Mystery', 'mystery'),
  ('Romance', 'romance'),
  ('Sci-Fi', 'sci-fi'),
  ('Slice of Life', 'slice-of-life'),
  ('Sports', 'sports'),
  ('Supernatural', 'supernatural'),
  ('Thriller', 'thriller'),
  ('Psychological', 'psychological'),
  ('Isekai', 'isekai');