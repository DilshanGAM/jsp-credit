"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoanTable } from "@/components/admin/loan-table";
import { Pager } from "@/components/shared/pager";
import type { RowAction } from "@/components/shared/row-menu";
import { useResource } from "@/lib/use-resource";
import type LoanType from "@/types/loan";
import type { PageInfo } from "@/types/page-info";

interface PagedLoansProps {
	endpoint: "/loan" | "/loan/completed";
	/** Change this to refetch. */
	version?: number;
	actions?: (loan: LoanType) => RowAction[];
	empty?: ReactNode;
}

export function PagedLoans({ endpoint, version = 0, actions, empty }: PagedLoansProps) {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const { data, error, loading, reload } = useResource<{ loans: LoanType[]; pageInfo: PageInfo }>(
		`${endpoint}?page=${page}&limit=${limit}`
	);

	useEffect(() => {
		if (version) reload();
	}, [version, reload]);

	// Deleting the last row of the last page would otherwise leave an empty page.
	useEffect(() => {
		const pages = data?.pageInfo.totalPages;
		if (!loading && pages && page > pages) setPage(pages);
	}, [data, loading, page]);

	return (
		<>
			<LoanTable loans={data?.loans} loading={loading} error={error} onRetry={reload} actions={actions} empty={empty} />
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
		</>
	);
}
