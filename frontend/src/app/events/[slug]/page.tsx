import { EventDetail } from "@/components/events/event-detail";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function EventDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <EventDetail slug={params.slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
