import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

export const LatestChapters = () => {
  const [latestChapters, setLatestChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestChapters();
  }, []);

  const fetchLatestChapters = async () => {
    try {
      const { data, error } = await supabase
        .from("chapters")
        .select(`
          *,
          manga (
            id,
            title,
            cover_image_url,
            manga_type
          )
        `)
        .order("release_date", { ascending: false })
        .limit(12);

      if (error) throw error;
      setLatestChapters(data || []);
    } catch (error) {
      console.error("Error fetching latest chapters:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12">
        <h2 className="mb-8 text-3xl font-bold text-foreground">آخر الفصول</h2>
        <div className="text-center text-muted-foreground">جاري التحميل...</div>
      </section>
    );
  }

  if (latestChapters.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mb-8 flex items-center gap-3">
        <Clock className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">آخر الفصول</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {latestChapters.map((chapter) => (
          <Link 
            key={chapter.id} 
            to={`/manga/${chapter.manga?.id}/chapter/${chapter.chapter_number}`}
          >
            <Card className="group flex items-center gap-4 border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-glow)]">
              <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={chapter.manga?.cover_image_url || "/placeholder.svg"}
                  alt={chapter.manga?.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              
              <div className="flex-1 space-y-2">
                <h3 className="line-clamp-1 font-semibold text-foreground">
                  {chapter.manga?.title}
                </h3>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {chapter.manga?.manga_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    الفصل {chapter.chapter_number}
                  </Badge>
                </div>
                
                {chapter.title && (
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {chapter.title}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(chapter.release_date).toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};
