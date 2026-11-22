"use client";

import { useState, type ReactNode } from "react";
import { SearchX } from "lucide-react";
import { matchesPerson } from "@/components/admin/customer-picker";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/feedback";
import { Panel, SearchInput, Toolbar } from "@/components/shared/page";
import { Pager } from "@/components/shared/pager";
import { NativeSelect } from "@/components/ui/native-select";
import type { UserType } from "@/types/user";

interface PeopleListProps {
	label: string;
	people: UserType[] | null;
	loading: boolean;
	error: string | null;
	reload: () => void;
	columns: Column<UserType>[];
	actions: (person: UserType) => ReactNode;
	empty: ReactNode;
	roles?: string[];
}

/** These endpoints return whole lists, so search, filters and paging happen here. */
export function PeopleList({ label, people, loading, error, reload, columns, actions, empty, roles }: PeopleListProps) {
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("");
	const [role, setRole] = useState("");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);

	const matches = people
		?.filter((p) => matchesPerson(p, query) && (!status || p.status === status) && (!role || p.role === role))
		.sort((a, b) => a.name.localeCompare(b.name) || a.nic.localeCompare(b.nic));
	const total = matches?.length ?? 0;
	const current = Math.min(page, Math.max(1, Math.ceil(total / limit)));

	const filter = (apply: (value: string) => void) => (value: string) => {
		apply(value);
		setPage(1);
	};

	return (
		<Panel>
			<Toolbar>
				<SearchInput label="Search name, NIC, phone or email" value={query} onChange={filter(setQuery)} />
				{roles && (
					<NativeSelect aria-label="Filter by role" className="sm:w-40" value={role} onChange={(e) => filter(setRole)(e.target.value)}>
						<option value="">All roles</option>
						{roles.map((r) => (
							<option key={r} value={r}>
								{r[0].toUpperCase() + r.slice(1)}
							</option>
						))}
					</NativeSelect>
				)}
				<NativeSelect aria-label="Filter by status" className="sm:w-44" value={status} onChange={(e) => filter(setStatus)(e.target.value)}>
					<option value="">All statuses</option>
					<option value="active">Active</option>
					<option value="deactivated">Deactivated</option>
					<option value="blocked">Blocked</option>
				</NativeSelect>
			</Toolbar>
			<DataTable
				label={label}
				columns={columns}
				rows={matches?.slice((current - 1) * limit, current * limit)}
				rowKey={(p) => p.nic}
				loading={loading}
				error={error}
				onRetry={reload}
				actions={actions}
				empty={people?.length ? <EmptyState icon={SearchX} title="No matches" description="Try another search or clear the filters." /> : empty}
			/>
			{!error && (
				<Pager
					page={current}
					limit={limit}
					total={total}
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
