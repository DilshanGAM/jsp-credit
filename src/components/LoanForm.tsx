"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CustomerSearchField } from "./ui/customer-search";

interface LoanFormProps {
	initialData?: any;
	onSave: (data: any) => void;
	onCancel: () => void;
}

const LoanForm: React.FC<LoanFormProps> = ({
	initialData,
	onSave,
	onCancel,
}) => {
	const [formData, setFormData] = useState(
		initialData || {
			customerId: "",
			amount: "",
			interestRate: "",
			durationMonths: "",
			durationDays: "",
			totalAmount: "",
			installmentAmount: "",
			status: "",
		}
	);

	// Function to calculate total amount
	const calculateTotalAmount = (
		amount: number,
		interestRate: number,
		durationMonths: number
	) => {
		return amount + amount * (interestRate / 100) * durationMonths;
	};

	// Function to calculate installment amount
	const calculateInstallmentAmount = (
		totalAmount: number,
		durationDays: number
	) => {
		return durationDays ? totalAmount / durationDays : 0;
	};

	useEffect(() => {
		const amount = parseFloat(formData.amount) || 0;
		const interestRate = parseFloat(formData.interestRate) || 0;
		const durationMonths = parseFloat(formData.durationMonths) || 0;

		const newTotalAmount = calculateTotalAmount(
			amount,
			interestRate,
			durationMonths
		);
		const durationDays = parseFloat(formData.durationDays) || 0;

		setFormData((prev:any) => ({
			...prev,
			totalAmount: newTotalAmount.toFixed(2),
			installmentAmount: calculateInstallmentAmount(
				newTotalAmount,
				durationDays
			).toFixed(2),
		}));
	}, [formData.amount, formData.interestRate, formData.durationMonths]);

	useEffect(() => {
		const totalAmount = parseFloat(formData.totalAmount) || 0;
		const durationDays = parseFloat(formData.durationDays) || 0;

		setFormData((prev:any) => ({
			...prev,
			installmentAmount: calculateInstallmentAmount(
				totalAmount,
				durationDays
			).toFixed(2),
		}));
	}, [formData.durationDays]);

	const handleTotalAmountChange = (newTotalAmount: number) => {
		const amount = parseFloat(formData.amount) || 0;
		const durationMonths = parseFloat(formData.durationMonths) || 0;
		const newInterestRate =
			amount && durationMonths
				? ((newTotalAmount - amount) / (amount * durationMonths)) * 100
				: 0;
		setFormData((prev:any) => ({
			...prev,
			totalAmount: newTotalAmount.toFixed(2),
			interestRate: newInterestRate.toFixed(2),
			installmentAmount: calculateInstallmentAmount(
				newTotalAmount,
				parseFloat(prev.durationDays) || 0
			).toFixed(2),
		}));
	};

	const handleInstallmentAmountChange = (newInstallmentAmount: number) => {
		const newDurationDays = newInstallmentAmount
			? parseFloat(formData.totalAmount) / newInstallmentAmount
			: 0;
		setFormData((prev:any) => ({
			...prev,
			installmentAmount: newInstallmentAmount.toFixed(2),
			durationDays: Math.round(newDurationDays).toString(),
		}));
	};

	const handleSubmit = () => {
        console.log(formData);
		onSave(formData);
	};

	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="customerId">Customer ID</Label>
				<CustomerSearchField
					val={formData.customerId}
					onChange={(e: string) => setFormData({ ...formData, customerId: e })}
				/>
			</div>
			<div>
				<Label htmlFor="amount">Amount</Label>
				<Input
					id="amount"
					type="number"
					value={formData.amount}
					onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
				/>
			</div>
			<div>
				<Label htmlFor="interestRate">Interest Rate (%)</Label>
				<Input
					id="interestRate"
					type="number"
					value={formData.interestRate}
					onChange={(e) =>
						setFormData({ ...formData, interestRate: e.target.value })
					}
				/>
			</div>
			<div>
				<Label htmlFor="durationMonths">Duration (Months)</Label>
				<Input
					id="durationMonths"
					type="number"
					value={formData.durationMonths}
					onChange={(e) =>
						setFormData({ ...formData, durationMonths: e.target.value })
					}
				/>
			</div>
			<div>
				<Label htmlFor="totalAmount">Total Amount</Label>
				<Input
					id="totalAmount"
					type="number"
					value={formData.totalAmount}
					onChange={(e) =>
						handleTotalAmountChange(parseFloat(e.target.value) || 0)
					}
				/>
			</div>
			<div>
				<Label htmlFor="durationDays">Duration (Days)</Label>
				<Input
					id="durationDays"
					type="number"
					value={formData.durationDays}
					onChange={(e) =>
						setFormData({ ...formData, durationDays: e.target.value })
					}
				/>
			</div>
			<div>
				<Label htmlFor="installmentAmount">Installment Amount</Label>
				<Input
					id="installmentAmount"
					type="number"
					value={formData.installmentAmount}
					onChange={(e) =>
						handleInstallmentAmountChange(parseFloat(e.target.value) || 0)
					}
				/>
			</div>
			<div>
				<Label htmlFor="status">Status</Label>
				<select
					id="status"
					value={formData.status}
					onChange={(e) => setFormData({ ...formData, status: e.target.value })}
					className="w-full border border-gray-300 rounded-md px-3 py-2"
				>
					<option value="">Select Status</option>
					<option value="pending">Pending</option>
					<option value="approved">Approved</option>
					<option value="rejected">Rejected</option>
				</select>
			</div>
			<div className="flex justify-end space-x-2">
				<Button className="bg-red-500 text-white" onClick={onCancel}>
					Cancel
				</Button>
				<Button className="bg-blueGreen text-white" onClick={handleSubmit}>
					Save
				</Button>
			</div>
		</div>
	);
};

export default LoanForm;
