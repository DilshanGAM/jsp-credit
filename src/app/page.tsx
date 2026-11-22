import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, Clock, HandCoins, MapPin, Phone, ReceiptText, Route } from "lucide-react";
import { Brand, Logo } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

// SAMPLE CONTENT: have the company approve the copy and replace CONTACT before publishing.
const CONTACT = [
	{ icon: Phone, label: "Phone", value: "Your phone number" },
	{ icon: MapPin, label: "Office", value: "Your office address" },
	{ icon: Clock, label: "Opening hours", value: "Your opening hours" },
];

const SECTIONS = [
	{ href: "#services", label: "Services" },
	{ href: "#process", label: "How it works" },
	{ href: "#about", label: "About" },
	{ href: "#contact", label: "Contact" },
];

const SERVICES = [
	{
		icon: HandCoins,
		title: "Personal credit",
		text: "Finance for household needs and planned expenses, with the total repayable agreed at the start.",
	},
	{
		icon: Building2,
		title: "Small business credit",
		text: "Working capital for shops, traders and self-employed people who earn day by day.",
	},
	{
		icon: CalendarCheck,
		title: "Daily installments",
		text: "Repayment split into small, regular amounts that are easier to plan around your income.",
	},
	{
		icon: Route,
		title: "Field collection",
		text: "Our collection officers visit you, so you don't lose working time travelling to pay.",
	},
];

const STEPS = [
	{ title: "Talk to us", text: "Contact our office and tell us how much you need and what it is for." },
	{ title: "Agree the terms", text: "We confirm your details and go through the amount, period and installment." },
	{ title: "Receive your loan", text: "Once approved, your loan is issued and recorded against your NIC." },
	{ title: "Repay with receipts", text: "Pay your collection officer and get a receipt for each payment." },
];

const PROMISES = [
	{ icon: CalendarCheck, title: "Planned", text: "A fixed installment, known in advance" },
	{ icon: Route, title: "Convenient", text: "Collection at your doorstep" },
	{ icon: ReceiptText, title: "Recorded", text: "A receipt for every payment" },
];

export default function HomePage() {
	return (
		<div className="min-h-dvh bg-card">
			<header className="sticky top-0 z-30 border-b bg-card">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
					<Link href="/" aria-label="JSP Credit home">
						<Brand />
					</Link>
					<nav aria-label="Page sections" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
						{SECTIONS.map(({ href, label }) => (
							<a key={href} href={href} className="hover:text-foreground">
								{label}
							</a>
						))}
					</nav>
					<Button asChild>
						<Link href="/login">Sign in</Link>
					</Button>
				</div>
			</header>

			<main>
				<section className="bg-brand text-brand-foreground">
					<div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-24">
						<div>
							<h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
								Reliable solutions for every finance requirement
							</h1>
							<p className="mt-5 max-w-xl text-lg leading-relaxed">
								JSP Credit provides straightforward loans with manageable installments and collection that comes to you.
							</p>
							<div className="mt-8 flex flex-wrap gap-3">
								<Button asChild size="lg" variant="highlight">
									<a href="#contact">
										Talk to our team
										<ArrowRight aria-hidden />
									</a>
								</Button>
								<Button asChild size="lg" variant="ghost" className="border border-white/30 text-white hover:bg-white/10 hover:text-white">
									<a href="#process">See how it works</a>
								</Button>
							</div>
						</div>

						<div className="rounded-2xl bg-card p-6 text-foreground sm:p-8">
							<Logo priority className="mx-auto h-40 sm:h-48" />
							<ul className="mt-6 divide-y border-t">
								{PROMISES.map(({ icon: Icon, title, text }) => (
									<li key={title} className="flex items-center gap-3 py-3 last:pb-0">
										<Icon className="size-5 shrink-0 text-primary" aria-hidden />
										<span className="w-24 shrink-0 text-sm font-semibold">{title}</span>
										<span className="text-sm text-muted-foreground">{text}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</section>

				<section id="services" className="scroll-mt-16 py-16 md:py-20">
					<div className="mx-auto max-w-6xl px-4 sm:px-6">
						<h2 className="text-3xl font-semibold tracking-tight">Credit that fits working life</h2>
						<p className="mt-3 max-w-2xl text-muted-foreground">
							Practical finance for individuals and small businesses, built around regular, affordable repayment.
						</p>
						<ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{SERVICES.map(({ icon: Icon, title, text }) => (
								<li key={title} className="rounded-lg border p-5">
									<span className="inline-flex rounded-md bg-secondary p-2.5 text-secondary-foreground">
										<Icon className="size-5" aria-hidden />
									</span>
									<h3 className="mt-4 font-semibold">{title}</h3>
									<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section id="process" className="scroll-mt-16 bg-background py-16 md:py-20">
					<div className="mx-auto max-w-6xl px-4 sm:px-6">
						<h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
						<p className="mt-3 text-muted-foreground">Four steps from first conversation to final installment.</p>
						<ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
							{STEPS.map(({ title, text }, i) => (
								<li key={title}>
									<span className="flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground" aria-hidden>
										{i + 1}
									</span>
									<h3 className="mt-4 font-semibold">{title}</h3>
									<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
								</li>
							))}
						</ol>
						<p className="mt-10 text-sm text-muted-foreground">All credit is subject to assessment and approval.</p>
					</div>
				</section>

				<section id="about" className="scroll-mt-16 py-16 md:py-20">
					<div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
						<h2 className="text-balance text-3xl font-semibold tracking-tight">A credit partner you can speak to in person</h2>
						<div className="space-y-4 leading-relaxed text-muted-foreground">
							<p>
								At JSP Credit, lending is a working relationship. Our managers explain the terms before you commit, and our
								collection officers are people you get to know.
							</p>
							<p>Each loan and payment is recorded in our management system, so questions about your balance can be answered from the record.</p>
						</div>
					</div>
				</section>

				<section id="contact" className="scroll-mt-16 bg-secondary py-16 md:py-20">
					<div className="mx-auto max-w-6xl px-4 sm:px-6">
						<h2 className="text-3xl font-semibold tracking-tight">Talk to our team</h2>
						<p className="mt-3 text-muted-foreground">Call or visit us to discuss what you need.</p>
						<ul className="mt-8 grid gap-4 sm:grid-cols-3">
							{CONTACT.map(({ icon: Icon, label, value }) => (
								<li key={label} className="rounded-lg bg-card p-5">
									<Icon className="size-5 text-primary" aria-hidden />
									<p className="mt-3 text-sm text-muted-foreground">{label}</p>
									<p className="font-semibold">{value}</p>
								</li>
							))}
						</ul>
					</div>
				</section>
			</main>

			<footer className="bg-brand text-brand-foreground">
				<div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<Brand onDark />
					<p className="text-sm">© JSP Credit. All rights reserved.</p>
					<Link href="/login" className="text-sm font-medium text-white underline-offset-4 hover:underline focus-visible:outline-highlight">
						Staff sign in
					</Link>
				</div>
			</footer>
		</div>
	);
}
