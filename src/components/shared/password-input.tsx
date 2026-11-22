"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
	const [visible, setVisible] = useState(false);
	const Icon = visible ? EyeOff : Eye;
	return (
		<div className="relative">
			<Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
			<button
				type="button"
				onClick={() => setVisible(!visible)}
				aria-label={visible ? "Hide password" : "Show password"}
				className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
			>
				<Icon className="size-4" aria-hidden />
			</button>
		</div>
	);
}
