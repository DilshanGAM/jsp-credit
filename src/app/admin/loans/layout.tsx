"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminVisitsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const pathName = usePathname();
    console.log(pathName);
    const linkClasses = (href: string) =>
        `w-[200px] p-4 rounded-lg ${
            pathName === href ? "bg-blueGreen text-white" : "text-blueGreen bg-gray-100 hover:bg-gray-200"
        }`;

 

  return (
    <div>
      <div className="flex space-x-4 p-4">
      <Link href="/admin/loans/" className={linkClasses("/admin/loans")}>
          All Loans
        </Link>
        <Link href="/admin/loans/pending-complete" className={linkClasses("/admin/loans/pending-complete")}>
          Pending Completion
        </Link>
        <Link href="/admin/loans/completed" className={linkClasses("/admin/loans/completed")}>
          Completed Loans
        </Link>
      </div>
      {children}
    </div>
  );
}
