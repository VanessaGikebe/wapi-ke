"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchBusinessApplications,
  fetchBusinessClaims,
  reviewBusinessApplication,
  reviewBusinessClaim,
  type BusinessApplication,
  type BusinessClaim,
} from "@/lib/api/portals";

export function AdminReviewBoard() {
  const [applications, setApplications] = React.useState<BusinessApplication[]>([]);
  const [claims, setClaims] = React.useState<BusinessClaim[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextApplications, nextClaims] = await Promise.all([
        fetchBusinessApplications(),
        fetchBusinessClaims(),
      ]);
      setApplications(nextApplications);
      setClaims(nextClaims);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const decideApplication = async (id: string, action: "approve" | "reject" | "request_more_info") => {
    await reviewBusinessApplication(id, action);
    await load();
  };

  const decideClaim = async (id: string, action: "approve" | "reject" | "request_more_info") => {
    await reviewBusinessClaim(id, action);
    await load();
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {error && <p className="rounded-lg bg-error-container px-4 py-3 text-on-error-container lg:col-span-2">{error}</p>}
      <ReviewSection title="Business Applications" loading={loading}>
        {applications.map((item) => (
          <ApplicationCard key={item.id} item={item} onDecide={decideApplication} />
        ))}
        {!loading && applications.length === 0 && <Empty />}
      </ReviewSection>
      <ReviewSection title="Business Claims" loading={loading}>
        {claims.map((item) => (
          <ClaimCard key={item.id} item={item} onDecide={decideClaim} />
        ))}
        {!loading && claims.length === 0 && <Empty />}
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">{title}</h2>
      <div className="grid gap-4">
        {loading ? <Card className="h-32 animate-pulse p-6" /> : children}
      </div>
    </section>
  );
}

function ApplicationCard({ item, onDecide }: { item: BusinessApplication; onDecide: (id: string, action: "approve" | "reject" | "request_more_info") => Promise<void> }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-primary">{item.business_name}</h3>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{item.category} · {item.county}</p>
          <p className="mt-1 font-caption text-caption text-on-surface-variant">{item.owner_name} · {item.owner_email}</p>
        </div>
        <Badge variant="subtle">{item.status.replace(/_/g, " ")}</Badge>
      </div>
      <Actions disabled={item.status === "approved"} onClick={(action) => onDecide(item.id, action)} />
    </Card>
  );
}

function ClaimCard({ item, onDecide }: { item: BusinessClaim; onDecide: (id: string, action: "approve" | "reject" | "request_more_info") => Promise<void> }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-primary">{item.claimant_name}</h3>
          <p className="mt-1 font-caption text-caption text-on-surface-variant">{item.claimant_email}</p>
          {item.message && <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{item.message}</p>}
        </div>
        <Badge variant="subtle">{item.status.replace(/_/g, " ")}</Badge>
      </div>
      <Actions disabled={item.status === "approved"} onClick={(action) => onDecide(item.id, action)} />
    </Card>
  );
}

function Actions({ disabled, onClick }: { disabled: boolean; onClick: (action: "approve" | "reject" | "request_more_info") => void }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Button size="sm" disabled={disabled} onClick={() => onClick("approve")}>Approve</Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onClick("request_more_info")}>More info</Button>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onClick("reject")}>Reject</Button>
    </div>
  );
}

function Empty() {
  return (
    <Card className="p-6">
      <p className="font-body-md text-body-md text-on-surface-variant">Nothing pending.</p>
    </Card>
  );
}
