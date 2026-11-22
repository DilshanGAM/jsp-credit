import { Ban, CircleCheck, CircleDot, Clock, Flag, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES: Record<string, { label: string; icon: LucideIcon; className: string }> = {
	active: { label: "Active", icon: CircleDot, className: "bg-success text-success-foreground" },
	completed: { label: "Completed", icon: CircleCheck, className: "bg-secondary text-secondary-foreground" },
	ready: { label: "Ready to close", icon: Flag, className: "bg-warning text-warning-foreground" },
	pending: { label: "Pending", icon: Clock, className: "bg-warning text-warning-foreground" },
	started: { label: "In progress", icon: Clock, className: "bg-warning text-warning-foreground" },
	ended: { label: "Verified", icon: CircleCheck, className: "bg-success text-success-foreground" },
	deactivated: { label: "Deactivated", icon: Ban, className: "bg-muted text-muted-foreground" },
	blocked: { label: "Blocked", icon: Ban, className: "bg-danger text-danger-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
	const known = STATUSES[status];
	const Icon = known?.icon ?? CircleDot;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
				known?.className ?? "bg-muted text-muted-foreground"
			)}
		>
			<Icon className="size-3.5" aria-hidden />
			{known?.label ?? (status || "Unknown")}
		</span>
	);
}
