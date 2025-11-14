import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Filter } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function Browse() {
  const { type } = useParams<{ type: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const { data: genres } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("genres").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: manga, isLoading } = useQuery({
    queryKey: ["browse", type, selectedGenre, selectedStatus, selectedYear],
    queryFn: async () => {
      let query = supabase
        .from("manga")
        .select(`
          *,
          manga_genres(
            genres(name, slug)
          )
        `)
        .order("created_at", { ascending: false });

      if (type && type !== "all") {
        query = query.eq("manga_type", type as "manga" | "manhwa" | "manhua");
      }

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus as "ongoing" | "completed" | "hiatus" | "cancelled");
      }

      if (selectedYear !== "all") {
        query = query.eq("release_year", parseInt(selectedYear));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by genre if selected
      if (selectedGenre !== "all") {
        return data.filter((m: any) =>
          m.manga_genres.some((mg: any) => mg.genres.slug === selectedGenre)
        );
      }

      return data;
    },
  });

  const filteredManga = manga?.filter((m: any) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeLabels: Record<string, string> = {
    manga: "مانجا",
    manhwa: "مانهوا",
    manhua: "مانها",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {type ? typeLabels[type] || "جميع المانجا" : "جميع المانجا"}
          </h1>
          <p className="text-muted-foreground">اكتشف وتصفح مكتبتنا الضخمة</p>
        </div>

        {/* Filters */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="التصنيف" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {genres?.map((genre) => (
                <SelectItem key={genre.id} value={genre.slug}>
                  {genre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="ongoing">مستمر</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="hiatus">متوقف</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <SelectValue placeholder="السنة" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع السنوات</SelectItem>
              {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </Card>
            ))
          ) : filteredManga && filteredManga.length > 0 ? (
            filteredManga.map((item: any) => (
              <Link key={item.id} to={`/manga/${item.id}`}>
                <Card className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-lg">
                  <div className="aspect-[3/4] overflow-hidden">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <span className="text-muted-foreground">لا توجد صورة</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[item.manga_type] || item.manga_type}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">لا توجد نتائج</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
