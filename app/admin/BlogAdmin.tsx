"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Quote,
  Star,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  type BlogLocale,
  type BlogPost,
  type BlogStatus,
  deleteBlogPost,
  listBlogPosts,
  saveBlogPost,
  setBlogPostStatus,
} from "@/actions/blog";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return dateFormatter.format(new Date(ms));
}

type EditorForm = {
  id?: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  locale: BlogLocale;
  coverImageUrl: string;
  excerpt: string;
  featured: boolean;
  content: string;
};

const EMPTY_FORM: EditorForm = {
  title: "",
  slug: "",
  category: "",
  author: "",
  locale: "tr",
  coverImageUrl: "",
  excerpt: "",
  featured: false,
  content: "",
};

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback(
    (command: string, arg?: string) => {
      const node = ref.current;
      if (!node) return;
      node.focus();
      document.execCommand(command, false, arg);
      onChange(node.innerHTML);
    },
    [onChange],
  );

  const insertLink = useCallback(() => {
    const url = window.prompt("Bağlantı adresi (https://...)");
    if (url) exec("createLink", url);
  }, [exec]);

  const toolBtn =
    "flex size-7 items-center justify-center rounded-md text-brand-dark/70 transition hover:bg-brand-dark/5";

  return (
    <div className="overflow-hidden rounded-lg border border-brand-dark/15 bg-bg-light">
      <div className="flex flex-wrap items-center gap-1 border-b border-brand-dark/10 bg-bg-offwhite px-2 py-1.5">
        <button
          type="button"
          onClick={() => exec("formatBlock", "h2")}
          className="rounded-md px-2 py-1 text-xs font-bold text-brand-dark/70 transition hover:bg-brand-dark/5"
          title="Başlık 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "h3")}
          className="rounded-md px-2 py-1 text-xs font-bold text-brand-dark/70 transition hover:bg-brand-dark/5"
          title="Başlık 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "p")}
          className="rounded-md px-2 py-1 text-xs font-semibold text-brand-dark/70 transition hover:bg-brand-dark/5"
          title="Paragraf"
        >
          P
        </button>
        <span className="mx-1 h-5 w-px bg-brand-dark/10" />
        <button type="button" onClick={() => exec("bold")} className={toolBtn} title="Kalın">
          <Bold className="size-4" />
        </button>
        <button type="button" onClick={() => exec("italic")} className={toolBtn} title="İtalik">
          <Italic className="size-4" />
        </button>
        <button type="button" onClick={() => exec("underline")} className={toolBtn} title="Altı çizili">
          <UnderlineIcon className="size-4" />
        </button>
        <button type="button" onClick={() => exec("insertUnorderedList")} className={toolBtn} title="Madde listesi">
          <List className="size-4" />
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={toolBtn} title="Numaralı liste">
          <ListOrdered className="size-4" />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "blockquote")} className={toolBtn} title="Alıntı">
          <Quote className="size-4" />
        </button>
        <button type="button" onClick={insertLink} className={toolBtn} title="Bağlantı">
          <Link2 className="size-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="prose-editor min-h-[280px] px-4 py-3 text-sm leading-relaxed text-brand-dark outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-brand-neon [&_blockquote]:pl-3 [&_blockquote]:text-brand-dark/70 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold [&_a]:text-brand-dark [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: BlogStatus }) {
  return status === "published" ? (
    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
      Yayında
    </span>
  ) : (
    <span className="rounded-full bg-brand-dark/10 px-2 py-1 text-xs font-semibold text-brand-dark/60">
      Taslak
    </span>
  );
}

export function BlogAdmin() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "editor">("list");
  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listBlogPosts();
      setPosts(data);
      setErrorCode(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("FIREBASE_ADMIN_NOT_CONFIGURED")) {
        setErrorCode("FIREBASE_ADMIN_NOT_CONFIGURED");
      } else if (message.includes("UNAUTHORIZED")) {
        router.replace("/admin/login");
      } else {
        setErrorCode("UNKNOWN");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setMode("editor");
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      author: post.author,
      locale: post.locale,
      coverImageUrl: post.coverImageUrl,
      excerpt: post.excerpt,
      featured: post.featured,
      content: post.content,
    });
    setMode("editor");
  };

  const handleSave = async (status: BlogStatus) => {
    if (!form.title.trim()) {
      toast.error("Başlık zorunlu.");
      return;
    }
    setIsSaving(true);
    try {
      await saveBlogPost({
        id: form.id,
        title: form.title,
        slug: form.slug,
        category: form.category,
        author: form.author,
        locale: form.locale,
        coverImageUrl: form.coverImageUrl,
        excerpt: form.excerpt,
        featured: form.featured,
        content: form.content,
        status,
      });
      toast.success(status === "published" ? "Yazı yayınlandı." : "Taslak kaydedildi.");
      setMode("list");
      setIsLoading(true);
      await load();
    } catch {
      toast.error("Kaydedilemedi. Tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const next: BlogStatus = post.status === "published" ? "draft" : "published";
    try {
      await setBlogPostStatus(post.id, next);
      toast.success(next === "published" ? "Yayınlandı." : "Taslağa alındı.");
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: next } : p)),
      );
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteBlogPost(deleteTarget.id);
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("Yazı silindi.");
      setDeleteTarget(null);
    } catch {
      toast.error("Silinemedi.");
    } finally {
      setDeletingId(null);
    }
  };

  if (errorCode === "FIREBASE_ADMIN_NOT_CONFIGURED") {
    return (
      <div className="rounded-2xl border border-brand-dark/10 bg-bg-light px-6 py-16 text-center">
        <p className="text-base font-semibold text-brand-dark">
          Firebase Admin yapılandırması eksik
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-brand-dark/60">
          Blog yazılarını yönetmek için <code>.env.local</code> içinde Firebase
          Admin değerlerini tanımlayıp sunucuyu yeniden başlatın.
        </p>
      </div>
    );
  }

  if (mode === "editor") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark/70 transition hover:text-brand-dark"
          >
            <ArrowLeft className="size-4" />
            Yazılara dön
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={isSaving}
              className="inline-flex h-10 items-center rounded-lg border border-brand-dark/15 bg-bg-light px-4 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
            >
              Taslak Kaydet
            </button>
            <button
              type="button"
              onClick={() => handleSave("published")}
              disabled={isSaving}
              className="inline-flex h-10 items-center rounded-lg bg-brand-dark px-4 text-sm font-semibold text-white transition hover:bg-brand-dark/90 disabled:opacity-50"
            >
              {isSaving ? "Kaydediliyor..." : "Yayınla"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
              Başlık
            </span>
            <input
              type="text"
              name="blog-title"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-10 w-full rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
              URL Adı (slug — boş bırakılırsa başlıktan üretilir)
            </span>
            <input
              type="text"
              name="blog-slug"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="ornek-yazi-basligi"
              className="h-10 w-full rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm text-brand-dark outline-none transition placeholder:text-brand-dark/30 focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
              Kategori
            </span>
            <input
              type="text"
              name="blog-category"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="h-10 w-full rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
              Yazar
            </span>
            <input
              type="text"
              name="blog-author"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className="h-10 w-full rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
              Dil
            </span>
            <select
              name="blog-locale"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={form.locale}
              onChange={(e) =>
                setForm((f) => ({ ...f, locale: e.target.value as BlogLocale }))
              }
              className="h-10 w-full rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
            >
              <option value="tr">Türkçe (TR)</option>
              <option value="en">İngilizce (EN)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
              Kapak Resmi (URL)
            </span>
            <input
              type="text"
              name="blog-cover"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={form.coverImageUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, coverImageUrl: e.target.value }))
              }
              placeholder="https://... veya /screenshots/..."
              className="h-10 w-full rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm text-brand-dark outline-none transition placeholder:text-brand-dark/30 focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
            Kısa Açıklama (maks. 300 karakter)
          </span>
          <textarea
            name="blog-excerpt"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            value={form.excerpt}
            maxLength={300}
            rows={2}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            className="w-full resize-y rounded-lg border border-brand-dark/15 bg-bg-light px-3 py-2 text-sm text-brand-dark outline-none transition focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
          />
        </label>

        <label className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, featured: !f.featured }))}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              form.featured ? "bg-brand-neon" : "bg-brand-dark/15"
            }`}
            aria-pressed={form.featured}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
                form.featured ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark">
            <Star className="size-4" />
            Öne çıkar
          </span>
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
            İçerik
          </span>
          <RichTextEditor
            value={form.content}
            onChange={(html) => setForm((f) => ({ ...f, content: html }))}
          />
        </div>

        {form.coverImageUrl ? (
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-dark/50">
              Kapak Önizleme
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.coverImageUrl}
              alt="Kapak önizleme"
              className="max-h-48 rounded-lg border border-brand-dark/10 object-cover"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Blog</h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            Toplam {posts.length} yazı
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-dark px-4 text-sm font-semibold text-white transition hover:bg-brand-dark/90"
        >
          <Plus className="size-4" />
          Yeni Yazı
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-bg-light shadow-sm">
        {isLoading ? (
          <div className="px-6 py-16 text-center text-sm text-brand-dark/50">
            Yükleniyor...
          </div>
        ) : errorCode === "UNKNOWN" ? (
          <div className="px-6 py-16 text-center text-sm text-brand-dark/50">
            Yazılar yüklenemedi. Lütfen tekrar deneyin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-dark/10 text-xs uppercase tracking-wider text-brand-dark/50">
                  <th className="w-[38%] px-4 py-3 font-semibold">Başlık</th>
                  <th className="px-4 py-3 font-semibold">Dil</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3 font-semibold">Güncelleme</th>
                  <th className="px-4 py-3 text-right font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-14 text-center text-sm text-brand-dark/50"
                    >
                      Henüz yazı yok. &quot;Yeni Yazı&quot; ile başlayın.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-brand-dark/5 last:border-0 hover:bg-brand-dark/2"
                    >
                      <td className="w-[48%] px-4 py-3 font-medium text-brand-dark">
                        <button
                          type="button"
                          onClick={() => openEdit(post)}
                          className="inline-flex max-w-full items-start gap-2 text-left transition hover:text-brand-dark/70"
                        >
                          {post.featured && (
                            <Star className="mt-0.5 size-3.5 shrink-0 text-brand-neon" />
                          )}
                          <span className="line-clamp-2 wrap-break-word">
                            {post.title || "(başlıksız)"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-brand-dark/70">
                        <span className="rounded-full border border-brand-dark/10 px-2 py-1 text-xs font-semibold">
                          {post.locale.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-dark/70">
                        {post.category || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-4 py-3 text-brand-dark/70">
                        {formatDate(post.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(post)}
                            className="rounded-lg border border-brand-dark/15 px-3 py-1.5 text-xs font-medium text-brand-dark transition hover:bg-brand-dark/5"
                          >
                            {post.status === "published" ? "Taslağa Al" : "Yayınla"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(post)}
                            className="rounded-lg border border-brand-dark/15 px-3 py-1.5 text-xs font-medium text-brand-dark transition hover:bg-brand-dark/5"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(post)}
                            disabled={deletingId === post.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                            {deletingId === post.id ? "..." : "Sil"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/35 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-brand-dark">Yazı silinsin mi?</h2>
                <p className="mt-1 text-sm text-brand-dark/65">
                  <span className="font-medium text-brand-dark">{deleteTarget.title || "Bu yazı"}</span> kalıcı olarak silinecek.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-dark/15 px-4 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={Boolean(deletingId)}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
