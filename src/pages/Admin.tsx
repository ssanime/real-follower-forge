import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MangaManagement } from "@/components/admin/MangaManagement";
import { GenreManagement } from "@/components/admin/GenreManagement";
import { AddMangaForm } from "@/components/admin/AddMangaForm";
import { SourceManagement } from "@/components/admin/SourceManagement";
import { CatalogScraper } from "@/components/admin/CatalogScraper";
import Navigation from "@/components/Navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }

        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .single();

        if (error || !roleData) {
          toast({
            title: "غير مصرح",
            description: "ليس لديك صلاحية الوصول إلى لوحة التحكم",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchSources = async () => {
      const { data } = await supabase
        .from("scraper_sources")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (data) setSources(data);
    };
    if (isAdmin) fetchSources();
  }, [isAdmin]);

  const handleSourceChange = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    const source = sources.find((s) => s.id === sourceId);
    if (source) {
      // Don't auto-fill, just select the source
    }
  };

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
      const { data, error } = await supabase.functions.invoke('scrape-manga', {
        body: { sourceUrl }
      });

      if (error) throw error;

      toast({
        title: "نجح!",
        description: "تم بدء السحب بنجاح",
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground">إدارة محتوى المانجا والمانهوا والمانها</p>
        </div>

        <Tabs defaultValue="scraper" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="scraper">السحب من رابط</TabsTrigger>
            <TabsTrigger value="catalog">سحب الكتالوج</TabsTrigger>
            <TabsTrigger value="sources">إدارة المصادر</TabsTrigger>
            <TabsTrigger value="add-content">إضافة محتوى</TabsTrigger>
            <TabsTrigger value="manage">إدارة المانجا</TabsTrigger>
            <TabsTrigger value="genres">التصنيفات</TabsTrigger>
          </TabsList>

          <TabsContent value="scraper" className="mt-6">
            <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">السحب من رابط</h2>
                  <p className="text-sm text-muted-foreground">
                    اختر المصدر ثم أدخل رابط المانجا لسحب البيانات تلقائيًا
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">اختر المصدر (اختياري)</label>
                  <Select value={selectedSourceId} onValueChange={handleSourceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مصدرًا..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name} - {source.base_url}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="https://lekmanga.net/manga/..."
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="bg-background/50"
                  dir="ltr"
                />
                <Button
                  onClick={handleScrapeFromUrl}
                  disabled={isScrapingUrl}
                  className="w-full"
                >
                  {isScrapingUrl ? "جاري السحب..." : "ابدأ السحب"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="catalog" className="mt-6">
            <CatalogScraper />
          </TabsContent>

          <TabsContent value="sources" className="mt-6">
            <SourceManagement />
          </TabsContent>

          <TabsContent value="add-content" className="mt-6">
            <AddMangaForm />
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <MangaManagement />
          </TabsContent>

          <TabsContent value="genres" className="mt-6">
            <GenreManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
