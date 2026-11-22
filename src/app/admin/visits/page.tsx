"use client";

import { useState } from "react";
import { Route } from "lucide-react";
import { VisitTable } from "@/components/admin/visit-table";
import { EmptyState } from "@/components/shared/feedback";
import { Panel } from "@/components/shared/page";
import { Pager } from "@/components/shared/pager";
import { useResource } from "@/lib/use-resource";
import type { PageInfo } from "@/types/page-info";
import type { VisitType } from "@/types/visit";

export default function AllVisitsPage() {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const { data, error, loading, reload } = useResource<{ visits: VisitType[]; pageInfo: PageInfo }>(
		`/visit?page=${page}&limit=${limit}`
	);

	return (
		<Panel>
			<VisitTable
				visits={data?.visits}
				loading={loading}
				error={error}
				reload={reload}
				empty={<EmptyState icon={Route} title="No visits yet" description="Visits appear when collectors start them in the mobile app." />}
			/>
			{data && (
				<Pager
					page={page}
					limit={limit}
					total={data.pageInfo.total}
					onPage={setPage}
					onLimit={(next) => {
						setLimit(next);
						setPage(1);
					}}
				/>
			)}
		</Panel>
	);
}
