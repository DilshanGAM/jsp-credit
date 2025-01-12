"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import axios from "axios";
import toast from "react-hot-toast";
import LoanForm from "@/components/LoanForm";
import LoanType from "@/types/loan";

export default function AdminLoansPage() {
    const [loans, setLoans] = useState<LoanType[]>([]);
    const [editingLoan, setEditingLoan] = useState<LoanType | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loansLoaded, setLoansLoaded] = useState(false);

    useEffect(() => {
        const fetchLoans = async () => {
            const token = localStorage.getItem("token");
            axios
                .get("/api/loan/pending-complete", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((res) => {
                    console.log(res);
                    setLoans(res.data);
                    setLoansLoaded(true);
                })
                .catch((err) => {
                    toast.error(err.response.data.message);
                });
        };
        if (!loansLoaded){
            fetchLoans();
        }        
    }, [loansLoaded]);

    const handleSave = async (loanData: LoanType) => {
        const token = localStorage.getItem("token");
        try {
            if (editingLoan) {
                await axios.put(`/api/loan/`, loanData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                toast.success("Loan updated successfully");
            } else {
                const result = await axios.post("/api/loan", loanData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                console.log(result);
                toast.success("Loan added successfully");
            }
            setIsDialogOpen(false);
            setEditingLoan(null);
        } catch (err) {
            toast.error("Failed to save loan");
        }
    };

    const handleLoanCompletion = (loan: LoanType) => {
        if(confirm("Are you sure you want to mark this loan as completed?")){
            const token = localStorage.getItem("token");
            axios
                .put(`/api/loan/pending-complete?id=${loan.id}`, {}, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then(() => {
                    toast.success("Loan marked as completed");
                    setLoansLoaded(false);
                })
                .catch((err) => {
                    toast.error(err.response.data.message);
                });
        }

    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Loan Management</h1>
            <Button
                className="mb-4 bg-blueGreen text-white"
                onClick={() => {
                    setEditingLoan(null);
                    setIsDialogOpen(true);
                }}
            >
                Add Loan
            </Button>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Interest Rate</TableHead>
                        <TableHead>Duration (Months)</TableHead>
                        <TableHead>Duration (Days)</TableHead>
                        <TableHead>Installment Amount</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loans.map((loan) => (
                        <TableRow key={loan.id}>
                            <TableCell>{loan.customerId}</TableCell>
                            <TableCell>{loan.amount}</TableCell>
                            <TableCell>{loan.interestRate+"%"}</TableCell>
                            <TableCell>{loan.durationMonths}</TableCell>
                            <TableCell>{loan.durationDays}</TableCell>
                            <TableCell>{loan.installmentAmount}</TableCell>
                            <TableCell>{loan.amount}</TableCell>
                            <TableCell>{loan.paidAmount}</TableCell>
                            <TableCell>{loan.totalAmount}</TableCell>
                            <TableCell>{loan.status}</TableCell>
                            <TableCell>
                                    <Button onClick={()=>handleLoanCompletion(loan)}>Mark Completed</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingLoan ? "Edit Loan" : "Add Loan"}</DialogTitle>
                    </DialogHeader>
                    <LoanForm
                        initialData={editingLoan}
                        onSave={handleSave}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}