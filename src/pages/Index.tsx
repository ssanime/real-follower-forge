import { useState } from "react";
import { Book, Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: manga, isLoading } = useQuery({
    queryKey: ["manga"],
    queryFn: async () => {
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
      return data;
    },
  });

  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manga")
        .select("*")
        .order("total_views", { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card to-background">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iaHNsKDI2MyA3MCUgNTAlIC8gMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 backdrop-blur-sm">
              <Book className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">قراءة المانجا والمانهوا والمانها</span>
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              اكتشف عالم
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> المانجا</span>
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              آلاف الفصول من المانجا والمانهوا والمانها بانتظارك
            </p>

            {/* Search Bar */}
            <div className="relative mx-auto max-w-xl">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ابحث عن المانجا المفضلة لديك..."
                className="h-14 rounded-full border-primary/20 bg-card/50 pr-12 text-right backdrop-blur-sm focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      {trending && trending.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="mb-8 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">الأكثر شهرة</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {trending.map((item) => (
              <Card 
                key={item.id}
                className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:scale-105 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
              >
                <div className="aspect-[2/3] overflow-hidden bg-muted">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Book className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.manga_type}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Latest Manga Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">أحدث الإضافات</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-border/50 bg-card/50">
                <div className="aspect-[2/3] animate-pulse bg-muted" />
                <div className="p-4">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </Card>
            ))}
          </div>
        ) : manga && manga.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {manga
              .filter((item) =>
                searchQuery
                  ? item.title.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              )
              .map((item) => (
                <Card
                  key={item.id}
                  className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:scale-105 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
                >
                  <div className="aspect-[2/3] overflow-hidden bg-muted">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Book className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">
                      {item.title}
                    </h3>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {item.manga_type}
                      </Badge>
                      {item.manga_genres?.slice(0, 2).map((mg: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {mg.genres.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-card/50 p-12 text-center backdrop-blur-sm">
            <Book className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">لا توجد مانجا بعد</h3>
            <p className="text-muted-foreground">ابدأ بإضافة مانجا من مواقعك</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
