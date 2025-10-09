import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

interface Page {
  id: string;
  page_number: number;
  image_url: string;
}

interface Chapter {
  id: string;
  title: string | null;
  chapter_number: number;
  manga_id: string;
}

export default function ChapterReader() {
  const { id } = useParams<{ id: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextChapter, setNextChapter] = useState<string | null>(null);
  const [prevChapter, setPrevChapter] = useState<string | null>(null);

  useEffect(() => {
    const fetchChapterData = async () => {
      if (!id) return;

      setLoading(true);

      // Fetch chapter details
      const { data: chapterData } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .single();

      if (chapterData) {
        setChapter(chapterData);

        // Fetch next chapter
        const { data: nextData } = await supabase
          .from("chapters")
          .select("id")
          .eq("manga_id", chapterData.manga_id)
          .gt("chapter_number", chapterData.chapter_number)
          .order("chapter_number", { ascending: true })
          .limit(1)
          .single();

        if (nextData) setNextChapter(nextData.id);

        // Fetch previous chapter
        const { data: prevData } = await supabase
          .from("chapters")
          .select("id")
          .eq("manga_id", chapterData.manga_id)
          .lt("chapter_number", chapterData.chapter_number)
          .order("chapter_number", { ascending: false })
          .limit(1)
          .single();

        if (prevData) setPrevChapter(prevData.id);
      }

      // Fetch pages
      const { data: pagesData } = await supabase
        .from("chapter_pages")
        .select("*")
        .eq("chapter_id", id)
        .order("page_number", { ascending: true });

      if (pagesData) setPages(pagesData);

      setLoading(false);
    };

    fetchChapterData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center">الفصل غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={`/manga/${chapter.manga_id}`}>
              <Button variant="outline">العودة للمانجا</Button>
            </Link>
            
            <h1 className="text-xl font-bold">
              {chapter.title || `الفصل ${chapter.chapter_number}`}
            </h1>

            <div className="flex gap-2">
              {prevChapter && (
                <Link to={`/chapter/${prevChapter}`}>
                  <Button variant="outline" size="icon">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              {nextChapter && (
                <Link to={`/chapter/${nextChapter}`}>
                  <Button variant="outline" size="icon">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {pages.map((page) => (
            <div key={page.id} className="w-full">
              <img
                src={page.image_url}
                alt={`صفحة ${page.page_number}`}
                className="w-full h-auto rounded-lg shadow-lg"
                loading="lazy"
              />
            </div>
          ))}

          {pages.length === 0 && (
            <p className="text-center text-muted-foreground">
              لا توجد صفحات لهذا الفصل
            </p>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          {prevChapter && (
            <Link to={`/chapter/${prevChapter}`}>
              <Button variant="default">
                <ArrowRight className="w-4 h-4 ml-2" />
                الفصل السابق
              </Button>
            </Link>
          )}
          {nextChapter && (
            <Link to={`/chapter/${nextChapter}`}>
              <Button variant="default">
                الفصل التالي
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
