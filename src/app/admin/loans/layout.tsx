"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useSession } from "@/components/admin/session-context";
import { PageHeader, SectionTabs } from "@/components/shared/page";
import { Button } from "@/components/ui/button";

export default function LoansLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const { isAdmin } = useSession();
	return (
		<>
			<PageHeader
				title="Loans"
				description="Issue loans and follow their repayment."
				actions={
					<Button asChild>
						<Link href="/admin/loans?new=1">
							<Plus aria-hidden />
							New loan
						</Link>
					</Button>
				}
			/>
			{/* The other two lists are admin-only in the API. */}
			{isAdmin && (
				<SectionTabs
					label="Loan lists"
					tabs={[
						{ href: "/admin/loans", label: "All loans" },
						{ href: "/admin/loans/pending-complete", label: "Ready to close" },
						{ href: "/admin/loans/completed", label: "Completed" },
					]}
				/>
			)}
			{children}
		</>
	);
}
