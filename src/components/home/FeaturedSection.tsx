import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export const FeaturedSection = () => {
  const [featured, setFeatured] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatured();
  }, []);

  const fetchFeatured = async () => {
    try {
      const { data, error } = await supabase
        .from("manga")
        .select(`
          *,
          manga_genres (
            genres (
              name
            )
          )
        `)
        .order("total_views", { ascending: false })
        .limit(10);

      if (error) throw error;
      setFeatured(data || []);
    } catch (error) {
      console.error("Error fetching featured:", error);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  if (loading || featured.length === 0) {
    return (
      <div className="relative h-[500px] overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card/80 to-background">
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-muted-foreground">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  const current = featured[currentIndex];

  return (
    <div className="group relative h-[500px] overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `url(${current.cover_image_url})`,
          filter: "blur(20px) brightness(0.4)",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      <div className="relative z-10 flex h-full items-end p-8 md:p-12">
        <div className="w-full max-w-4xl space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {current.manga_type}
            </Badge>
            {current.manga_genres?.slice(0, 3).map((mg: any, i: number) => (
              <Badge key={i} variant="outline">
                {mg.genres?.name}
              </Badge>
            ))}
          </div>

          <h1 className="text-4xl font-bold text-foreground md:text-6xl">
            {current.title}
          </h1>

          {current.description && (
            <p className="max-w-2xl text-lg text-foreground/80 line-clamp-3">
              {current.description}
            </p>
          )}

          <div className="flex items-center gap-6 text-sm text-foreground/70">
            {current.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>{current.rating.toFixed(1)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{current.total_views?.toLocaleString() || 0}</span>
            </div>
            {current.status && (
              <Badge variant={current.status === "ongoing" ? "default" : "outline"}>
                {current.status}
              </Badge>
            )}
          </div>

          <div className="flex gap-4">
            <Link to={`/manga/${current.id}`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                اقرأ الآن
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              المزيد من التفاصيل
            </Button>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 bg-background/20 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background/40 group-hover:opacity-100"
        onClick={prev}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 bg-background/20 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background/40 group-hover:opacity-100"
        onClick={next}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {featured.map((_, i) => (
          <button
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === currentIndex
                ? "w-8 bg-primary"
                : "w-2 bg-foreground/30 hover:bg-foreground/50"
            }`}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};
