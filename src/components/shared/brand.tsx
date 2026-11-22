import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "../../../public/brand-logo.png";

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
	return <Image src={logo} alt="" priority={priority} sizes="320px" className={cn("h-10 w-auto", className)} />;
}

/** Logo plus name. On dark surfaces the logo sits on a light tile so its colors stay true. */
export function Brand({ onDark, caption }: { onDark?: boolean; caption?: string }) {
	return (
		<span className="flex items-center gap-3">
			<span className={cn("flex items-center justify-center", onDark && "rounded-lg bg-card p-1.5")}>
				<Logo priority className={onDark ? "h-8" : "h-10"} />
			</span>
			<span className="leading-tight">
				<span className={cn("block font-semibold tracking-tight", onDark ? "text-white" : "text-foreground")}>
					JSP Credit
				</span>
				{caption && (
					<span className={cn("block text-xs", onDark ? "text-brand-foreground" : "text-muted-foreground")}>
						{caption}
					</span>
				)}
			</span>
		</span>
	);
}
