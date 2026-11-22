import type { Metadata } from "next";
import { AppShell } from "@/components/admin/app-shell";

export const metadata: Metadata = {
	title: "Management portal",
	robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return <AppShell>{children}</AppShell>;
}
