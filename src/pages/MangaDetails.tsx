import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Star, Calendar, User, Palette, ArrowRight } from "lucide-react";

interface Manga {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author: string | null;
  artist: string | null;
  status: string;
  manga_type: string;
  rating: number | null;
  release_year: number | null;
}

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface Chapter {
  id: string;
  title: string | null;
  chapter_number: number;
  release_date: string;
}

export default function MangaDetails() {
  const { id } = useParams<{ id: string }>();
  const [manga, setManga] = useState<Manga | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMangaDetails = async () => {
      if (!id) return;

      setLoading(true);

      const { data: mangaData } = await supabase
        .from("manga")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (mangaData) setManga(mangaData);

      const { data: genresData } = await supabase
        .from("manga_genres")
        .select("genre_id, genres(id, name, slug)")
        .eq("manga_id", id);

      if (genresData) {
        const genresList = genresData
          .map((g: any) => g.genres)
          .filter(Boolean);
        setGenres(genresList);
      }

      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", id)
        .order("chapter_number", { ascending: false });

      if (chaptersData) setChapters(chaptersData);

      setLoading(false);
    };

    fetchMangaDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl text-muted-foreground">المانجا غير موجودة</p>
          <Link to="/">
            <Button className="mt-4">العودة للرئيسية</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero Section with Cover */}
      <div className="relative h-96 overflow-hidden border-b">
        {manga.cover_image_url && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30"
              style={{ backgroundImage: `url(${manga.cover_image_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          </>
        )}
      </div>

      <div className="container mx-auto px-4 -mt-64 relative z-10">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Cover Image */}
          <div className="md:col-span-1">
            {manga.cover_image_url ? (
              <img
                src={manga.cover_image_url}
                alt={manga.title}
                className="w-full rounded-xl shadow-2xl border-4 border-card hover-scale"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-muted rounded-xl flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Manga Info */}
          <div className="md:col-span-3 space-y-6">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border shadow-lg">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {manga.title}
              </h1>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {genres.map((genre) => (
                  <Badge key={genre.id} variant="secondary" className="text-sm">
                    {genre.name}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {manga.author && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">المؤلف</p>
                      <p className="text-sm font-medium">{manga.author}</p>
                    </div>
                  </div>
                )}
                
                {manga.artist && (
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">الرسام</p>
                      <p className="text-sm font-medium">{manga.artist}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">الحالة</p>
                    <p className="text-sm font-medium">
                      {manga.status === "ongoing" ? "مستمرة" : "منتهية"}
                    </p>
                  </div>
                </div>

                {manga.rating !== null && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">التقييم</p>
                      <p className="text-sm font-medium">{manga.rating.toFixed(1)}</p>
                    </div>
                  </div>
                )}
              </div>

              {manga.description && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">القصة</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {manga.description}
                  </p>
                </div>
              )}
            </div>

            {/* Chapters List */}
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">الفصول</h2>
                <Badge variant="outline">{chapters.length} فصل</Badge>
              </div>

              {chapters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد فصول متاحة حالياً</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {chapters.map((chapter) => (
                    <Link key={chapter.id} to={`/chapter/${chapter.id}`}>
                      <Card className="hover:bg-accent/50 transition-all hover-scale cursor-pointer">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {chapter.title || `الفصل ${chapter.chapter_number}`}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {new Date(chapter.release_date).toLocaleDateString("ar-EG")}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
