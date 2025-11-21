import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { LatestChapters } from "@/components/home/LatestChapters";
import { TrendingUp, Clock, Star, Flame } from "lucide-react";

const Index = () => {
  const [latestManga, setLatestManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestManga();
  }, []);

  const fetchLatestManga = async () => {
    try {
      const { data, error } = await supabase
        .from("manga")
        .select(`
          *,
          manga_genres(
            genres(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      setLatestManga(data || []);
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

        {/* Quick Categories */}
        <div className="mb-12 grid gap-6 md:grid-cols-4">
          <Link to="/browse/manga" className="group">
            <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-[var(--shadow-glow)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">الأكثر شعبية</h2>
              </div>
              <p className="text-muted-foreground">المانجا الأكثر قراءة</p>
            </Card>
          </Link>

          <Link to="/browse/manhwa" className="group">
            <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-[var(--shadow-glow)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">آخر التحديثات</h2>
              </div>
              <p className="text-muted-foreground">أحدث الفصول المضافة</p>
            </Card>
          </Link>

          <Link to="/browse/manhua" className="group">
            <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-[var(--shadow-glow)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">الأعلى تقييمًا</h2>
              </div>
              <p className="text-muted-foreground">المانجا الحاصلة على أعلى التقييمات</p>
            </Card>
          </Link>

          <Link to="/browse/all" className="group">
            <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-[var(--shadow-glow)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">الكل</h2>
              </div>
              <p className="text-muted-foreground">استكشف كل المحتوى</p>
            </Card>
          </Link>
        </div>

        {/* Latest Chapters Section */}
        <LatestChapters />

        {/* Latest Manga Section */}
        <section className="py-12">
          <h2 className="mb-8 text-3xl font-bold text-foreground">أحدث المانجا</h2>
          {loading ? (
            <div className="text-center text-muted-foreground">جاري التحميل...</div>
          ) : latestManga && latestManga.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {latestManga.map((manga) => (
                <Link key={manga.id} to={`/manga/${manga.id}`}>
                  <Card className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-[var(--shadow-glow)]">
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={manga.cover_image_url || "/placeholder.svg"}
                        alt={manga.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
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
