"use client"
import Image from "next/image";
import "./login.css";
import BlurIn from "@/components/ui/blur-in";
import TypingAnimation from "@/components/ui/typing-animation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
    const router = useRouter();

	const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
        axios.post("/api/user/login", { email, password }).then((res) => {
            localStorage.setItem("token", res.data.token);
            if(res.data.user.role === "admin"){
                router.push("/admin/");
            }
        }
        ).catch((err) => {
            toast.error(err.response.data.message);
        }
        );
	};

	return (
		<div className="login-bg flex">
			<div className="w-1/2 h-screen flex items-center justify-center flex-col">
				<Image
					alt=""
					src="/logo.png"
					height={1000}
					width={1000}
					className="w-[250px] h-[250px]"
				/>
				<BlurIn
					word="JSP Credit"
					className="text-4xl font-bold text-blueGreen dark:text-white"
				/>
				<TypingAnimation className="text-baseGreen text-[19px]">
					Reliable solutions for every finance requirement
				</TypingAnimation>
			</div>
			<div className="w-1/2 h-screen flex items-center justify-center backdrop-blur-lg">
				<Card className="w-[400px] p-6">
					<CardHeader>
						<h1 className="text-xl font-bold text-center mb-4">Login</h1>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleLogin}>
							<div className="mb-4">
								<Label htmlFor="email" className="block text-sm font-medium">
									Email Address
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="Enter your email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="mt-1 block w-full"
								/>
							</div>

							<div className="mb-4">
								<Label htmlFor="password" className="block text-sm font-medium">
									Password
								</Label>
								<Input
									id="password"
									type="password"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="mt-1 block w-full"
								/>
							</div>

							

							<Button
								type="submit"
								className="w-full bg-blueGreen text-white py-2"
							>
								Login
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
