"use client";

import { VisitType } from "@/types/visit";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface VisitCardProps {
	visit: VisitType;
}

export default function VisitCard({ visit }: VisitCardProps) {
	return (
		<Card className="shadow-md">
			<CardHeader>
				<CardTitle>Visit ID: {visit.id}</CardTitle>
				<CardDescription>Status: {visit.status}</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					<strong>Start Time:</strong> {new Date(visit.startDateTime).toLocaleString()}
				</p>
				{visit.endDateTime && (
					<p>
						<strong>End Time:</strong> {new Date(visit.endDateTime).toLocaleString()}
					</p>
				)}
				<p>
					<strong>Collector:</strong> {visit.collectorId || "N/A"}
				</p>
				{visit.manager && (
					<p>
						<strong>Manager:</strong> {visit.manager?.name}
					</p>
				)}
				<p>
					<strong>Notes:</strong> {visit.notes || "No notes"}
				</p>
				<Button
					className="mt-4 bg-blueGreen text-white"
					onClick={() => toast.success(`Visit ${visit.id} selected!`)}
				>
					View Details
				</Button>
			</CardContent>
		</Card>
	);
}
