import Link from "next/link";
import { Logo } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
			<Logo className="h-20" />
			<h1 className="mt-6 text-2xl font-semibold">Page not found</h1>
			<p className="mt-2 text-muted-foreground">The page may have moved, or the address may be wrong.</p>
			<Button asChild className="mt-6">
				<Link href="/">Back to home</Link>
			</Button>
		</main>
	);
}
