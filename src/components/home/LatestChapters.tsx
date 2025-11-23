import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

export const LatestChapters = () => {
  const [latestChapters, setLatestChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const perPage = 36; // 6 × 6

  useEffect(() => {
    fetchLatestChapters(page);
  }, [page]);

  const fetchLatestChapters = async (pageNumber: number) => {
    try {
      const from = (pageNumber - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await supabase
        .from("chapters")
        .select(
          `*,
           manga (
             id,
             slug,
             title,
             cover_image_url,
             manga_type
           )`,
          { count: "exact" }
        )
        .order("release_date", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLatestChapters(data || []);

      if (typeof count === "number" && count > 0) {
        setTotalPages(Math.max(1, Math.ceil(count / perPage)));
      } else {
        setTotalPages(1);
      }
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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {latestChapters.map((chapter) => (
          <Link key={chapter.id} to={`/manga/${chapter.manga?.slug}/${chapter.slug}`}>
            <Card className="group flex items-center gap-4 border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-glow)]">
              <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={chapter.manga?.cover_image_url || "/placeholder.svg"}
                  alt={chapter.manga?.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
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
                    {chapter.release_date
                      ? new Date(chapter.release_date).toLocaleDateString("ar-EG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : ""}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            التالي
          </Button>
        </div>
      )}
    </section>
  );
};
