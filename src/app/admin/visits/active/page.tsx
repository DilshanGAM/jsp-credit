"use client";

import { CircleCheck } from "lucide-react";
import { VisitTable } from "@/components/admin/visit-table";
import { EmptyState } from "@/components/shared/feedback";
import { Panel } from "@/components/shared/page";
import { useResource } from "@/lib/use-resource";
import type { VisitType } from "@/types/visit";

export default function ActiveVisitsPage() {
	const { data, error, loading, reload } = useResource<VisitType[]>("/visit/active");
	return (
		<Panel>
			<VisitTable
				visits={data}
				loading={loading}
				error={error}
				reload={reload}
				empty={<EmptyState icon={CircleCheck} title="All caught up" description="There are no visits waiting to be verified." />}
			/>
		</Panel>
	);
}
