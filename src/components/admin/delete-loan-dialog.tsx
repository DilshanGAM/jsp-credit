"use client";

import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { api, errorMessage } from "@/lib/api";
import type LoanType from "@/types/loan";

interface DeleteLoanDialogProps {
	loan: LoanType | null;
	onClose: () => void;
	onDeleted: () => void;
}

export function DeleteLoanDialog({ loan, onClose, onDeleted }: DeleteLoanDialogProps) {
	async function remove() {
		if (!loan) return;
		try {
			await api.delete(`/loan?id=${loan.id}`);
			toast.success("Loan deleted");
			onClose();
			onDeleted();
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't delete the loan."));
		}
	}

	return (
		<ConfirmDialog
			open={!!loan}
			onClose={onClose}
			onConfirm={remove}
			destructive
			title={`Delete loan #${loan?.id ?? ""}?`}
			description="This permanently deletes the loan and all of its payments, and lowers the totals of the visits that collected them. It can't be undone."
			confirmLabel="Delete loan"
			requireText={loan ? String(loan.id) : undefined}
		/>
	);
}
