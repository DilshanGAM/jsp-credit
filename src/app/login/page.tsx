"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { Brand, Logo } from "@/components/shared/brand";
import { Field } from "@/components/shared/field";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage, session } from "@/lib/api";

const canUsePortal = (role: string) => role === "admin" || role === "manager";

const REASONS: Record<string, string> = {
	expired: "Your session has ended or couldn't be verified. Please sign in again.",
	role: "This portal is for administrators and managers. Collection officers should use the mobile app.",
};

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [notice, setNotice] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	// Until React is ready a click would submit the form natively and silently clear it.
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(true);
		setNotice(REASONS[new URLSearchParams(window.location.search).get("reason") ?? ""] ?? null);
		if (!session.get()) return;
		api
			.get("/user")
			.then(({ data }) => {
				if (canUsePortal(data.role)) router.replace("/admin");
			})
			.catch(() => {}); // not signed in: stay on the form
	}, [router]);

	async function signIn(event: React.FormEvent) {
		event.preventDefault();
		setNotice(null);
		setBusy(true);
		try {
			const { data } = await api.post("/user/login", { email, password });
			if (!canUsePortal(data.user.role)) {
				setNotice(REASONS.role);
				setBusy(false);
				return;
			}
			session.set(data.token);
			router.push("/admin");
		} catch (e) {
			setNotice(errorMessage(e, "Couldn't sign you in. Please try again."));
			setBusy(false);
		}
	}

	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<aside className="hidden flex-col justify-between bg-brand p-10 text-brand-foreground lg:flex">
				<Brand onDark />
				<div>
					<span className="inline-flex rounded-2xl bg-card p-6">
						<Logo priority className="h-36" />
					</span>
					<p className="mt-8 max-w-md text-balance text-3xl font-semibold leading-snug text-white">
						Reliable solutions for every finance requirement
					</p>
					<p className="mt-3 max-w-md">Loans, customers and field collections, managed in one place.</p>
				</div>
				<p className="text-sm">For authorized staff only</p>
			</aside>

			<main className="flex flex-col bg-card p-6 sm:p-10">
				<Link href="/" className="inline-flex items-center gap-2 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
					<ArrowLeft className="size-4" aria-hidden />
					Back to home
				</Link>
				<div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
					<Logo priority className="mb-8 h-20 self-start lg:hidden" />
					<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
					<p className="mt-1 text-sm text-muted-foreground">Use your JSP Credit staff account.</p>

					{notice && (
						<div role="alert" className="mt-6 flex gap-2 rounded-md bg-danger p-3 text-sm text-danger-foreground">
							<CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
							{notice}
						</div>
					)}

					<form method="post" onSubmit={signIn} className="mt-6 space-y-4">
						<Field id="email" label="Email address">
							<Input type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
						</Field>
						<Field id="password" label="Password">
							<PasswordInput autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
						</Field>
						<Button type="submit" size="lg" className="w-full" loading={busy} disabled={!ready || busy}>
							Sign in
						</Button>
					</form>
					<p className="mt-6 text-sm text-muted-foreground">Forgot your password? Ask an administrator to reset it.</p>
				</div>
			</main>
		</div>
	);
}
