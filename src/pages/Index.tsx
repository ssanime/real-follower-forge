import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { LatestChapters } from "@/components/home/LatestChapters";

const Index = () => {
  const [latestManga, setLatestManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const perPage = 25; // 5 × 5

  useEffect(() => {
    fetchLatestManga(page);
  }, [page]);

  const fetchLatestManga = async (pageNumber: number) => {
    try {
      const from = (pageNumber - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await supabase
        .from("manga")
        .select(
          `*,
           manga_genres(
             genres(name)
           )`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLatestManga(data || []);

      if (typeof count === "number" && count > 0) {
        setTotalPages(Math.max(1, Math.ceil(count / perPage)));
      } else {
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching manga:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Featured Manga Carousel */}
        <div className="mb-12">
          <FeaturedSection />
        </div>

        {/* Latest Chapters Section */}
        <LatestChapters />

        {/* Latest Manga Section */}
        <section className="py-12">
          <h2 className="mb-8 text-3xl font-bold text-foreground">أحدث المانجا</h2>
          {loading ? (
            <div className="text-center text-muted-foreground">جاري التحميل...</div>
          ) : latestManga && latestManga.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {latestManga.map((manga) => (
                   <Link key={manga.id} to={`/manga/${manga.slug}`}>
                     <Card className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-[var(--shadow-glow)]">
                      <div className="aspect-[3/4] overflow-hidden">
                        <img
                          src={manga.cover_image_url || "/placeholder.svg"}
                          alt={manga.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">
                          {manga.title}
                        </h3>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {manga.manga_type}
                          </Badge>
                          {manga.manga_genres?.slice(0, 2).map((mg: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {mg.genres?.name}
                            </Badge>
                          ))}
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
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              لا توجد مانجا متاحة. ابدأ بإضافة المحتوى من لوحة التحكم!
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Index;
