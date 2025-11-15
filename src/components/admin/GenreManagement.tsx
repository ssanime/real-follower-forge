import { useState, useEffect } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const PREDEFINED_GENRES = [
  "أكشن", "مغامرة", "كوميديا", "دراما", "فانتازيا", "رعب", "غموض", "رومانسية", "خيال علمي",
  "شريحة من الحياة", "رياضة", "خارق للطبيعة", "إثارة", "مأساة", "حريم", "ميكا", "شونين",
  "شوجو", "سينين", "إيسيكاي", "مدرسة", "سحر", "قتال", "تاريخي", "عسكري", "موسيقى",
  "باروديا", "نفسي", "رومانسية", "ساموراي", "مصاص دماء", "بوليسي", "لعبة", "طبخ",
  "فنون قتالية", "ميكانيكا", "طبي", "تحقيق", "زومبي", "وحوش", "شياطين", "ملائكة",
  "ألعاب فيديو", "افتراضي", "سايبربانك", "رومانسية تاريخية", "عائلة", "حيوانات",
  "فضاء", "قراصنة", "نينجا", "ساحرات", "تنانين", "كونغ فو", "سوبر باور", "مصير",
  "انتقام", "صداقة", "حب", "خيانة", "مؤامرة", "حرب", "سلام", "بقاء", "رحلة زمنية",
  "عوالم متوازية", "تناسخ", "ذكريات", "فقدان الذاكرة", "قوى خارقة", "طبيعة", "بيئة",
  "فضائيون", "روبوتات", "ذكاء اصطناعي", "هاكرز", "جريمة منظمة", "عصابات", "مافيا",
  "شرطة", "محققون", "محامون", "قضاة", "سياسة", "اقتصاد", "أعمال", "رياضيون محترفون",
  "فنانون", "موسيقيون", "راقصون", "ممثلون", "مخرجون", "كتاب", "شعراء", "رسامون",
  "نحاتون", "مصورون", "طهاة", "باريستا", "مزارعون", "صيادون", "بنائون", "مهندسون",
  "علماء", "باحثون", "معلمون", "طلاب", "أطفال", "مراهقون", "بالغون", "كبار السن",
  "عائلات", "أصدقاء", "أحباء", "أعداء", "منافسون", "شركاء"
];

export const GenreManagement = () => {
  const { toast } = useToast();
  const [genres, setGenres] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchGenres = async () => {
    try {
      const { data, error } = await supabase
        .from("genres")
        .select("*")
        .order("name");

      if (error) throw error;
      setGenres(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل التصنيفات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const handleAddGenre = async () => {
    if (!newGenreName.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال اسم التصنيف",
        variant: "destructive",
      });
      return;
    }

    try {
      const slug = newGenreName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-\u0600-\u06FF]+/g, "");

      const { error } = await supabase
        .from("genres")
        .insert({ name: newGenreName.trim(), slug });

      if (error) throw error;

      toast({
        title: "نجح!",
        description: "تمت إضافة التصنيف بنجاح",
      });

      setNewGenreName("");
      setShowAddDialog(false);
      fetchGenres();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشلت إضافة التصنيف",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGenre = async (id: string) => {
    try {
      const { error } = await supabase.from("genres").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "نجح!",
        description: "تم حذف التصنيف بنجاح",
      });

      setGenres(genres.filter((g) => g.id !== id));
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل حذف التصنيف",
        variant: "destructive",
      });
    }
  };

  const handleAddPredefinedGenre = async (genreName: string) => {
    const slug = genreName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-\u0600-\u06FF]+/g, "");

    const exists = genres.some((g) => g.slug === slug);
    if (exists) {
      toast({
        title: "تنبيه",
        description: "هذا التصنيف موجود بالفعل",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("genres")
        .insert({ name: genreName, slug });

      if (error) throw error;

      toast({
        title: "نجح!",
        description: `تمت إضافة ${genreName}`,
      });

      fetchGenres();
    } catch (error: any) {
      console.error("Error adding genre:", error);
    }
  };

  const filteredGenres = genres.filter((genre) =>
    genre.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPredefined = PREDEFINED_GENRES.filter(
    (genre) =>
      genre.includes(searchQuery) &&
      !genres.some(
        (g) =>
          g.slug ===
          genre
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w\-\u0600-\u06FF]+/g, "")
      )
  );

  return (
    <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">إدارة التصنيفات</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة تصنيف جديد
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن تصنيف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">جاري التحميل...</div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              التصنيفات الحالية ({filteredGenres.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {filteredGenres.map((genre) => (
                <Badge
                  key={genre.id}
                  variant="secondary"
                  className="group relative pr-8"
                >
                  {genre.name}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute left-0 top-0 h-full px-2 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleDeleteGenre(genre.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          {filteredPredefined.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold text-foreground">
                تصنيفات مقترحة ({filteredPredefined.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {filteredPredefined.slice(0, 50).map((genre, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                    onClick={() => handleAddPredefinedGenre(genre)}
                  >
                    {genre} +
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة تصنيف جديد</DialogTitle>
            <DialogDescription>
              أدخل اسم التصنيف الجديد. سيتم استخدامه في جميع أنحاء الموقع.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="genre-name">اسم التصنيف</Label>
              <Input
                id="genre-name"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                placeholder="مثال: أكشن، رومانسية، كوميديا"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddGenre}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
