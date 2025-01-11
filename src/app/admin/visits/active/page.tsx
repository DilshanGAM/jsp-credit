"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { VisitType } from "@/types/visit";
import VisitCard from "@/components/VisitCard";
import toast from "react-hot-toast";

export default function AdminVisitsPage() {
	const [visits, setVisits] = useState<VisitType[]>([]);

	useEffect(() => {
		const fetchVisits = async () => {
			const token = localStorage.getItem("token");
			try {
				const response = await axios.get("/api/visit/active", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				console.log(response);
				setVisits(response.data);
			} catch (err: any) {
				toast.error(err.response?.data?.message || "Failed to fetch visits");
			}
		};

		fetchVisits();
	}, []);

	return (
		<div className="p-6 space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{visits.map((visit) => (
					<VisitCard key={visit.id} visitId={visit.id} />
				))}
			</div>
		</div>
	);
}
