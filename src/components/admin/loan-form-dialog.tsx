"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CustomerPicker } from "@/components/admin/customer-picker";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { EMPTY_TERMS, fromDays, fromInstallment, fromPrincipal, fromTotal, type LoanTerms } from "@/lib/loan-math";

type Key = keyof LoanTerms;
type Errors = Partial<Record<Key | "customerId", string>>;

function validate(customerId: string, t: LoanTerms) {
	const errors: Errors = {};
	if (!customerId) errors.customerId = "Choose a customer.";
	if (!(Number(t.amount) > 0)) errors.amount = "Enter an amount above zero.";
	if (t.interestRate === "" || !(Number(t.interestRate) >= 0)) errors.interestRate = "Enter a rate of zero or more.";
	if (!(Number(t.durationMonths) > 0)) errors.durationMonths = "Enter the term in months.";
	if (!Number.isInteger(Number(t.durationDays)) || !(Number(t.durationDays) > 0)) errors.durationDays = "Enter a whole number of days.";
	return errors;
}

interface LoanFormDialogProps {
	open: boolean;
	initialCustomer: string;
	onClose: () => void;
	onSaved: () => void;
}

export function LoanFormDialog({ open, onClose, ...props }: LoanFormDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>New loan</DialogTitle>
					<DialogDescription>Totals update as you type. Check the summary before issuing.</DialogDescription>
				</DialogHeader>
				{/* Mounted only while open, so each loan starts from a clean form. */}
				{open && <LoanForm onClose={onClose} {...props} />}
			</DialogContent>
		</Dialog>
	);
}

function LoanForm({ initialCustomer, onClose, onSaved }: Omit<LoanFormDialogProps, "open">) {
	const [customerId, setCustomerId] = useState(initialCustomer);
	const [terms, setTerms] = useState<LoanTerms>(EMPTY_TERMS);
	// Total and installment are applied on blur, so typing isn't reformatted under the cursor.
	const [draft, setDraft] = useState<{ key: Key; value: string } | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [saving, setSaving] = useState(false);

	const errors = submitted ? validate(customerId, terms) : {};

	const input = (key: Key, derive: (t: LoanTerms) => LoanTerms) => ({
		type: "number",
		inputMode: "decimal" as const,
		min: 0,
		step: "any",
		value: terms[key],
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTerms(derive({ ...terms, [key]: e.target.value })),
	});

	const derivedInput = (key: Key, derive: (t: LoanTerms) => LoanTerms) => ({
		type: "number",
		inputMode: "decimal" as const,
		min: 0,
		step: "any",
		value: draft?.key === key ? draft.value : terms[key],
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ key, value: e.target.value }),
		onBlur: () => {
			if (draft?.key !== key) return;
			setTerms(derive({ ...terms, [key]: draft.value }));
			setDraft(null);
		},
		onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key !== "Enter") return;
			// apply the edit and show the result, rather than submitting the old value
			e.preventDefault();
			e.currentTarget.blur();
		},
	});

	async function issue(event: React.FormEvent) {
		event.preventDefault();
		setSubmitted(true);
		if (Object.keys(validate(customerId, terms)).length) return;
		setSaving(true);
		try {
			await api.post("/loan", { customerId, ...terms });
			toast.success("Loan issued");
			onSaved();
			onClose();
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't issue the loan."));
			setSaving(false);
		}
	}

	const summary: [string, number][] = [
		["Principal", Number(terms.amount) || 0],
		["Interest", Number(terms.totalAmount) - (Number(terms.amount) || 0)],
		["Total repayable", Number(terms.totalAmount)],
		["Per installment", Number(terms.installmentAmount)],
	];

	return (
		<form noValidate onSubmit={issue} className="space-y-5">
			<Field id="customer" label="Customer" required error={errors.customerId}>
				<CustomerPicker value={customerId} onChange={setCustomerId} />
			</Field>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field id="amount" label="Amount (Rs.)" required error={errors.amount}>
					<Input {...input("amount", fromPrincipal)} />
				</Field>
				<Field id="interestRate" label="Interest rate (% per month)" required error={errors.interestRate}>
					<Input {...input("interestRate", fromPrincipal)} />
				</Field>
				<Field id="durationMonths" label="Term (months)" required error={errors.durationMonths}>
					<Input {...input("durationMonths", fromPrincipal)} />
				</Field>
				<Field id="durationDays" label="Installments (days)" required error={errors.durationDays}>
					<Input {...input("durationDays", fromDays)} />
				</Field>
				<Field id="totalAmount" label="Total repayable (Rs.)" hint="Editing this adjusts the rate to the nearest 0.01%.">
					<Input {...derivedInput("totalAmount", fromTotal)} />
				</Field>
				<Field id="installmentAmount" label="Installment (Rs.)" hint="Editing this adjusts the number of days.">
					<Input {...derivedInput("installmentAmount", fromInstallment)} />
				</Field>
			</div>
			<dl aria-label="Loan summary" className="grid grid-cols-2 gap-3 rounded-lg bg-secondary p-4 text-secondary-foreground sm:grid-cols-4">
				{summary.map(([label, value]) => (
					<div key={label}>
						<dt className="text-xs">{label}</dt>
						<dd className="mt-0.5 break-words text-sm font-semibold tabular-nums">{formatMoney(value)}</dd>
					</div>
				))}
			</dl>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" loading={saving}>
					Issue loan
				</Button>
			</DialogFooter>
		</form>
	);
}
