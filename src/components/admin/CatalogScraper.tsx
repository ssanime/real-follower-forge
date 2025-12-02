import { useState, useEffect } from "react";
import { Globe, Play, Pause, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScraperSource {
  id: string;
  name: string;
  base_url: string;
  is_active: boolean;
}

interface ScrapeLog {
  url: string;
  status: "pending" | "success" | "error" | "processing";
  message?: string;
  title?: string;
}

export const CatalogScraper = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<ScraperSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [catalogUrl, setCatalogUrl] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);

  useEffect(() => {
    const fetchSources = async () => {
      const { data } = await supabase
        .from("scraper_sources")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (data) setSources(data);
    };

    fetchSources();
  }, []);

  const handleSourceChange = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    const source = sources.find((s) => s.id === sourceId);
    if (source) {
      setCatalogUrl(source.base_url);
    }
  };

  const addLog = (log: ScrapeLog) => {
    setLogs((prev) => [log, ...prev].slice(0, 100));
  };

  const updateLog = (url: string, update: Partial<ScrapeLog>) => {
    setLogs((prev) =>
      prev.map((log) => (log.url === url ? { ...log, ...update } : log))
    );
  };

  const handleStartScrape = async () => {
    if (!catalogUrl) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رابط الكتالوج",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setCompletedItems(0);
    setTotalItems(0);

    try {
      // First, get all manga URLs from the catalog
      addLog({ url: catalogUrl, status: "processing", message: "جاري جلب قائمة المانجا..." });

      const { data, error } = await supabase.functions.invoke("scrape-catalog", {
        body: { catalogUrl, sourceId: selectedSourceId },
      });

      if (error) throw error;

      const mangaUrls: string[] = data.mangaUrls || [];
      setTotalItems(mangaUrls.length);

      updateLog(catalogUrl, {
        status: "success",
        message: `تم العثور على ${mangaUrls.length} مانجا`,
      });

      // Process each manga URL
      for (let i = 0; i < mangaUrls.length; i++) {
        const url = mangaUrls[i];

        addLog({ url, status: "processing", message: "جاري السحب..." });

        try {
          const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
            "scrape-manga",
            { body: { sourceUrl: url } }
          );

          if (scrapeError) throw scrapeError;

          updateLog(url, {
            status: "success",
            message: `تم سحب ${scrapeData.chaptersScraped || 0} فصل`,
            title: scrapeData.title,
          });

          setCompletedItems((prev) => prev + 1);
        } catch (err: any) {
          updateLog(url, {
            status: "error",
            message: err.message || "فشل السحب",
          });

          // Retry once
          try {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const { data: retryData } = await supabase.functions.invoke("scrape-manga", {
              body: { sourceUrl: url },
            });

            updateLog(url, {
              status: "success",
              message: `تم سحب ${retryData?.chaptersScraped || 0} فصل (إعادة محاولة)`,
              title: retryData?.title,
            });

            setCompletedItems((prev) => prev + 1);
          } catch {
            // Keep error status
          }
        }

        setProgress(((i + 1) / mangaUrls.length) * 100);

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Update source last_scraped_at
      if (selectedSourceId) {
        await supabase
          .from("scraper_sources")
          .update({ last_scraped_at: new Date().toISOString() })
          .eq("id", selectedSourceId);
      }

      toast({
        title: "اكتمل السحب!",
        description: `تم سحب ${completedItems} من ${totalItems} مانجا`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل سحب الكتالوج",
        variant: "destructive",
      });
      updateLog(catalogUrl, { status: "error", message: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">سحب الكتالوج</h2>
            <p className="text-sm text-muted-foreground">
              اسحب جميع المانجا من موقع محدد
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">اختر المصدر</label>
            <Select value={selectedSourceId} onValueChange={handleSourceChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مصدرًا..." />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">رابط الكتالوج</label>
            <Input
              placeholder="https://lekmanga.net/manga/"
              value={catalogUrl}
              onChange={(e) => setCatalogUrl(e.target.value)}
              dir="ltr"
              disabled={isRunning}
            />
          </div>
        </div>

        <Button
          onClick={handleStartScrape}
          disabled={isRunning || !catalogUrl}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري السحب...
            </>
          ) : (
            <>
              <Play className="ml-2 h-4 w-4" />
              بدء سحب الكتالوج
            </>
          )}
        </Button>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>التقدم</span>
              <span>
                {completedItems} / {totalItems}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">سجل العمليات</h3>
            <ScrollArea className="h-64 rounded-md border bg-background/50 p-2">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs p-2 rounded bg-card/50"
                  >
                    {log.status === "processing" && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary mt-0.5" />
                    )}
                    {log.status === "success" && (
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                    )}
                    {log.status === "error" && (
                      <XCircle className="h-3 w-3 text-destructive mt-0.5" />
                    )}
                    {log.status === "pending" && (
                      <div className="h-3 w-3 rounded-full border-2 border-muted mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-muted-foreground" dir="ltr">
                        {log.title || log.url}
                      </p>
                      {log.message && (
                        <p
                          className={`text-xs ${
                            log.status === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {log.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  );
};
