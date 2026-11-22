import type { Config } from "tailwindcss";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;
const pair = (name: string) => ({ DEFAULT: token(name), foreground: token(`${name}-foreground`) });

export default {
	content: ["./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
	theme: {
		extend: {
			// Values live in src/app/globals.css. Use these names, not raw palette colors.
			colors: {
				background: token("background"),
				foreground: token("foreground"),
				border: token("border"),
				input: token("input"),
				ring: token("ring"),
				card: pair("card"),
				popover: pair("popover"),
				primary: pair("primary"),
				secondary: pair("secondary"),
				muted: pair("muted"),
				accent: pair("accent"),
				destructive: pair("destructive"),
				brand: pair("brand"),
				highlight: pair("highlight"),
				success: pair("success"),
				warning: pair("warning"),
				danger: pair("danger"),
			},
			fontFamily: {
				sans: ["var(--font-sans)", "Noto Sans Sinhala", "Nirmala UI", "system-ui", "sans-serif"],
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
