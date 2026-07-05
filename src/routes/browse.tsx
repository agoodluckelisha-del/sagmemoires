import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, FileText, Download, Filter, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/notify";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Explorer les mémoires — MémoiresAcadémiques" },
      {
        name: "description",
        content:
          "Recherchez et consultez des mémoires académiques par titre, auteur, mot-clé, filière, université et année.",
      },
      { property: "og:title", content: "Explorer les mémoires académiques" },
      {
        property: "og:description",
        content: "Recherche avancée dans une bibliothèque de mémoires universitaires validés.",
      },
    ],
  }),
  component: BrowsePage,
});

interface Thesis {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  faculty: string | null;
  university: string | null;
  year: number | null;
  author_name: string | null;
  is_premium: boolean;
  downloads: number;
  created_at: string;
}

function BrowsePage() {
  const [q, setQ] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [year, setYear] = useState("all");
  const [university, setUniversity] = useState("all");

  const { data: theses = [], isLoading } = useQuery({
    queryKey: ["public-theses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theses")
        .select(
          "id, title, abstract, keywords, faculty, university, year, author_name, is_premium, downloads, created_at",
        )
        .eq("status", "approved")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Thesis[];
    },
  });

  const faculties = useMemo(
    () => [...new Set(theses.map((t) => t.faculty).filter(Boolean))] as string[],
    [theses],
  );
  const years = useMemo(
    () =>
      [...new Set(theses.map((t) => t.year).filter(Boolean))].sort((a, b) => (b as number) - (a as number)) as number[],
    [theses],
  );
  const universities = useMemo(
    () => [...new Set(theses.map((t) => t.university).filter(Boolean))] as string[],
    [theses],
  );

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return theses.filter((t) => {
      const matchesQ =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.abstract.toLowerCase().includes(query) ||
        (t.author_name ?? "").toLowerCase().includes(query) ||
        t.keywords.some((k) => k.toLowerCase().includes(query));
      const matchesF = faculty === "all" || t.faculty === faculty;
      const matchesY = year === "all" || String(t.year) === year;
      const matchesU = university === "all" || t.university === university;
      return matchesQ && matchesF && matchesY && matchesU;
    });
  }, [theses, q, faculty, year, university]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="bg-gradient-hero py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Explorer les mémoires</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/85">
            Recherchez parmi les mémoires validés par titre, auteur, mot-clé ou résumé.
          </p>
          <div className="relative mt-6 max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un mémoire, un auteur, un mot-clé…"
              className="h-12 border-none bg-white pl-12 text-foreground shadow-soft"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtres
          </span>
          <Select value={faculty} onValueChange={setFaculty}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filière" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes filières</SelectItem>
              {faculties.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={university} onValueChange={setUniversity}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Université" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes universités</SelectItem>
              {universities.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes années</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <p className="py-20 text-center text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucun mémoire ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Link key={t.id} to="/thesis/$id" params={{ id: t.id }}>
                <Card className="group flex h-full flex-col border-border/60 p-5 transition-all hover:-translate-y-1 hover:shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                      <FileText className="h-5 w-5" />
                    </span>
                    {t.is_premium && (
                      <Badge className="bg-gradient-primary border-none text-primary-foreground">
                        <Crown className="mr-1 h-3 w-3" /> Premium
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                    {t.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
                    {t.abstract}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {t.keywords.slice(0, 3).map((k) => (
                      <Badge key={k} variant="secondary" className="text-[10px]">
                        {k}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="truncate">{t.author_name || "Anonyme"}</span>
                    <span className="flex items-center gap-3">
                      {t.year && <span>{t.year}</span>}
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {t.downloads}
                      </span>
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
