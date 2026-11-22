"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { DataTable, Primary, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/feedback";
import { DetailList } from "@/components/shared/page";
import { RowMenu, type RowAction } from "@/components/shared/row-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import type LoanType from "@/types/loan";
import type { UserType } from "@/types/user";

// "Ready to close" is derived, not stored: same rule as /api/loan/pending-complete.
const displayStatus = (loan: LoanType) =>
	loan.status === "active" && loan.paidAmount >= loan.totalAmount ? "ready" : loan.status;

function Repayment({ loan }: { loan: LoanType }) {
	const percent = loan.totalAmount > 0 ? Math.max(0, Math.min(100, Math.floor((loan.paidAmount / loan.totalAmount) * 100))) : 0;
	return (
		<div className="min-w-28">
			<div className="flex justify-between gap-2 whitespace-nowrap text-xs tabular-nums">
				<span>{formatMoney(loan.paidAmount)}</span>
				<span className="text-muted-foreground">{percent === 0 && loan.paidAmount > 0 ? "<1" : percent}%</span>
			</div>
			<div
				role="progressbar"
				aria-label={`Loan ${loan.id} repaid`}
				aria-valuenow={percent}
				aria-valuemin={0}
				aria-valuemax={100}
				className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/15"
			>
				<div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
			</div>
			<p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">of {formatMoney(loan.totalAmount)}</p>
		</div>
	);
}

interface LoanTableProps {
	loans: LoanType[] | null | undefined;
	loading?: boolean;
	error?: string | null;
	onRetry?: () => void;
	/** Fewer columns, for the dashboard. */
	compact?: boolean;
	actions?: (loan: LoanType) => RowAction[];
	empty?: ReactNode;
}

export function LoanTable({ loans, loading, error, onRetry, compact, actions, empty }: LoanTableProps) {
	// Loans only carry the customer's NIC, so names come from the customer list.
	const customers = useResource<UserType[]>("/user/customers");
	const names = useMemo(() => new Map(customers.data?.map((c) => [c.nic, c.name])), [customers.data]);
	const [viewing, setViewing] = useState<LoanType | null>(null);

	const customer: Column<LoanType> = {
		header: "Customer",
		cell: (loan) => <Primary title={names.get(loan.customerId) ?? loan.customerId} subtitle={`Loan #${loan.id} · ${loan.customerId}`} />,
	};
	const principal: Column<LoanType> = { header: "Principal", align: "right", cell: (loan) => formatMoney(loan.amount) };
	const status: Column<LoanType> = { header: "Status", cell: (loan) => <StatusBadge status={displayStatus(loan)} /> };
	const issued: Column<LoanType> = { header: "Issued", cell: (loan) => <span className="whitespace-nowrap">{formatDate(loan.issuedDate)}</span> };

	const columns: Column<LoanType>[] = compact
		? [customer, principal, issued, status]
		: [
				customer,
				principal,
				{ header: "Installment", align: "right", cell: (loan) => formatMoney(loan.installmentAmount) },
				{ header: "Repaid", cell: (loan) => <Repayment loan={loan} /> },
				status,
				issued,
			];

	return (
		<>
			<DataTable
				label="Loans"
				wide={!compact}
				columns={columns}
				rows={loans}
				rowKey={(loan) => loan.id}
				loading={loading}
				error={error}
				onRetry={onRetry}
				empty={empty ?? <EmptyState title="No loans yet" description="Loans you issue will appear here." />}
				actions={
					compact
						? undefined
						: (loan) => (
								<RowMenu
									label={`loan ${loan.id}`}
									actions={[{ label: "View details", icon: Eye, onSelect: () => setViewing(loan) }, ...(actions?.(loan) ?? [])]}
								/>
							)
				}
			/>

			<Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
				<DialogContent>
					{viewing && (
						<>
							<DialogHeader>
								<DialogTitle>Loan #{viewing.id}</DialogTitle>
								<DialogDescription>
									{names.get(viewing.customerId) ?? "Customer"} · {viewing.customerId}
								</DialogDescription>
							</DialogHeader>
							<div>
								<StatusBadge status={displayStatus(viewing)} />
							</div>
							<DetailList
								items={[
									["Principal", formatMoney(viewing.amount)],
									["Interest rate", `${viewing.interestRate}% per month`],
									["Interest", formatMoney(viewing.interestAmount)],
									["Total repayable", formatMoney(viewing.totalAmount)],
									["Term", plural(viewing.durationMonths, "month")],
									["Installments", plural(viewing.durationDays, "day")],
									["Per installment", formatMoney(viewing.installmentAmount)],
									["Paid", formatMoney(viewing.paidAmount)],
									["Balance", formatMoney(viewing.totalAmount - viewing.paidAmount)],
									["Issued", formatDate(viewing.issuedDate)],
									["Issued by (NIC)", viewing.issuedBy],
								]}
							/>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
