"use client";

import { useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import { DeleteLoanDialog } from "@/components/admin/delete-loan-dialog";
import { PagedLoans } from "@/components/admin/paged-loans";
import { useSession } from "@/components/admin/session-context";
import { EmptyState } from "@/components/shared/feedback";
import { Panel } from "@/components/shared/page";
import type LoanType from "@/types/loan";

export default function CompletedLoansPage() {
	const { isAdmin } = useSession();
	const [version, setVersion] = useState(0);
	const [deleting, setDeleting] = useState<LoanType | null>(null);

	// For anyone else the API returns their own loans in another shape, so don't call it.
	if (!isAdmin) {
		return (
			<Panel>
				<EmptyState icon={Lock} title="Administrators only" description="Ask an administrator for the list of completed loans." />
			</Panel>
		);
	}

	return (
		<>
			<Panel>
				<PagedLoans
					endpoint="/loan/completed"
					version={version}
					actions={(loan) => [{ label: "Delete loan", icon: Trash2, destructive: true, onSelect: () => setDeleting(loan) }]}
					empty={<EmptyState title="No completed loans" description="Loans appear here once an administrator closes them." />}
				/>
			</Panel>
			<DeleteLoanDialog loan={deleting} onClose={() => setDeleting(null)} onDeleted={() => setVersion((v) => v + 1)} />
		</>
	);
}
