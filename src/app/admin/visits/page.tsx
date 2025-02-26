"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { VisitType } from "@/types/visit";
import VisitCard from "@/components/VisitCard";
import toast from "react-hot-toast";
import Pager from "@/components/pager";

export default function AdminAllVisitsPage() {
	const [visits, setVisits] = useState<VisitType[]>([]);
	const [pageInfo, setPageInfo] = useState({
		page: 1,
		totalPages: 1,
		limit : 10
	});


	useEffect(() => {
		const fetchVisits = async () => {
			const token = localStorage.getItem("token");
			try {
				const response = await axios.get("/api/visit?page="+pageInfo.page+"&limit="+pageInfo.limit, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				console.log(response);
				setVisits(response.data.visits);
				setPageInfo(response.data.pageInfo);
			} catch (err: any) {
				toast.error(err.response?.data?.message || "Failed to fetch visits");
			}
		};

		fetchVisits();
	}, [pageInfo.page]);

	return (
		<div className="p-6 space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{visits.map((visit) => (
					<VisitCard key={visit.id} visitId={visit.id} />
				))}
			</div>
			<Pager pageInfo={pageInfo} setPageInfo={setPageInfo} />
		</div>

	);
}
