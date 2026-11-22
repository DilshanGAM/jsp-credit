"use client";

import { PageHeader, SectionTabs } from "@/components/shared/page";

export default function VisitsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<>
			<PageHeader title="Collection visits" description="Review each collector's payments and confirm the cash received." />
			<SectionTabs
				label="Visit lists"
				tabs={[
					{ href: "/admin/visits/active", label: "To verify" },
					{ href: "/admin/visits", label: "All visits" },
				]}
			/>
			{children}
		</>
	);
}
