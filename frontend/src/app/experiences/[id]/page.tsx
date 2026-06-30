import { ExperienceDetail } from "@/components/experiences/experience-detail";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function ExperiencePage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <ExperienceDetail id={params.id} />
      </main>
      <SiteFooter />
    </div>
  );
}
