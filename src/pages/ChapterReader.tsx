import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft, Home, Menu } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Page {
  id: string;
  page_number: number;
  image_url: string;
}

interface Chapter {
  id: string;
  slug: string;
  title: string | null;
  chapter_number: number;
  manga_id: string;
}

interface Manga {
  id: string;
  slug: string;
  title: string;
}


export default function ChapterReader() {
  const { mangaSlug, chapterSlug } = useParams<{ mangaSlug: string; chapterSlug: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [manga, setManga] = useState<Manga | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextChapter, setNextChapter] = useState<Chapter | null>(null);
  const [prevChapter, setPrevChapter] = useState<Chapter | null>(null);
  const [showNav, setShowNav] = useState(true);

  useEffect(() => {
    const fetchChapterData = async () => {
      if (!mangaSlug || !chapterSlug) return;

      setLoading(true);

      // Fetch manga by slug first
      const { data: mangaData } = await supabase
        .from("manga")
        .select("id, slug, title")
        .eq("slug", mangaSlug)
        .maybeSingle();

      if (!mangaData) {
        setLoading(false);
        return;
      }

      setManga(mangaData);

      // Fetch chapter by slug within this manga
      const { data: chapterData } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", mangaData.id)
        .eq("slug", chapterSlug)
        .maybeSingle();

      if (chapterData) {
        setChapter(chapterData);

        // Fetch next chapter (by number)
        const { data: nextData } = await supabase
          .from("chapters")
          .select("id, slug, chapter_number")
          .eq("manga_id", mangaData.id)
          .gt("chapter_number", chapterData.chapter_number)
          .order("chapter_number", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextData) setNextChapter(nextData as Chapter);

        // Fetch previous chapter (by number)
        const { data: prevData } = await supabase
          .from("chapters")
          .select("id, slug, chapter_number")
          .eq("manga_id", mangaData.id)
          .lt("chapter_number", chapterData.chapter_number)
          .order("chapter_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevData) setPrevChapter(prevData as Chapter);
      }

      // Fetch pages
      const { data: pagesData } = await supabase
        .from("chapter_pages")
        .select("*")
        .eq("chapter_id", chapterData?.id)
        .order("page_number", { ascending: true });

      if (pagesData) setPages(pagesData);

      setLoading(false);
    };

    fetchChapterData();
  }, [mangaSlug, chapterSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <p className="text-xl text-muted-foreground">الفصل غير موجود</p>
          <Link to="/">
            <Button className="mt-4">العودة للرئيسية</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black" dir="rtl">
      {/* Top Navigation Bar */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showNav ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="bg-black/90 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link to={`/manga/${manga?.slug || mangaSlug}`}>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Home className="w-4 h-4 ml-2" />
                  العودة
                </Button>
              </Link>
              
              <div className="text-center flex-1">
                <h1 className="text-sm font-bold text-white">
                  {manga?.title}
                </h1>
                <p className="text-xs text-white/60">
                  {chapter.title || `الفصل ${chapter.chapter_number}`}
                </p>
              </div>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowNav(!showNav)}
                className="text-white hover:bg-white/10"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Display */}
      <div className="relative">
        <div 
          className="flex flex-col items-center cursor-pointer"
          onClick={() => setShowNav(!showNav)}
        >
          {pages.length === 0 ? (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center text-white/60">
                <p className="text-xl mb-2">لا توجد صفحات متاحة</p>
                <p className="text-sm">لم يتم تحميل صفحات هذا الفصل بعد</p>
              </div>
            </div>
          ) : (
            pages.map((page) => (
              <div key={page.id} className="w-full max-w-4xl relative group">
                <img
                  src={page.image_url}
                  alt={`صفحة ${page.page_number}`}
                  className="w-full h-auto"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  {page.page_number} / {pages.length}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showNav ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-black/90 backdrop-blur-sm border-t border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-4">
              {prevChapter ? (
                <Link to={`/manga/${manga?.slug || mangaSlug}/${prevChapter.slug}`} className="flex-1 max-w-xs">
                  <Button 
                    variant="outline" 
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    <ArrowRight className="w-4 h-4 ml-2" />
                    الفصل السابق
                  </Button>
                </Link>
              ) : (
                <div className="flex-1 max-w-xs" />
              )}

              <Link to={`/manga/${manga?.slug || mangaSlug}`}>
                <Button variant="default" size="sm">
                  قائمة الفصول
                </Button>
              </Link>

              {nextChapter ? (
                <Link to={`/manga/${manga?.slug || mangaSlug}/${nextChapter.slug}`} className="flex-1 max-w-xs">
                  <Button 
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    الفصل التالي
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                </Link>
              ) : (
                <div className="flex-1 max-w-xs" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
