const amount = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-US");
const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("en-GB", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

// Anything that rounds to zero shows as zero, not as a negative.
export const formatMoney = (value: number) => `${value <= -0.005 ? "\u2212" : ""}Rs. ${amount.format(Math.abs(value))}`;
export const formatCount = (value: number) => count.format(value);
export const formatDate = (value: string | Date) => date.format(new Date(value));
export const formatDateTime = (value: string | Date) => dateTime.format(new Date(value));

export const plural = (n: number, word: string, words = `${word}s`) => `${formatCount(n)} ${n === 1 ? word : words}`;

export const initials = (name: string) =>
	name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => Array.from(part)[0] ?? "")
		.join("")
		.toUpperCase();
