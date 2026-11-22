"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, ListFilter, Pencil, UserPlus, UsersRound } from "lucide-react";
import { PeopleList } from "@/components/admin/people-list";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";
import { Primary } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/feedback";
import { PageHeader } from "@/components/shared/page";
import { RowMenu, type RowAction } from "@/components/shared/row-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useResource } from "@/lib/use-resource";
import type { UserType } from "@/types/user";

export default function CustomersPage() {
	const router = useRouter();
	const { data, error, loading, reload } = useResource<UserType[]>("/user/customers");
	// undefined: closed, null: adding
	const [editing, setEditing] = useState<UserType | null | undefined>(undefined);

	function actionsFor(customer: UserType) {
		const nic = encodeURIComponent(customer.nic);
		const actions: RowAction[] = [
			{ label: "Issue loan", icon: HandCoins, onSelect: () => router.push(`/admin/loans?customer=${nic}&new=1`) },
			{ label: "View active loans", icon: ListFilter, onSelect: () => router.push(`/admin/loans?customer=${nic}`) },
		];
		// The update routes find accounts by email, so accounts without one can't be edited.
		if (customer.email !== null) actions.push({ label: "Edit details", icon: Pencil, onSelect: () => setEditing(customer) });
		return actions;
	}

	return (
		<>
			<PageHeader
				title="Customers"
				description="Borrower records and quick access to their loans."
				actions={
					<Button onClick={() => setEditing(null)}>
						<UserPlus aria-hidden />
						Add customer
					</Button>
				}
			/>
			<PeopleList
				label="Customers"
				people={data}
				loading={loading}
				error={error}
				reload={reload}
				columns={[
					{ header: "Customer", cell: (c) => <Primary title={c.name} subtitle={c.nic} /> },
					{ header: "Phone", cell: (c) => c.phone || "—" },
					{ header: "Email", cell: (c) => <span className="break-all">{c.email || "—"}</span> },
					{ header: "Address", cell: (c) => c.address || "—" },
					{ header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
				]}
				actions={(c) => <RowMenu label={c.name} actions={actionsFor(c)} />}
				empty={<EmptyState icon={UsersRound} title="No customers yet" description="Add your first customer to start issuing loans." />}
			/>
			<PersonFormDialog kind="customer" open={editing !== undefined} person={editing ?? null} onClose={() => setEditing(undefined)} onSaved={reload} />
		</>
	);
}
