"use client";

import { useState } from "react";
import { KeyRound, Pencil, ShieldCheck, UserPlus } from "lucide-react";
import { PasswordDialog } from "@/components/admin/password-dialog";
import { PeopleList } from "@/components/admin/people-list";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";
import { useSession } from "@/components/admin/session-context";
import { Primary } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/feedback";
import { PageHeader } from "@/components/shared/page";
import { RowMenu, type RowAction } from "@/components/shared/row-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useResource } from "@/lib/use-resource";
import type { UserType } from "@/types/user";

export default function TeamPage() {
	const { user, isAdmin } = useSession();
	const { data, error, loading, reload } = useResource<UserType[]>("/user/all");
	// undefined: closed, null: adding
	const [editing, setEditing] = useState<UserType | null | undefined>(undefined);
	const [changingPassword, setChangingPassword] = useState<UserType | null>(null);

	// Mirrors the API's rules, so nobody is offered an action that will be refused.
	function actionsFor(person: UserType) {
		if (person.email === null) return [];
		const actions: RowAction[] = [];
		if (isAdmin || person.role === "staff") actions.push({ label: "Edit details", icon: Pencil, onSelect: () => setEditing(person) });
		if (isAdmin || person.email === user.email) {
			actions.push({ label: "Change password", icon: KeyRound, onSelect: () => setChangingPassword(person) });
		}
		return actions;
	}

	return (
		<>
			<PageHeader
				title="Team"
				description={isAdmin ? "Administrators, managers and collection staff." : "Managers and collection staff."}
				actions={
					<Button onClick={() => setEditing(null)}>
						<UserPlus aria-hidden />
						{isAdmin ? "Add team member" : "Add staff"}
					</Button>
				}
			/>
			<PeopleList
				label="Team"
				roles={isAdmin ? ["admin", "manager", "staff"] : ["manager", "staff"]}
				people={data}
				loading={loading}
				error={error}
				reload={reload}
				columns={[
					{ header: "Member", cell: (p) => <Primary title={p.nic === user.nic ? `${p.name} (you)` : p.name} subtitle={p.nic} /> },
					{ header: "Email", cell: (p) => <span className="break-all">{p.email || "—"}</span> },
					{ header: "Phone", cell: (p) => p.phone || "—" },
					{ header: "Role", cell: (p) => <span className="capitalize">{p.role}</span> },
					{ header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
				]}
				actions={(p) => <RowMenu label={p.name} actions={actionsFor(p)} />}
				empty={<EmptyState icon={ShieldCheck} title="No team members yet" />}
			/>
			<PersonFormDialog kind="team" open={editing !== undefined} person={editing ?? null} onClose={() => setEditing(undefined)} onSaved={reload} />
			<PasswordDialog person={changingPassword} onClose={() => setChangingPassword(null)} />
		</>
	);
}
