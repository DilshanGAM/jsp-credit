"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { controlClasses } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useResource } from "@/lib/use-resource";
import { cn } from "@/lib/utils";
import type { UserType } from "@/types/user";

const MAX_SHOWN = 50;

export function matchesPerson(person: UserType, query: string) {
	const q = query.trim().toLowerCase();
	return !q || [person.name, person.nic, person.email, person.phone].some((value) => value?.toLowerCase().includes(q));
}

interface CustomerPickerProps {
	value: string;
	onChange: (nic: string) => void;
	placeholder?: string;
	id?: string;
	"aria-label"?: string;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}

export function CustomerPicker({
	value,
	onChange,
	placeholder = "Select a customer",
	id,
	"aria-label": label,
	"aria-invalid": invalid,
	"aria-describedby": describedBy,
}: CustomerPickerProps) {
	const { data, error } = useResource<UserType[]>("/user/customers");
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const selected = data?.find((c) => c.nic === value);
	const matches = data?.filter((c) => matchesPerson(c, query)) ?? [];
	const note = error
		? error
		: !data
			? "Loading customers"
			: matches.length === 0
				? "No customers found"
				: matches.length > MAX_SHOWN
					? `Showing ${MAX_SHOWN} of ${matches.length}. Keep typing to narrow it down.`
					: null;

	return (
		// modal: needed for the list to scroll inside a dialog
		<Popover
			modal
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				setQuery("");
			}}
		>
			<PopoverTrigger asChild>
				<button
					type="button"
					id={id}
					role="combobox"
					aria-expanded={open}
					aria-label={label}
					aria-invalid={invalid}
					aria-describedby={describedBy}
					className={cn(controlClasses, "items-center justify-between gap-2 text-left")}
				>
					<span className={cn("truncate", !value && "text-muted-foreground")}>
						{value ? (selected ? `${selected.name} · ${selected.nic}` : value) : placeholder}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
				<Command shouldFilter={false} label="Search customers">
					<CommandInput value={query} onValueChange={setQuery} placeholder="Name, NIC, phone or email" />
					<CommandList className="max-h-64 p-1" label="Customers">
						{matches.slice(0, MAX_SHOWN).map((customer) => (
							<CommandItem
								key={customer.nic}
								value={customer.nic}
								onSelect={() => {
									onChange(customer.nic);
									setOpen(false);
								}}
								className="cursor-pointer py-2"
							>
								<Check className={customer.nic === value ? "opacity-100" : "opacity-0"} aria-hidden />
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium">{customer.name}</span>
									<span className="block text-xs text-muted-foreground">{customer.nic}</span>
								</span>
								{customer.status !== "active" && <StatusBadge status={customer.status} />}
							</CommandItem>
						))}
					</CommandList>
					{note && <p className="border-t px-3 py-2 text-xs text-muted-foreground">{note}</p>}
				</Command>
			</PopoverContent>
		</Popover>
	);
}
