"use client";

import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { DataTable, Primary } from "@/components/shared/data-table";
import { ErrorState, LoadingState, Skeleton } from "@/components/shared/feedback";
import { Field } from "@/components/shared/field";
import { DetailList } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, plural } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import type { PaymentType } from "@/types/payment";
import type { UserType } from "@/types/user";
import type { VisitType } from "@/types/visit";

interface VisitDetail {
	visit: VisitType;
	collector: UserType | null;
	manager: UserType | null;
	payments: PaymentType[];
	total: number;
}

/** The list endpoints have no names or totals, so each visit on screen needs its own request. */
function useVisitDetails(visits: VisitType[] | null | undefined) {
	const [details, setDetails] = useState<Record<number, VisitDetail | "failed">>({});
	useEffect(() => {
		let stale = false;
		visits?.forEach(({ id }) => {
			const store = (value: VisitDetail | "failed") => !stale && setDetails((all) => ({ ...all, [id]: value }));
			api
				.get<VisitDetail>(`/visit/extended?visitId=${id}`)
				.then((response) => store(response.data))
				.catch(() => store("failed"));
		});
		return () => {
			stale = true;
		};
	}, [visits]);
	return details;
}

interface VisitTableProps {
	visits: VisitType[] | null | undefined;
	loading: boolean;
	error: string | null;
	reload: () => void;
	empty: ReactNode;
}

export function VisitTable({ visits, loading, error, reload, empty }: VisitTableProps) {
	const details = useVisitDetails(visits);
	const [openId, setOpenId] = useState<number | null>(null);

	const withDetail = (id: number, render: (detail: VisitDetail) => ReactNode) => {
		const detail = details[id];
		if (!detail) return <Skeleton className="h-5 w-20" />;
		return detail === "failed" ? <span className="text-muted-foreground">Unavailable</span> : render(detail);
	};

	return (
		<>
			<DataTable
				label="Collection visits"
				rows={visits}
				rowKey={(visit) => visit.id}
				loading={loading}
				error={error}
				onRetry={reload}
				empty={empty}
				columns={[
					{
						header: "Collector",
						cell: (visit) => (
							<Primary title={withDetail(visit.id, (d) => d.collector?.name ?? visit.collectorId)} subtitle={`Visit #${visit.id}`} />
						),
					},
					{ header: "Started", cell: (visit) => formatDateTime(visit.startDateTime) },
					{ header: "Payments", align: "right", cell: (visit) => withDetail(visit.id, (d) => d.payments.length) },
					{ header: "Collected", align: "right", cell: (visit) => withDetail(visit.id, (d) => formatMoney(d.total)) },
					{ header: "Status", cell: (visit) => <StatusBadge status={visit.status} /> },
				]}
				actions={(visit) => (
					<Button size="sm" variant={visit.status === "started" ? "default" : "outline"} onClick={() => setOpenId(visit.id)}>
						{visit.status === "started" ? "Review" : "View"}
					</Button>
				)}
			/>

			<Dialog open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Visit #{openId}</DialogTitle>
						<DialogDescription>Payments recorded by the collector during this visit.</DialogDescription>
					</DialogHeader>
					{openId !== null && (
						<VisitReview
							id={openId}
							onVerified={() => {
								setOpenId(null);
								reload();
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function VisitReview({ id, onVerified }: { id: number; onVerified: () => void }) {
	// Always fetched fresh: the collector may have taken payments since the list loaded.
	const { data, error, loading, reload } = useResource<VisitDetail>(`/visit/extended?visitId=${id}`);
	const [confirming, setConfirming] = useState(false);
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);

	if (error) return <ErrorState message={error} onRetry={reload} />;
	if (!data) return <LoadingState />;
	const { visit, collector, manager, payments, total } = data;

	async function verify(event: React.FormEvent) {
		event.preventDefault();
		setSaving(true);
		try {
			await api.put("/visit/verify", { id, notes });
			toast.success("Visit verified");
			onVerified();
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't verify the visit."));
			setSaving(false);
		}
	}

	if (confirming) {
		return (
			<form onSubmit={verify} className="space-y-5">
				<div className="rounded-lg bg-secondary p-5 text-center text-secondary-foreground">
					<p className="text-sm">Cash to receive from {collector?.name ?? visit.collectorId}</p>
					<p className="mt-1 text-3xl font-semibold">{loading ? "Updating…" : formatMoney(total)}</p>
					<p className="mt-1 text-sm">{plural(payments.length, "payment")}</p>
				</div>
				<Field id="visit-notes" label="Note (optional)">
					<Input value={notes} onChange={(e) => setNotes(e.target.value)} />
				</Field>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={saving}>
						Back
					</Button>
					<Button type="submit" loading={saving} disabled={loading || saving}>
						Confirm cash received
					</Button>
				</DialogFooter>
			</form>
		);
	}

	return (
		<div className="min-w-0 space-y-5">
			<DetailList
				items={[
					["Collector", collector?.name ?? visit.collectorId],
					["Status", <StatusBadge key="status" status={visit.status} />],
					["Started", formatDateTime(visit.startDateTime)],
					["Verified by", manager?.name ?? "Not verified yet"],
					["Total collected", formatMoney(total)],
					["Notes", visit.notes || "None"],
				]}
			/>
			<div className="max-h-72 overflow-y-auto rounded-md border" tabIndex={0} role="region" aria-label="Payments">
				{payments.length === 0 ? (
					<p className="p-4 text-center text-sm text-muted-foreground">No payments recorded.</p>
				) : (
					<ul className="divide-y text-sm">
						{payments.map((payment) => (
							<li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
								<span>
									<span className="block font-medium">
										Receipt #{payment.id} · Loan #{payment.loanId}
									</span>
									<span className="block text-xs text-muted-foreground">{formatDateTime(payment.paidDate)}</span>
								</span>
								<span className="whitespace-nowrap font-medium tabular-nums">{formatMoney(payment.amount)}</span>
							</li>
						))}
					</ul>
				)}
			</div>
			{visit.status === "started" && (
				<DialogFooter>
					<Button
						onClick={() => {
							reload();
							setConfirming(true);
						}}
					>
						Verify and end visit
					</Button>
				</DialogFooter>
			)}
		</div>
	);
}
