export default interface LoanType {
    id: number;
    customerId: string;
    amount: number;
    interestRate: number;
    durationDays: number;
    durationMonths: number;
    interestAmount: number;
    totalAmount: number;
    installmentAmount: number;
    paidAmount: number;
    issuedDate: string;
    issuedBy: string;
    status: string;
}