"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import axios from "axios";
import { useState } from "react";
import { UserType } from "@/types/user";

export function CustomerSearchField({ val, onChange }: any) {
    val = val || "";
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState(val);
	const [customerList, setCustomerList] = useState<UserType[]>([]);
	const [customerListLoaded, setCustomerListLoaded] = useState(false);

	React.useEffect(() => {
		getUsersByQuery("");
	}, []);

	async function getUsersByQuery(query: string) {
		const token = localStorage.getItem("token");
		setCustomerListLoaded(false);
		axios
			.get("/api/user/search?query=" + query, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			.then((res) => {
				console.log(res.data);
				setCustomerList(res.data);
				setCustomerListLoaded(true);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	return (
		<Popover   open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between"
				>
					{value
						? customerList.find((customer) => customer.nic === value)?.nic
						: "Select Customer"}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0">
				<Command>
					<CommandInput
						placeholder="Search user name, email or nic"
						onValueChange={(e) => {
							getUsersByQuery(e);
						}}
					/>
					<CommandList>
						{customerListLoaded ? (
							<>
								<CommandEmpty>No Users found.</CommandEmpty>
								<CommandGroup>
									{customerList.map((customer) => (
										<CommandItem
											key={customer.nic}
											value={
												customer.nic +
												" " +
												customer.name +
												" " +
												customer.email
											}
											onSelect={() => {
												setValue(customer.nic);
                                                onChange(customer.nic);
												setOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													value === customer.nic ? "opacity-100" : "opacity-0"
												)}
											/>
											{"(" + customer.nic + ") " + customer.name}
										</CommandItem>
									))}
								</CommandGroup>
							</>
						) : (
							<div className="w-full flex justify-center items-center h-48">
								<div className="animate-spin rounded-full h-12 w-12 border-t-2 border border-b-2 border-b-blueGreen"></div>
							</div>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
