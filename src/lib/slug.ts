export const generateMangaSlug = (title: string): string => {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const generateChapterSlug = (chapterNumber: number | string): string => {
  const num = typeof chapterNumber === "string" ? chapterNumber.trim() : String(chapterNumber);
  return num.replace(/[^0-9.]+/g, "");
};
