"use client";

import { useState } from "react";
import { CircleCheck, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "@/components/admin/session-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, Primary } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/feedback";
import { Panel } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import type LoanType from "@/types/loan";
import type { UserType } from "@/types/user";

export default function ReadyToClosePage() {
	const { isAdmin } = useSession();
	const { data, error, loading, reload } = useResource<LoanType[]>(isAdmin ? "/loan/pending-complete" : null);
	const customers = useResource<UserType[]>(isAdmin ? "/user/customers" : null);
	const [closing, setClosing] = useState<LoanType | null>(null);

	if (!isAdmin) {
		return (
			<Panel>
				<EmptyState icon={Lock} title="Administrators only" description="Only administrators can close loans." />
			</Panel>
		);
	}

	const nameOf = (nic: string) => customers.data?.find((c) => c.nic === nic)?.name ?? nic;

	async function complete() {
		if (!closing) return;
		try {
			await api.put(`/loan/pending-complete?id=${closing.id}`, {});
			toast.success("Loan completed");
			setClosing(null);
			reload();
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't complete the loan."));
		}
	}

	return (
		<>
			<Panel>
				<DataTable
					label="Loans ready to close"
					rows={data}
					rowKey={(loan) => loan.id}
					loading={loading}
					error={error}
					onRetry={reload}
					columns={[
						{ header: "Customer", cell: (loan) => <Primary title={nameOf(loan.customerId)} subtitle={`Loan #${loan.id} · ${loan.customerId}`} /> },
						{ header: "Total repayable", align: "right", cell: (loan) => formatMoney(loan.totalAmount) },
						{ header: "Paid", align: "right", cell: (loan) => formatMoney(loan.paidAmount) },
						{ header: "Issued", cell: (loan) => formatDate(loan.issuedDate) },
					]}
					actions={(loan) => (
						<Button size="sm" onClick={() => setClosing(loan)}>
							<CircleCheck aria-hidden />
							Complete
						</Button>
					)}
					empty={<EmptyState icon={CircleCheck} title="Nothing to close" description="Fully paid loans appear here for your approval." />}
				/>
			</Panel>
			<ConfirmDialog
				open={!!closing}
				onClose={() => setClosing(null)}
				onConfirm={complete}
				title={`Complete loan #${closing?.id ?? ""}?`}
				description={
					closing && `${nameOf(closing.customerId)} has paid ${formatMoney(closing.paidAmount)} of ${formatMoney(closing.totalAmount)}.`
				}
				confirmLabel="Mark completed"
			/>
		</>
	);
}
