"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import axios from "axios";
import { HandCoins, LayoutDashboard, LogOut, Menu, Route, ShieldCheck, UsersRound, X } from "lucide-react";
import { SessionContext, type SessionUser } from "@/components/admin/session-context";
import { Brand } from "@/components/shared/brand";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { api, errorMessage, session } from "@/lib/api";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
	{
		group: "Overview",
		items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
	},
	{
		group: "Operations",
		items: [
			{ href: "/admin/loans", label: "Loans", icon: HandCoins },
			{ href: "/admin/visits", label: "Collection visits", icon: Route },
		],
	},
	{
		group: "People",
		items: [
			{ href: "/admin/customers", label: "Customers", icon: UsersRound },
			{ href: "/admin/users", label: "Team", icon: ShieldCheck },
		],
	},
];

const isCurrent = (href: string, pathname: string) =>
	pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

function Sidebar({ user, onNavigate, onSignOut }: { user: SessionUser; onNavigate?: () => void; onSignOut: () => void }) {
	const pathname = usePathname();
	return (
		<div className="flex h-full flex-col bg-brand text-brand-foreground">
			<Link href="/admin" onClick={onNavigate} className="flex h-16 shrink-0 items-center px-5 focus-visible:-outline-offset-2 focus-visible:outline-highlight">
				<Brand onDark caption="Management portal" />
			</Link>

			<nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
				{NAV.map(({ group, items }) => (
					<div key={group}>
						<p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-brand-foreground/70">{group}</p>
						<ul className="space-y-1">
							{items.map(({ href, label, icon: Icon }) => {
								const current = isCurrent(href, pathname);
								return (
									<li key={href}>
										<Link
											href={href}
											onClick={onNavigate}
											aria-current={current ? "page" : undefined}
											className={cn(
												"relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-highlight",
												current ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
											)}
										>
											{current && <span className="absolute inset-y-2.5 left-0 w-1 rounded-full bg-highlight" aria-hidden />}
											<Icon className={cn("size-[18px]", current && "text-highlight")} aria-hidden />
											{label}
										</Link>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</nav>

			<div className="flex shrink-0 items-center gap-3 border-t border-white/10 p-4">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-highlight text-xs font-semibold text-highlight-foreground" aria-hidden>
					{initials(user.name)}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-white">{user.name}</p>
					<p className="text-xs capitalize">{user.role}</p>
				</div>
				<button
					type="button"
					onClick={onSignOut}
					aria-label="Sign out"
					title="Sign out"
					className="flex size-10 items-center justify-center rounded-md hover:bg-white/10 hover:text-white focus-visible:outline-highlight"
				>
					<LogOut className="size-[18px]" aria-hidden />
				</button>
			</div>
		</div>
	);
}

export function AppShell({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const [user, setUser] = useState<SessionUser | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	const [menuOpen, setMenuOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	// Re-checked on every navigation, so an expired session goes back to sign-in.
	useEffect(() => {
		if (!session.get()) {
			router.replace("/login");
			return;
		}
		let stale = false;
		api
			.get("/user")
			.then(({ data }) => {
				if (stale) return;
				if (data.role !== "admin" && data.role !== "manager") {
					session.clear();
					router.replace("/login?reason=role");
					return;
				}
				setError(null);
				setUser(data);
			})
			.catch((e) => {
				if (stale) return;
				if (axios.isAxiosError(e) && e.response?.status === 401) {
					session.clear();
					router.replace("/login?reason=expired");
					return;
				}
				setError(errorMessage(e));
			});
		return () => {
			stale = true;
		};
	}, [pathname, attempt, router]);

	if (!user) {
		return (
			<main className="flex min-h-dvh items-center justify-center">
				{error ? <ErrorState message={error} onRetry={() => setAttempt(attempt + 1)} /> : <LoadingState label="Opening your workspace" />}
			</main>
		);
	}

	const signOut = () => {
		session.clear();
		router.replace("/login");
	};

	return (
		<SessionContext.Provider value={user}>
			<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-card focus:p-3">
				Skip to content
			</a>

			<aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
				<Sidebar user={user} onSignOut={() => setSigningOut(true)} />
			</aside>

			<DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
				<header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b bg-card px-4 lg:hidden">
					<DialogPrimitive.Trigger asChild>
						<Button variant="ghost" size="icon" aria-label="Open menu">
							<Menu className="!size-5" aria-hidden />
						</Button>
					</DialogPrimitive.Trigger>
					<Link href="/admin">
						<Brand />
					</Link>
					{/* balances the menu button, keeping the logo centered */}
					<span className="w-10" aria-hidden />
				</header>
				<DialogPrimitive.Portal>
					<DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-brand/60 lg:hidden" />
					<DialogPrimitive.Content
						aria-describedby={undefined}
						className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
					>
						<DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
						<Sidebar
							user={user}
							onNavigate={() => setMenuOpen(false)}
							onSignOut={() => {
								setMenuOpen(false);
								setSigningOut(true);
							}}
						/>
						<DialogPrimitive.Close aria-label="Close menu" className="absolute right-2 top-3 flex size-10 items-center justify-center rounded-md text-white hover:bg-white/10">
							<X className="size-5" aria-hidden />
						</DialogPrimitive.Close>
					</DialogPrimitive.Content>
				</DialogPrimitive.Portal>
			</DialogPrimitive.Root>

			<main id="main" tabIndex={-1} className="outline-none lg:pl-64">
				<div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
			</main>

			<ConfirmDialog
				open={signingOut}
				onClose={() => setSigningOut(false)}
				onConfirm={signOut}
				title="Sign out?"
				description="You'll need to sign in again to continue working."
				confirmLabel="Sign out"
			/>
		</SessionContext.Provider>
	);
}
