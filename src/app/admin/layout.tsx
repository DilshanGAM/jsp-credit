"use client"
import { UserType } from "@/types/user";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
	FaHome,
	FaUsers,
	FaUserTie,
	FaMoneyCheckAlt,
	FaRegCalendarCheck,
} from "react-icons/fa";

export default function AdminLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
    const [userLoaded, setUserLoaded] = useState(false);
    const [user, setUser] = useState<UserType|null>(null);
    const router = useRouter();
    const pathName = usePathname();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if(token){
            fetch("/api/user/", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }).then((res) => res.json()).then((data) => {
                setUser(data);
                setUserLoaded(true);
            }
            ).catch((err) => {
                toast.error(err.response.data.message);
                router.push("/login");
            }
            );
        }else{
            router.push("/login");
        }
    }
    , [pathName]);  
	return (
		<div className="w-full h-screen max-h-screen flex">
			<div className="h-screen bg-blueGreen w-[300px] flex flex-col">
				<div className="h-[60px] flex items-center justify-center">
					<Image
						alt=""
						src="/logo.png"
						height={1000}
						width={1000}
						className="w-[50px] h-[50px] bg-white rounded-full p-2"
					/>
					<span className="text-xl font-bold px-2 text-white">JSP Credit</span>
				</div>
				<div className="flex flex-1 flex-col items-start justify-start pt-10">
					<Link
						href="/admin/"
						className="text-white flex items-center px-4 py-2 mb-4 w-full hover:bg-baseGreen transition-all"
					>
						<FaHome className="mr-3" />
						<span className="font-medium">Home</span>
					</Link>
					<Link
						href="/admin/users"
						className="text-white flex items-center px-4 py-2 mb-4 w-full hover:bg-baseGreen transition-all"
					>
						<FaUsers className="mr-3" />
						<span className="font-medium">Users</span>
					</Link>
					<Link
						href="/admin/customers"
						className="text-white flex items-center px-4 py-2 mb-4 w-full hover:bg-baseGreen transition-all"
					>
						<FaUserTie className="mr-3" />
						<span className="font-medium">Customers</span>
					</Link>
					<Link
						href="/admin/loans"
						className="text-white flex items-center px-4 py-2 mb-4 w-full hover:bg-baseGreen transition-all"
					>
						<FaMoneyCheckAlt className="mr-3" />
						<span className="font-medium">Loans</span>
					</Link>
					<Link
						href="/admin/visits"
						className="text-white flex items-center px-4 py-2 mb-4 w-full hover:bg-baseGreen transition-all"
					>
						<FaRegCalendarCheck className="mr-3" />
						<span className="font-medium">Visits</span>
					</Link>
				</div>
				<div className="h-[60px] bg-white flex items-center justify-center">
					<span className="text-xl font-bold text-blueGreen dark:text-white cursor-pointer">
						Logout
					</span>
				</div>
			</div>
			<div className="w-[calc(100%-300px)] max-h-screen overflow-y-scroll ">

				{userLoaded?children:<div className="h-screen flex items-center justify-center"><div className=" border-[3px] border-t-blueGreen w-24 rounded-full animate-spin h-24"></div></div>}
			</div>
		</div>
	);
}
