import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const AddMangaForm = () => {
  const { toast } = useToast();
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [alternativeTitles, setAlternativeTitles] = useState<string>("");
  const [mangaData, setMangaData] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    manga_type: "manga" as "manga" | "manhwa" | "manhua",
    author: "",
    artist: "",
    studio: "",
    release_year: new Date().getFullYear(),
    status: "ongoing" as "ongoing" | "completed" | "hiatus" | "cancelled",
    rating: 0,
  });

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    const { data } = await supabase.from("genres").select("*").order("name");
    setGenres(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mangaData.title.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال عنوان المانجا",
        variant: "destructive",
      });
      return;
    }

    try {
      const altTitlesArray = alternativeTitles
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t);

      const { data: manga, error: mangaError } = await supabase
        .from("manga")
        .insert({
          ...mangaData,
          alternative_titles: altTitlesArray.length > 0 ? altTitlesArray : null,
        })
        .select()
        .single();

      if (mangaError) throw mangaError;

      if (selectedGenres.length > 0 && manga) {
        const genreLinks = selectedGenres.map((genreId) => ({
          manga_id: manga.id,
          genre_id: genreId,
        }));

        const { error: genreError } = await supabase
          .from("manga_genres")
          .insert(genreLinks);

        if (genreError) throw genreError;
      }

      toast({
        title: "نجح!",
        description: "تمت إضافة المانجا بنجاح",
      });

      setMangaData({
        title: "",
        description: "",
        cover_image_url: "",
        manga_type: "manga",
        author: "",
        artist: "",
        studio: "",
        release_year: new Date().getFullYear(),
        status: "ongoing",
        rating: 0,
      });
      setAlternativeTitles("");
      setSelectedGenres([]);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشلت إضافة المانجا",
        variant: "destructive",
      });
    }
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  return (
    <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">إضافة مانجا يدويًا</h2>
          <p className="text-sm text-muted-foreground">
            أضف معلومات المانجا بالتفصيل
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">العنوان *</Label>
            <Input
              id="title"
              value={mangaData.title}
              onChange={(e) =>
                setMangaData({ ...mangaData, title: e.target.value })
              }
              placeholder="اسم المانجا"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manga_type">النوع *</Label>
            <Select
              value={mangaData.manga_type}
              onValueChange={(value: any) =>
                setMangaData({ ...mangaData, manga_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manga">مانجا</SelectItem>
                <SelectItem value="manhwa">مانهوا</SelectItem>
                <SelectItem value="manhua">مانها</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">المؤلف</Label>
            <Input
              id="author"
              value={mangaData.author}
              onChange={(e) =>
                setMangaData({ ...mangaData, author: e.target.value })
              }
              placeholder="اسم المؤلف"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">الرسام</Label>
            <Input
              id="artist"
              value={mangaData.artist}
              onChange={(e) =>
                setMangaData({ ...mangaData, artist: e.target.value })
              }
              placeholder="اسم الرسام"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studio">الاستوديو</Label>
            <Input
              id="studio"
              value={mangaData.studio}
              onChange={(e) =>
                setMangaData({ ...mangaData, studio: e.target.value })
              }
              placeholder="اسم الاستوديو"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="release_year">سنة الإصدار</Label>
            <Input
              id="release_year"
              type="number"
              value={mangaData.release_year}
              onChange={(e) =>
                setMangaData({
                  ...mangaData,
                  release_year: parseInt(e.target.value),
                })
              }
              min={1900}
              max={new Date().getFullYear() + 1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">الحالة</Label>
            <Select
              value={mangaData.status}
              onValueChange={(value: any) =>
                setMangaData({ ...mangaData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ongoing">مستمر</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="hiatus">متوقف مؤقتًا</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating">التقييم (0-10)</Label>
            <Input
              id="rating"
              type="number"
              value={mangaData.rating}
              onChange={(e) =>
                setMangaData({
                  ...mangaData,
                  rating: parseFloat(e.target.value),
                })
              }
              min={0}
              max={10}
              step={0.1}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover">رابط صورة الغلاف</Label>
          <Input
            id="cover"
            value={mangaData.cover_image_url}
            onChange={(e) =>
              setMangaData({ ...mangaData, cover_image_url: e.target.value })
            }
            placeholder="https://example.com/cover.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alt-titles">العناوين البديلة (سطر لكل عنوان)</Label>
          <Textarea
            id="alt-titles"
            value={alternativeTitles}
            onChange={(e) => setAlternativeTitles(e.target.value)}
            placeholder="العنوان البديل 1&#10;العنوان البديل 2&#10;العنوان البديل 3"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">القصة</Label>
          <Textarea
            id="description"
            value={mangaData.description}
            onChange={(e) =>
              setMangaData({ ...mangaData, description: e.target.value })
            }
            placeholder="وصف القصة..."
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <Label>التصنيفات</Label>
          <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border bg-background/50 p-4">
            {genres.map((genre) => (
              <Badge
                key={genre.id}
                variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleGenre(genre.id)}
              >
                {genre.name}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            التصنيفات المحددة: {selectedGenres.length}
          </p>
        </div>

        <Button type="submit" className="w-full">
          إضافة المانجا
        </Button>
      </form>
    </Card>
  );
};
