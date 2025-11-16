import { useState } from "react";
import { Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MangaManagement } from "@/components/admin/MangaManagement";
import { GenreManagement } from "@/components/admin/GenreManagement";
import { AddMangaForm } from "@/components/admin/AddMangaForm";
import Navigation from "@/components/Navigation";

const Admin = () => {
  const { toast } = useToast();
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground">إدارة محتوى المانجا والمانهوا والمانها</p>
        </div>

        <Tabs defaultValue="scraper" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scraper">السحب التلقائي</TabsTrigger>
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
                    أدخل رابط موقع المانجا لسحب البيانات تلقائيًا
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  placeholder="https://example.com/manga/..."
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
