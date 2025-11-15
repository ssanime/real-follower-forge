-- Add featured column to manga table
ALTER TABLE manga ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Add featured_order column for ordering featured manga
ALTER TABLE manga ADD COLUMN IF NOT EXISTS featured_order INTEGER;

-- Create index for featured manga
CREATE INDEX IF NOT EXISTS idx_manga_featured ON manga(featured) WHERE featured = true;

-- Add source_url column to track where manga was scraped from
ALTER TABLE manga ADD COLUMN IF NOT EXISTS source_url TEXT;