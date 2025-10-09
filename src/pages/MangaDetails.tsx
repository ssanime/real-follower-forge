import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";

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

      // Fetch manga details
      const { data: mangaData } = await supabase
        .from("manga")
        .select("*")
        .eq("id", id)
        .single();

      if (mangaData) setManga(mangaData);

      // Fetch genres
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

      // Fetch chapters
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center">المانجا غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1">
          {manga.cover_image_url && (
            <img
              src={manga.cover_image_url}
              alt={manga.title}
              className="w-full rounded-lg shadow-lg"
            />
          )}
        </div>

        <div className="md:col-span-2">
          <h1 className="text-4xl font-bold mb-4">{manga.title}</h1>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {genres.map((genre) => (
              <Badge key={genre.id} variant="secondary">
                {genre.name}
              </Badge>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            {manga.author && (
              <p>
                <span className="font-semibold">المؤلف:</span> {manga.author}
              </p>
            )}
            {manga.artist && (
              <p>
                <span className="font-semibold">الرسام:</span> {manga.artist}
              </p>
            )}
            <p>
              <span className="font-semibold">الحالة:</span>{" "}
              {manga.status === "ongoing" ? "مستمر" : "مكتمل"}
            </p>
            <p>
              <span className="font-semibold">النوع:</span> {manga.manga_type}
            </p>
            {manga.rating && (
              <p>
                <span className="font-semibold">التقييم:</span> {manga.rating}/10
              </p>
            )}
          </div>

          {manga.description && (
            <div className="mt-4">
              <h2 className="text-2xl font-bold mb-2">القصة</h2>
              <p className="text-muted-foreground leading-relaxed">
                {manga.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            الفصول ({chapters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                to={`/chapter/${chapter.id}`}
                className="block"
              >
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {chapter.title || `الفصل ${chapter.chapter_number}`}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {new Date(chapter.release_date).toLocaleDateString("ar")}
                  </span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
