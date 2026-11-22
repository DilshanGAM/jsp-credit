"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface RowAction {
	label: string;
	icon: LucideIcon;
	onSelect: () => void;
	destructive?: boolean;
}

export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
	if (actions.length === 0) return null;
	return (
		// modal={false}: a modal menu that opens a dialog can leave the page unclickable
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={`Actions for ${label}`}>
					<MoreHorizontal aria-hidden />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				{actions.map(({ label: text, icon: Icon, onSelect, destructive }) => (
					<DropdownMenuItem
						key={text}
						onSelect={onSelect}
						className={cn("gap-2 py-2", destructive && "text-destructive focus:bg-danger focus:text-danger-foreground")}
					>
						<Icon aria-hidden />
						{text}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
