import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
	title: { default: "JSP Credit", template: "%s | JSP Credit" },
	description: "Reliable solutions for every finance requirement",
};

export const viewport: Viewport = { themeColor: "#0b2429" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={inter.variable}>
			<body>
				{children}
				<Toaster
					position="top-right"
					toastOptions={{
						className: "!rounded-lg !border !border-border !bg-card !text-sm !text-foreground",
						duration: 4000,
						error: { duration: 6000 },
					}}
				/>
			</body>
		</html>
	);
}
