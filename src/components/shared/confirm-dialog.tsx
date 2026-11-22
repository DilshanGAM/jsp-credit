"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";

interface ConfirmDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
	title: string;
	description: ReactNode;
	confirmLabel: string;
	destructive?: boolean;
	/** For irreversible actions: the user must type this first. */
	requireText?: string;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, destructive, requireText }: ConfirmDialogProps) {
	const [typed, setTyped] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (open) setTyped("");
	}, [open]);

	async function confirm(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		try {
			await onConfirm();
		} finally {
			setBusy(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<form onSubmit={confirm} className="space-y-5">
					{requireText && (
						<Field id="confirm-text" label={`Type ${requireText} to confirm`}>
							<Input autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
						</Field>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose} disabled={busy}>
							Cancel
						</Button>
						<Button
							type="submit"
							variant={destructive ? "destructive" : "default"}
							loading={busy}
							disabled={!!requireText && typed.trim() !== requireText}
						>
							{confirmLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
