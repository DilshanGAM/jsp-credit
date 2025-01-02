"use client";

import { useState, useEffect } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import toast from "react-hot-toast";

interface VisitCardProps {
	visitId: number;
}

export default function VisitCard({ visitId }: VisitCardProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
	const [modalData, setModalData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [visitData, setVisitData] = useState<any>(null);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		const fetchVisitData = async () => {
			try {
				const token = localStorage.getItem("token");
				const response = await axios.get(`/api/visit/extended?visitId=${visitId}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				setVisitData(response.data);
				setIsLoading(false);
			} catch (err: any) {
				toast.error(err.response?.data?.message || "Failed to fetch visit details");
				setIsLoading(false);
			}
		};
		fetchVisitData();
	}, [visitId]);

	const handleEndTrip = async () => {
		try {
			const token = localStorage.getItem("token");
			const response = await axios.put(
				"/api/visit/verify",
				{ id: visitId, notes },
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			toast.success("Visit ended successfully");
			setIsVerifyDialogOpen(false);
			setIsDialogOpen(false);
		} catch (err: any) {
			toast.error(err.response?.data?.message || "Failed to end the visit");
		}
	};

	if (isLoading) {
		return (
			<div className="h-screen flex items-center justify-center">
				<div className="border-[3px] border-t-blueGreen w-24 rounded-full animate-spin h-24"></div>
			</div>
		);
	}

	const handleViewDetails = () => {
		setModalData(visitData);
		setIsDialogOpen(true);
	};

	return (
		<>
			<Card className="shadow-md">
				<CardHeader>
					<CardTitle>Visit ID: {visitData.visit.id}</CardTitle>
					<CardDescription>Status: {visitData.visit.status}</CardDescription>
				</CardHeader>
				<CardContent>
					<p>
						<strong>Start Time:</strong> {new Date(visitData.visit.startDateTime).toLocaleString()}
					</p>
					{visitData.visit.endDateTime && (
						<p>
							<strong>End Time:</strong> {new Date(visitData.visit.endDateTime).toLocaleString()}
						</p>
					)}
					<p>
						<strong>Collector:</strong> {visitData.collector?.name || "N/A"}
					</p>
					<p>
						<strong>Total Payments:</strong> {visitData.total}
					</p>
					<Button
						className="mt-4 bg-blueGreen text-white"
						onClick={handleViewDetails}
					>
						View Details
					</Button>
				</CardContent>
			</Card>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Visit Details</DialogTitle>
					</DialogHeader>
					{modalData && (
						<div className="space-y-4">
							<p><strong>Collector:</strong> {modalData.collector?.name || "N/A"}</p>
							<p><strong>Manager:</strong> {modalData.manager?.name || "N/A"}</p>
							<p><strong>Total Payments:</strong> {modalData.total}</p>
							<p><strong>Notes:</strong> {modalData.visit.notes || "No notes"}</p>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Payment ID</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Paid Date</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{modalData.payments.map((payment: any) => (
										<TableRow key={payment.id}>
											<TableCell>{payment.id}</TableCell>
											<TableCell>{payment.amount}</TableCell>
											<TableCell>{new Date(payment.paidDate).toLocaleString()}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<Button
								className="mt-4 bg-red-600 text-white"
								onClick={() => setIsVerifyDialogOpen(true)}
							>
								End Trip
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>End Trip Confirmation</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p>Did you receive <strong>{modalData?.total}</strong>?</p>
						<Input
							type="text"
							placeholder="Add a note (optional)"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
						/>
						<Button
							className="bg-blueGreen text-white w-full"
							onClick={handleEndTrip}
						>
							Confirm and End Trip
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
