import type { ReactNode } from "react";
import { Inbox, Loader2, RotateCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
	return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
	return (
		<div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
			<Loader2 className="size-5 animate-spin" aria-hidden />
			{label}
		</div>
	);
}

interface EmptyStateProps {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center px-6 py-12 text-center">
			<span className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
				<Icon className="size-6" aria-hidden />
			</span>
			<p className="font-medium">{title}</p>
			{description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
	return (
		<div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
			<span className="mb-3 rounded-full bg-danger p-3 text-danger-foreground">
				<TriangleAlert className="size-6" aria-hidden />
			</span>
			<p className="max-w-sm text-sm">{message}</p>
			{onRetry && (
				<Button variant="outline" className="mt-4" onClick={onRetry}>
					<RotateCw aria-hidden />
					Try again
				</Button>
			)}
		</div>
	);
}
