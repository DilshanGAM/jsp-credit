"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Field } from "@/components/shared/field";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api";
import type { UserType } from "@/types/user";

const MIN_PASSWORD = 8;

export function PasswordDialog({ person, onClose }: { person: UserType | null; onClose: () => void }) {
	return (
		<Dialog open={!!person} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Change password</DialogTitle>
					<DialogDescription>
						{person?.name} · {person?.email}
					</DialogDescription>
				</DialogHeader>
				{person && <PasswordForm person={person} onClose={onClose} />}
			</DialogContent>
		</Dialog>
	);
}

function PasswordForm({ person, onClose }: { person: UserType; onClose: () => void }) {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [saving, setSaving] = useState(false);

	const tooShort = password.length < MIN_PASSWORD;
	const mismatch = password !== confirmPassword;

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setSubmitted(true);
		if (tooShort || mismatch) return;
		setSaving(true);
		try {
			await api.post("/user/changePassword", { email: person.email, password, confirmPassword });
			toast.success("Password changed");
			onClose();
		} catch (e) {
			toast.error(errorMessage(e, "Couldn't change the password."));
			setSaving(false);
		}
	}

	return (
		<form noValidate onSubmit={save} className="space-y-4">
			<Field id="password" label="New password" error={submitted && tooShort ? `Use at least ${MIN_PASSWORD} characters.` : undefined} hint={`At least ${MIN_PASSWORD} characters.`}>
				<PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
			</Field>
			<Field id="confirmPassword" label="Confirm password" error={submitted && mismatch ? "The passwords don't match." : undefined}>
				<PasswordInput autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
			</Field>
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" loading={saving}>
					Change password
				</Button>
			</DialogFooter>
		</form>
	);
}
