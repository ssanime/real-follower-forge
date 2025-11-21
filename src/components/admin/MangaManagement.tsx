import { useState, useEffect } from "react";
import { Pencil, Trash2, RefreshCw, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const MangaManagement = () => {
  const { toast } = useToast();
  const [mangas, setMangas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const fetchMangas = async () => {
    try {
      const { data, error } = await supabase
        .from("manga")
        .select(`
          *,
          manga_genres (
            genres (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMangas(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل قائمة المانجا",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMangas();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("manga")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "نجح!",
        description: "تم حذف المانجا بنجاح",
      });

      setMangas(mangas.filter((m) => m.id !== deleteId));
      setDeleteId(null);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل حذف المانجا",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async (mangaId: string, sourceUrl?: string) => {
    if (!sourceUrl) {
      toast({
        title: "خطأ",
        description: "لا يوجد رابط مصدر لهذه المانجا",
        variant: "destructive",
      });
      return;
    }

    setRefreshingId(mangaId);
    try {
      const { error } = await supabase.functions.invoke('scrape-manga', {
        body: { sourceUrl, updateExisting: true }
      });

      if (error) throw error;

      toast({
        title: "نجح!",
        description: "جاري تحديث الفصول الجديدة",
      });

      await fetchMangas();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل تحديث المانجا",
        variant: "destructive",
      });
    } finally {
      setRefreshingId(null);
    }
  };

  const handleToggleFeatured = async (mangaId: string, currentFeatured: boolean) => {
    try {
      if (!currentFeatured) {
        // Count current featured manga
        const { count } = await supabase
          .from("manga")
          .select("*", { count: "exact", head: true })
          .eq("featured", true);

        if (count && count >= 10) {
          toast({
            title: "تحذير",
            description: "لا يمكن إضافة أكثر من 10 مانجا مميزة",
            variant: "destructive",
          });
          return;
        }

        // Get max order
        const { data: maxOrderData } = await supabase
          .from("manga")
          .select("featured_order")
          .eq("featured", true)
          .order("featured_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        const newOrder = (maxOrderData?.featured_order || 0) + 1;

        const { error } = await supabase
          .from("manga")
          .update({ featured: true, featured_order: newOrder })
          .eq("id", mangaId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("manga")
          .update({ featured: false, featured_order: null })
          .eq("id", mangaId);

        if (error) throw error;
      }

      toast({
        title: "نجح!",
        description: currentFeatured ? "تم إلغاء التمييز" : "تم إضافة المانجا للمميزة",
      });

      await fetchMangas();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل تحديث الحالة",
        variant: "destructive",
      });
    }
  };

  const filteredMangas = mangas.filter((manga) =>
    manga.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
      <div className="mb-6">
        <h2 className="mb-4 text-2xl font-bold text-foreground">إدارة المانجا</h2>
        <Input
          placeholder="ابحث عن مانجا..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">التصنيفات</TableHead>
                <TableHead className="text-right">المشاهدات</TableHead>
                <TableHead className="text-right">مميز</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMangas.map((manga) => (
                <TableRow key={manga.id}>
                  <TableCell className="font-medium">{manga.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{manga.manga_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={manga.status === "ongoing" ? "default" : "outline"}>
                      {manga.status || "غير محدد"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {manga.manga_genres?.slice(0, 3).map((mg: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {mg.genres?.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{manga.total_views || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={manga.featured || false}
                        onCheckedChange={() => handleToggleFeatured(manga.id, manga.featured)}
                      />
                      {manga.featured && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {manga.featured_order}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/manga/${manga.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRefresh(manga.id, manga.source_url)}
                        disabled={refreshingId === manga.id}
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshingId === manga.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(manga.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المانجا وجميع الفصول والصور المرتبطة بها نهائيًا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
