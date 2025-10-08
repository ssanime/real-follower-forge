import { useState } from "react";
import { Database, Link2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const Admin = () => {
  const { toast } = useToast();
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  
  // Manual manga add form
  const [mangaData, setMangaData] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    manga_type: "manga" as "manga" | "manhwa" | "manhua",
    author: "",
    artist: "",
  });

  const handleScrapeFromUrl = async () => {
    if (!sourceUrl.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رابط الموقع",
        variant: "destructive",
      });
      return;
    }

    setIsScrapingUrl(true);
    
    try {
      // Call edge function to scrape manga from URL
      const { data, error } = await supabase.functions.invoke('scrape-manga', {
        body: { sourceUrl }
      });

      if (error) throw error;

      toast({
        title: "نجح!",
        description: `تم سحب ${data.mangaCount} مانجا بنجاح`,
      });
      
      setSourceUrl("");
    } catch (error: any) {
      console.error("Scraping error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل سحب البيانات من الموقع",
        variant: "destructive",
      });
    } finally {
      setIsScrapingUrl(false);
    }
  };

  const handleAddManga = async (e: React.FormEvent) => {
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
      const { error } = await supabase.from("manga").insert({
        title: mangaData.title,
        description: mangaData.description,
        cover_image_url: mangaData.cover_image_url,
        manga_type: mangaData.manga_type,
        author: mangaData.author,
        artist: mangaData.artist,
      });

      if (error) throw error;

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
      });
    } catch (error: any) {
      console.error("Add manga error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشلت إضافة المانجا",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground">إدارة محتوى المانجا والمانهوا والمانها</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Scraper Section */}
          <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">سحب من موقع</h2>
                <p className="text-sm text-muted-foreground">اسحب المحتوى من مواقعك تلقائياً</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="sourceUrl" className="text-right">رابط الموقع</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  placeholder="https://your-manga-site.com"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="mt-2 text-right"
                  dir="rtl"
                />
              </div>

              <Button
                onClick={handleScrapeFromUrl}
                disabled={isScrapingUrl}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isScrapingUrl ? "جاري السحب..." : "ابدأ السحب"}
              </Button>

              <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  💡 سيتم سحب جميع المانجا، الفصول، والصور من الموقع المحدد وحفظها في قاعدة البيانات
                </p>
              </div>
            </div>
          </Card>

          {/* Manual Add Section */}
          <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">إضافة يدوياً</h2>
                <p className="text-sm text-muted-foreground">أضف مانجا جديدة يدوياً</p>
              </div>
            </div>

            <form onSubmit={handleAddManga} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-right">العنوان *</Label>
                <Input
                  id="title"
                  value={mangaData.title}
                  onChange={(e) => setMangaData({ ...mangaData, title: e.target.value })}
                  className="mt-2 text-right"
                  dir="rtl"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-right">النوع *</Label>
                <Select
                  value={mangaData.manga_type}
                  onValueChange={(value: any) => setMangaData({ ...mangaData, manga_type: value })}
                >
                  <SelectTrigger className="mt-2 text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manga">مانجا</SelectItem>
                    <SelectItem value="manhwa">مانهوا</SelectItem>
                    <SelectItem value="manhua">مانها</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description" className="text-right">الوصف</Label>
                <Textarea
                  id="description"
                  value={mangaData.description}
                  onChange={(e) => setMangaData({ ...mangaData, description: e.target.value })}
                  className="mt-2 text-right"
                  dir="rtl"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="coverUrl" className="text-right">رابط صورة الغلاف</Label>
                <Input
                  id="coverUrl"
                  type="url"
                  value={mangaData.cover_image_url}
                  onChange={(e) => setMangaData({ ...mangaData, cover_image_url: e.target.value })}
                  className="mt-2 text-right"
                  dir="rtl"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="author" className="text-right">الكاتب</Label>
                  <Input
                    id="author"
                    value={mangaData.author}
                    onChange={(e) => setMangaData({ ...mangaData, author: e.target.value })}
                    className="mt-2 text-right"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="artist" className="text-right">الرسام</Label>
                  <Input
                    id="artist"
                    value={mangaData.artist}
                    onChange={(e) => setMangaData({ ...mangaData, artist: e.target.value })}
                    className="mt-2 text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                إضافة المانجا
              </Button>
            </form>
          </Card>
        </div>

        {/* Database Stats */}
        <Card className="mt-6 border-border/50 bg-card/50 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">إحصائيات قاعدة البيانات</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border/50 bg-background/50 p-4">
              <p className="text-sm text-muted-foreground">إجمالي المانجا</p>
              <p className="mt-1 text-2xl font-bold text-foreground">-</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/50 p-4">
              <p className="text-sm text-muted-foreground">إجمالي الفصول</p>
              <p className="mt-1 text-2xl font-bold text-foreground">-</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/50 p-4">
              <p className="text-sm text-muted-foreground">المصادر النشطة</p>
              <p className="mt-1 text-2xl font-bold text-foreground">-</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
