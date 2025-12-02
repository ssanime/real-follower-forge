import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Globe, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";

interface ScraperSource {
  id: string;
  name: string;
  base_url: string;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

export const SourceManagement = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<ScraperSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<ScraperSource | null>(null);
  const [formData, setFormData] = useState({ name: "", base_url: "" });

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from("scraper_sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل قائمة المصادر",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.base_url) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingSource) {
        const { error } = await supabase
          .from("scraper_sources")
          .update({ name: formData.name, base_url: formData.base_url })
          .eq("id", editingSource.id);

        if (error) throw error;
        toast({ title: "نجح!", description: "تم تحديث المصدر" });
      } else {
        const { error } = await supabase
          .from("scraper_sources")
          .insert({ name: formData.name, base_url: formData.base_url });

        if (error) throw error;
        toast({ title: "نجح!", description: "تم إضافة المصدر" });
      }

      setDialogOpen(false);
      setEditingSource(null);
      setFormData({ name: "", base_url: "" });
      fetchSources();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("scraper_sources")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "نجح!", description: "تم حذف المصدر" });
      setSources(sources.filter((s) => s.id !== deleteId));
      setDeleteId(null);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("scraper_sources")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      
      setSources(sources.map(s => 
        s.id === id ? { ...s, is_active: !currentActive } : s
      ));
      
      toast({
        title: "نجح!",
        description: currentActive ? "تم تعطيل المصدر" : "تم تفعيل المصدر",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    setEditingSource(null);
    setFormData({ name: "", base_url: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (source: ScraperSource) => {
    setEditingSource(source);
    setFormData({ name: source.name, base_url: source.base_url });
    setDialogOpen(true);
  };

  return (
    <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">إدارة المصادر</h2>
          <p className="text-sm text-muted-foreground">
            أضف وأدر مصادر السحب المختلفة
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة مصدر
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">جاري التحميل...</div>
      ) : sources.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Globe className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>لا توجد مصادر مضافة</p>
          <Button onClick={openAddDialog} variant="outline" className="mt-4">
            إضافة أول مصدر
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الرابط</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">آخر سحب</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-medium">{source.name}</TableCell>
                <TableCell>
                  <a
                    href={source.base_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    {source.base_url}
                  </a>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.is_active}
                      onCheckedChange={() => handleToggleActive(source.id, source.is_active)}
                    />
                    <Badge variant={source.is_active ? "default" : "secondary"}>
                      {source.is_active ? "مفعل" : "معطل"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {source.last_scraped_at
                    ? new Date(source.last_scraped_at).toLocaleDateString("ar-EG")
                    : "لم يُسحب بعد"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(source)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(source.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSource ? "تعديل المصدر" : "إضافة مصدر جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>اسم المصدر</Label>
              <Input
                placeholder="مثال: LekManga"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>رابط الموقع</Label>
              <Input
                placeholder="https://lekmanga.net"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit}>
              {editingSource ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المصدر نهائيًا.
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
