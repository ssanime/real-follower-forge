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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AddMangaForm = () => {
  const { toast } = useToast();
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [alternativeTitles, setAlternativeTitles] = useState<string>("");
  const [mangas, setMangas] = useState<any[]>([]);
  const [selectedMangaId, setSelectedMangaId] = useState<string>("");
  const [chapterData, setChapterData] = useState({
    number: "",
    title: "",
    imageUrls: "",
  });
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
    fetchMangas();
  }, []);

  const fetchGenres = async () => {
    const { data } = await supabase.from("genres").select("*").order("name");
    setGenres(data || []);
  };

  const fetchMangas = async () => {
    const { data } = await supabase.from("manga").select("id, title").order("title");
    setMangas(data || []);
  };

  const handleSubmitManga = async (e: React.FormEvent) => {
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
      await fetchMangas();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشلت إضافة المانجا",
        variant: "destructive",
      });
    }
  };

  const handleSubmitChapter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMangaId) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار المانجا",
        variant: "destructive",
      });
      return;
    }

    if (!chapterData.number) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رقم الفصل",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: chapter, error: chapterError } = await supabase
        .from("chapters")
        .insert({
          manga_id: selectedMangaId,
          chapter_number: parseFloat(chapterData.number),
          title: chapterData.title || `الفصل ${chapterData.number}`,
          release_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (chapterError) throw chapterError;

      if (chapterData.imageUrls.trim()) {
        const imageUrls = chapterData.imageUrls
          .split("\n")
          .map((url) => url.trim())
          .filter((url) => url);

        const pages = imageUrls.map((imageUrl, index) => ({
          chapter_id: chapter.id,
          page_number: index + 1,
          image_url: imageUrl,
        }));

        const { error: pagesError } = await supabase
          .from("chapter_pages")
          .insert(pages);

        if (pagesError) throw pagesError;
      }

      toast({
        title: "نجح!",
        description: "تمت إضافة الفصل بنجاح",
      });

      setChapterData({
        number: "",
        title: "",
        imageUrls: "",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشلت إضافة الفصل",
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
          <h2 className="text-xl font-bold text-foreground">إضافة محتوى يدويًا</h2>
          <p className="text-sm text-muted-foreground">
            أضف مانجا جديدة أو فصول لمانجا موجودة
          </p>
        </div>
      </div>

      <Tabs defaultValue="manga" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manga">إضافة مانجا</TabsTrigger>
          <TabsTrigger value="chapter">إضافة فصل</TabsTrigger>
        </TabsList>

        <TabsContent value="manga" className="mt-6">
          <form onSubmit={handleSubmitManga} className="space-y-6">
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
                    <SelectItem value="ongoing">مستمرة</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="hiatus">متوقفة مؤقتًا</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_image_url">رابط صورة الغلاف</Label>
                <Input
                  id="cover_image_url"
                  value={mangaData.cover_image_url}
                  onChange={(e) =>
                    setMangaData({ ...mangaData, cover_image_url: e.target.value })
                  }
                  placeholder="https://example.com/cover.jpg"
                  type="url"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={mangaData.description}
                onChange={(e) =>
                  setMangaData({ ...mangaData, description: e.target.value })
                }
                placeholder="وصف المانجا..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternative_titles">العناوين البديلة (واحد في كل سطر)</Label>
              <Textarea
                id="alternative_titles"
                value={alternativeTitles}
                onChange={(e) => setAlternativeTitles(e.target.value)}
                placeholder="العنوان البديل 1&#10;العنوان البديل 2"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>التصنيفات</Label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-background/50 p-4">
                {genres.map((genre) => (
                  <Badge
                    key={genre.id}
                    variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleGenre(genre.id)}
                  >
                    {genre.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              إضافة المانجا
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="chapter" className="mt-6">
          <form onSubmit={handleSubmitChapter} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="manga_select">اختر المانجا *</Label>
              <Select value={selectedMangaId} onValueChange={setSelectedMangaId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المانجا..." />
                </SelectTrigger>
                <SelectContent>
                  {mangas.map((manga) => (
                    <SelectItem key={manga.id} value={manga.id}>
                      {manga.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chapter_number">رقم الفصل *</Label>
                <Input
                  id="chapter_number"
                  type="number"
                  step="0.1"
                  value={chapterData.number}
                  onChange={(e) =>
                    setChapterData({ ...chapterData, number: e.target.value })
                  }
                  placeholder="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter_title">عنوان الفصل</Label>
                <Input
                  id="chapter_title"
                  value={chapterData.title}
                  onChange={(e) =>
                    setChapterData({ ...chapterData, title: e.target.value })
                  }
                  placeholder="عنوان الفصل (اختياري)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_urls">روابط صور الفصل (واحد في كل سطر)</Label>
              <Textarea
                id="image_urls"
                value={chapterData.imageUrls}
                onChange={(e) =>
                  setChapterData({ ...chapterData, imageUrls: e.target.value })
                }
                placeholder="https://example.com/page1.jpg&#10;https://example.com/page2.jpg"
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                أدخل رابط كل صفحة في سطر منفصل بالترتيب
              </p>
            </div>

            <Button type="submit" className="w-full">
              إضافة الفصل
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
