import { notFound } from "next/navigation";
import { repos } from "@/lib/db";

export default async function StaticPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await repos.staticPagesRepo.findStaticPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div
        className="prose mt-6 max-w-none text-slate-700"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
