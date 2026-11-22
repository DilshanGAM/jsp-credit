// Simple interest. The API stores total and installment as sent and recomputes only the
// interest amount with the same formula, so change both together (src/app/api/loan/route.ts).

export interface LoanTerms {
	amount: string;
	interestRate: string;
	durationMonths: string;
	durationDays: string;
	totalAmount: string;
	installmentAmount: string;
}

const num = (value: string) => parseFloat(value) || 0;
const perDay = (total: number, days: number) => (days ? total / days : 0).toFixed(2);

export const EMPTY_TERMS: LoanTerms = {
	amount: "",
	interestRate: "",
	durationMonths: "",
	durationDays: "",
	totalAmount: "0.00",
	installmentAmount: "0.00",
};

/** After amount, rate or months change. */
export function fromPrincipal(terms: LoanTerms): LoanTerms {
	const amount = num(terms.amount);
	const total = amount + amount * (num(terms.interestRate) / 100) * num(terms.durationMonths);
	return { ...terms, totalAmount: total.toFixed(2), installmentAmount: perDay(total, num(terms.durationDays)) };
}

/** After days change. */
export function fromDays(terms: LoanTerms): LoanTerms {
	return { ...terms, installmentAmount: perDay(num(terms.totalAmount), num(terms.durationDays)) };
}

/** After the total is edited: back-solve the rate to 2 decimals, then recompute from it. */
export function fromTotal(terms: LoanTerms): LoanTerms {
	const amount = num(terms.amount);
	const months = num(terms.durationMonths);
	if (!amount || !months) return fromPrincipal(terms);
	const rate = ((num(terms.totalAmount) - amount) / (amount * months)) * 100;
	return fromPrincipal({ ...terms, interestRate: rate.toFixed(2) });
}

/** After the installment is edited: back-solve whole days, then recompute from them. */
export function fromInstallment(terms: LoanTerms): LoanTerms {
	const installment = num(terms.installmentAmount);
	const days = installment ? Math.round(num(terms.totalAmount) / installment) : 0;
	return fromDays({ ...terms, durationDays: days.toString() });
}
