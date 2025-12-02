import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  ogType?: "website" | "article";
  jsonLd?: object;
}

export const SEOHead = ({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = "website",
  jsonLd,
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Basic meta tags
    updateMeta("description", description);
    updateMeta("robots", "index, follow");

    // Open Graph
    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", ogType, true);
    updateMeta("og:url", canonicalUrl, true);
    if (ogImage) {
      updateMeta("og:image", ogImage, true);
    }

    // Twitter Card
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    if (ogImage) {
      updateMeta("twitter:image", ogImage);
    }

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // JSON-LD structured data
    const existingJsonLd = document.getElementById("json-ld-seo");
    if (existingJsonLd) {
      existingJsonLd.remove();
    }
    
    if (jsonLd) {
      const script = document.createElement("script");
      script.id = "json-ld-seo";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const jsonLdScript = document.getElementById("json-ld-seo");
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [title, description, canonicalUrl, ogImage, ogType, jsonLd]);

  return null;
};

// Helper to generate manga JSON-LD
export const generateMangaJsonLd = (manga: {
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  author?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  slug: string;
}) => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    "name": manga.title,
    "description": manga.description || `قراءة ${manga.title} مترجمة`,
    "url": `${baseUrl}/manga/${manga.slug}`,
    ...(manga.cover_image_url && { "image": manga.cover_image_url }),
    ...(manga.author && { 
      "author": {
        "@type": "Person",
        "name": manga.author
      }
    }),
    ...(manga.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": manga.rating,
        "bestRating": 10,
        "worstRating": 0,
        "ratingCount": manga.rating_count || 1
      }
    }),
    "inLanguage": "ar"
  };
};

// Helper to generate chapter JSON-LD
export const generateChapterJsonLd = (chapter: {
  title?: string | null;
  chapter_number: number;
  manga_title: string;
  manga_slug: string;
}) => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "Chapter",
    "name": chapter.title || `الفصل ${chapter.chapter_number}`,
    "isPartOf": {
      "@type": "ComicSeries",
      "name": chapter.manga_title,
      "url": `${baseUrl}/manga/${chapter.manga_slug}`
    },
    "position": chapter.chapter_number,
    "inLanguage": "ar"
  };
};
