import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
	id: string;
	label: string;
	error?: string;
	hint?: ReactNode;
	required?: boolean;
	className?: string;
	children: ReactElement<any>;
}

/** Wires a control to its label, hint and error for screen readers. */
export function Field({ id, label, error, hint, required, className, children }: FieldProps) {
	const noteId = error || hint ? `${id}-note` : undefined;
	return (
		<div className={cn("space-y-1.5", className)}>
			<Label htmlFor={id}>
				{label}
				{required && (
					<span className="ml-0.5 text-destructive" aria-hidden>
						*
					</span>
				)}
			</Label>
			{cloneElement(children, {
				id,
				"aria-invalid": error ? true : undefined,
				"aria-describedby": noteId,
				"aria-required": required || undefined,
			})}
			{noteId && (
				<p id={noteId} className={cn("text-xs", error ? "font-medium text-destructive" : "text-muted-foreground")}>
					{error || hint}
				</p>
			)}
		</div>
	);
}
