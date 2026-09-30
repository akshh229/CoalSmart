import { snapshot } from "@/lib/server/store";
import { Dashboard } from "@/components/dashboard";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view } = await params;
  if (
    view &&
    (view.length !== 1 ||
      ![
        "overview",
        "documents",
        "twins",
        "ai",
        "timeline",
        "map",
        "validation",
        "reports",
      ].includes(view[0]))
  )
    notFound();
  return (
    <Dashboard initial={await snapshot()} view={view?.[0] ?? "overview"} />
  );
}
