"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "@/components/admin/session-context";
import { Field } from "@/components/shared/field";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { api, errorMessage } from "@/lib/api";
import type { UserType } from "@/types/user";

type Kind = "customer" | "team";

const MIN_PASSWORD = 8;
// The signed-in user travels in an HTTP header, which can't carry characters above U+00FF.
const UNSAFE_IN_HEADER = /[^\u0000-ÿ]/;

interface PersonFormDialogProps {
	kind: Kind;
	open: boolean;
	/** null to create. */
	person: UserType | null;
	onClose: () => void;
	onSaved: () => void;
}

export function PersonFormDialog({ open, onClose, ...props }: PersonFormDialogProps) {
	const noun = props.kind === "customer" ? "customer" : "team member";
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>{props.person ? `Edit ${noun}` : `Add ${noun}`}</DialogTitle>
					<DialogDescription>Fields marked * are required.</DialogDescription>
				</DialogHeader>
				{open && <PersonForm onClose={onClose} {...props} />}
			</DialogContent>
		</Dialog>
	);
}

function PersonForm({ kind, person, onClose, onSaved }: Omit<PersonFormDialogProps, "open">) {
	const { user, isAdmin } = useSession();
	const team = kind === "team";
	const isSelf = person?.nic === user.nic;
	const [form, setForm] = useState({
		name: person?.name ?? "",
		nic: person?.nic ?? "",
		phone: person?.phone ?? "",
		email: person?.email ?? "",
		address: person?.address ?? "",
		role: person?.role ?? (team ? "staff" : "customer"),
		status: person?.status ?? "active",
		password: "",
	});
	const [submitted, setSubmitted] = useState(false);
	const [saving, setSaving] = useState(false);

	const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
		setForm({ ...form, [key]: e.target.value });

	function validate() {
		const errors: Partial<Record<keyof typeof form, string>> = {};
		if (!form.name.trim()) errors.name = "Enter a name.";
		else if (team && form.role !== "customer" && form.name !== person?.name && UNSAFE_IN_HEADER.test(form.name)) {
			errors.name = "Use English letters. The system can't yet sign in staff with names in other scripts.";
		}
		if (!form.nic.trim()) errors.nic = "Enter the NIC.";
		if (!form.phone.trim()) errors.phone = "Enter a phone number.";
		if (!person) {
			if (team && !form.email.trim()) errors.email = "Team members need an email to sign in.";
			else if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
			if (team && form.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
		}
		return errors;
	}
	const errors = submitted ? validate() : {};

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setSubmitted(true);
		if (Object.keys(validate()).length) return;
		setSaving(true);
		const { password, ...fields } = form;
		try {
			if (person) {
				// PUT /user only lets managers edit staff; customers have their own route.
				const path = !team && !isAdmin ? "/user/customers" : "/user";
				// Both routes find the account by its stored email, so never alter it here.
				await api.put(path, { ...fields, email: person.email });
			} else {
				// Trimmed only on create: existing keys must match exactly. Blank email is null, as "" must be unique.
				const payload = { ...fields, name: form.name.trim(), nic: form.nic.trim(), email: form.email.trim() || null };
				if (team) await api.post("/user", { ...payload, password });
				else await api.post("/user/customers", payload);
			}
			toast.success(person ? "Changes saved" : "Account added");
			onSaved();
			onClose();
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't save. The NIC or email may already be in use."));
			setSaving(false);
		}
	}

	const nicLocked = !!person && team && (!isAdmin || isSelf);

	return (
		<form noValidate onSubmit={save} className="space-y-5">
			<div className="grid gap-4 sm:grid-cols-2">
				<Field id="name" label="Full name" required error={errors.name}>
					<Input autoComplete="off" value={form.name} onChange={set("name")} />
				</Field>
				<Field id="nic" label="NIC" required error={errors.nic} hint={person && !nicLocked ? "Changing this moves the person's records to the new NIC." : undefined}>
					<Input autoComplete="off" value={form.nic} onChange={set("nic")} disabled={nicLocked} />
				</Field>
				<Field id="phone" label="Phone" required error={errors.phone}>
					<Input type="tel" autoComplete="off" value={form.phone} onChange={set("phone")} />
				</Field>
				<Field id="person-email" label={team ? "Email" : "Email (optional)"} required={team && !person} error={errors.email} hint={person ? "Email can't be changed." : undefined}>
					<Input type="email" autoComplete="off" value={form.email} onChange={set("email")} disabled={!!person} />
				</Field>
				<Field id="address" label="Address" className="sm:col-span-2">
					<Input autoComplete="off" value={form.address} onChange={set("address")} />
				</Field>
				{team && (
					<Field id="role" label="Role" hint={!isAdmin ? "Managers can add and edit staff." : undefined}>
						<NativeSelect value={form.role} onChange={set("role")} disabled={!isAdmin || isSelf}>
							<option value="staff">Staff (collector)</option>
							<option value="manager">Manager</option>
							<option value="admin">Admin</option>
							<option value="customer">Customer</option>
						</NativeSelect>
					</Field>
				)}
				{/* The create routes always set "active". */}
				{person && (
					<Field id="status" label="Account status" hint={isSelf ? "You can't change your own status." : undefined}>
						<NativeSelect value={form.status} onChange={set("status")} disabled={isSelf}>
							<option value="active">Active</option>
							<option value="deactivated">Deactivated</option>
							<option value="blocked">Blocked</option>
						</NativeSelect>
					</Field>
				)}
				{team && !person && (
					<Field id="new-password" label="Initial password" required error={errors.password} hint={`At least ${MIN_PASSWORD} characters. Share it privately.`}>
						<PasswordInput autoComplete="new-password" value={form.password} onChange={set("password")} />
					</Field>
				)}
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" loading={saving}>
					{person ? "Save changes" : "Add account"}
				</Button>
			</DialogFooter>
		</form>
	);
}
