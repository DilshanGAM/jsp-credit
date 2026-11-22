"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { CustomerPicker } from "@/components/admin/customer-picker";
import { LoanFormDialog } from "@/components/admin/loan-form-dialog";
import { LoanTable } from "@/components/admin/loan-table";
import { DeleteLoanDialog } from "@/components/admin/delete-loan-dialog";
import { PagedLoans } from "@/components/admin/paged-loans";
import { useSession } from "@/components/admin/session-context";
import { EmptyState, LoadingState } from "@/components/shared/feedback";
import { Panel, Toolbar } from "@/components/shared/page";
import type { RowAction } from "@/components/shared/row-menu";
import { Button } from "@/components/ui/button";
import { useResource } from "@/lib/use-resource";
import type LoanType from "@/types/loan";

function CustomerLoans({ nic, version, actions }: { nic: string; version: number; actions?: (loan: LoanType) => RowAction[] }) {
	const { data, error, loading, reload } = useResource<LoanType[]>(`/loan/ongoing?nic=${encodeURIComponent(nic)}`);
	useEffect(() => {
		if (version) reload();
	}, [version, reload]);
	return (
		<LoanTable
			loans={data}
			loading={loading}
			error={error}
			onRetry={reload}
			actions={actions}
			empty={<EmptyState title="No active loans" description="This customer has no active loans." />}
		/>
	);
}

// The URL holds the state, so other pages can link straight to a customer or to the form:
// ?customer=<nic> filters, ?new=1 opens the form.
function Loans() {
	const router = useRouter();
	const params = useSearchParams();
	const { isAdmin } = useSession();
	const [version, setVersion] = useState(0);
	const [deleting, setDeleting] = useState<LoanType | null>(null);

	const customer = params.get("customer") ?? "";
	const creating = params.get("new") === "1";
	const show = (nic: string) => router.replace(nic ? `/admin/loans?customer=${encodeURIComponent(nic)}` : "/admin/loans", { scroll: false });

	const actions = isAdmin
		? (loan: LoanType): RowAction[] => [{ label: "Delete loan", icon: Trash2, destructive: true, onSelect: () => setDeleting(loan) }]
		: undefined;

	return (
		<>
			<Panel>
				<Toolbar>
					<div className="w-full sm:w-80">
						<CustomerPicker aria-label="Find a customer's active loans" placeholder="Find a customer's active loans" value={customer} onChange={show} />
					</div>
					{customer && (
						<Button variant="ghost" onClick={() => show("")}>
							<X aria-hidden />
							Show all loans
						</Button>
					)}
				</Toolbar>
				{customer ? (
					<CustomerLoans key={customer} nic={customer} version={version} actions={actions} />
				) : (
					<PagedLoans endpoint="/loan" version={version} actions={actions} />
				)}
			</Panel>

			<LoanFormDialog open={creating} initialCustomer={customer} onClose={() => show(customer)} onSaved={() => setVersion((v) => v + 1)} />
			<DeleteLoanDialog loan={deleting} onClose={() => setDeleting(null)} onDeleted={() => setVersion((v) => v + 1)} />
		</>
	);
}

export default function LoansPage() {
	return (
		<Suspense fallback={<LoadingState />}>
			<Loans />
		</Suspense>
	);
}
