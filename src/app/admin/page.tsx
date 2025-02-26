"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, set } from "date-fns";
import { Loader2 } from "lucide-react";
import axios, { all } from "axios";

export default function LoanSummaryDashboard() {
	const [loading, setLoading] = useState(false);
	const [summary, setSummary] = useState<any>(null);
	//get date before 30 days
	const dateBefore30Days = new Date();
	dateBefore30Days.setDate(dateBefore30Days.getDate() - 30);
	const [startDate, setStartDate] = useState(dateBefore30Days);
	const [endDate, setEndDate] = useState(new Date());
	const [allTime, setAllTime] = useState(false);

	const fetchSummary = async () => {
		setLoading(true);
		const token = localStorage.getItem("token");

		try {
			const response = await axios.get(
				`/api/summary?startDate=${format(
					startDate,
					"yyyy-MM-dd"
				)}&endDate=${format(endDate, "yyyy-MM-dd")}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			setSummary(response.data.summary);
		} catch (error) {
			console.error("Error fetching loan summary:", error);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchSummary();
	}, []);

	return (
		<div className="container mx-auto p-6">
			<h1 className="text-2xl font-bold mb-4">Loan Summary Dashboard</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Start Date</CardTitle>
					</CardHeader>
					<CardContent>
						<input
							type="date"
							value={format(startDate, "yyyy-MM-dd")}
							onChange={(e) => {
								setStartDate(new Date(e.target.value));
							}}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>End Date</CardTitle>
					</CardHeader>
					<CardContent>
						<input
							type="date"
							value={format(endDate, "yyyy-MM-dd")}
							onChange={(e) => {
								setEndDate(new Date(e.target.value));
							}}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Fetch Summary</CardTitle>
					</CardHeader>
					<CardContent className="flex justify-between items-center">
						<Button onClick={fetchSummary} disabled={loading}>
							{loading ? <Loader2 className="animate-spin" /> : "Get Summary"}
						</Button>
						{/* get all time button */}
						<Button
							onClick={() => {
								if (allTime) {
									setStartDate(dateBefore30Days);
									setEndDate(new Date());
									setAllTime(false);
								} else {
									setStartDate(new Date(0));
									setEndDate(new Date());
									setAllTime(true);
								}
							}}
							disabled={loading}
						>
							{loading ? (
								<Loader2 className="animate-spin" />
							) : allTime ? (
								"Last Month"
							) : (
								"All Time"
							)}
						</Button>
					</CardContent>
				</Card>
			</div>
			<div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{loading ? (
					<div className="flex justify-center items-center h-40">
						<Loader2 className="w-12 h-12 animate-spin" />
					</div>
				) : summary ? (
					<>
						<Card>
							<CardHeader>
								<CardTitle>Total Issued</CardTitle>
							</CardHeader>
							<CardContent className="text-xl font-semibold">
								Rs.{" "}
								{summary.totalIssued.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								})}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Total Collection</CardTitle>
							</CardHeader>
							<CardContent className="text-xl font-semibold">
								Rs.{" "}
								{summary.totalCollection.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								})}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Total Loan Amount</CardTitle>
							</CardHeader>
							<CardContent className="text-xl font-semibold">
								Rs.{" "}
								{summary.totalLoanAmount.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								})}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Total Visits</CardTitle>
							</CardHeader>
							<CardContent className="text-xl font-semibold">
								{summary.totalVisits.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								})}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Pending Amount</CardTitle>
							</CardHeader>
							<CardContent className="text-xl font-semibold">
								Rs.{" "}
								{summary.pendingAmount.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								})}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Total Issued Loans</CardTitle>
							</CardHeader>
							<CardContent className="text-xl font-semibold">
								{summary.totalLoans}
							</CardContent>
						</Card>
					</>
				) : (
					<p>No data available</p>
				)}
			</div>
		</div>
	);
}
