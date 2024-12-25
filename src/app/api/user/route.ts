import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

export function GET(req: NextRequest) {
	//get the user from the request header
	const user = req.headers.get("user");
	if (user) {
		return NextResponse.json(JSON.parse(user), { status: 200 });
	} else {
		return NextResponse.json(
			{ message: "You have to login again" },
			{ status: 401 }
		);
	}
}

export async function POST(req: NextRequest) {
	//get the user from the request header
	const user = req.headers.get("user");
	const newUser = await req.json();
	//if there is no user only customer accounts can be made otherwise send a message with 403 status
	if (user) {
		const userObj = JSON.parse(user);
		if (userObj.role === "admin") {
			//hash the password
			let hashedPassword = await bcrypt.hash(newUser.password || "123", 10);
			//create the user
			await prisma.user.create({
				data: {
					email: newUser.email,
					password: hashedPassword,
					name: newUser.name,
					phone: newUser.phone,
					address: newUser.address,
					role: newUser.role,
					nic: newUser.nic,
					status: "active",
				},
			});
			return NextResponse.json({ message: "Account created" }, { status: 201 });
		} else if (userObj.role === "manager") {
			if (newUser.role === "staff") {
				//hash the password
				const hashedPassword = await bcrypt.hash(newUser.password || "123", 10);
				//create the user
				await prisma.user.create({
					data: {
						email: newUser.email,
						password: hashedPassword,
						name: newUser.name,
						phone: newUser.phone,
						address: newUser.address,
						role: newUser.role,
						nic: newUser.nic,
						status: "active",
					},
				});
				return NextResponse.json(
					{ message: "Account created" },
					{ status: 201 }
				);
			} else {
				return NextResponse.json(
					{ message: "Managers are only allowed to create staff accounts" },
					{ status: 403 }
				);
			}
		} else {
			return NextResponse.json(
				{ message: "You are not authorized to create students" },
				{ status: 403 }
			);
		}
	} else {
		if (newUser.role === "customer") {
			//hash the password
			const hashedPassword = await bcrypt.hash(newUser.password || "123", 10);
			//create the user
			await prisma.user.create({
				data: {
					email: newUser.email,
					password: hashedPassword,
					name: newUser.name,
					phone: newUser.phone,
					address: newUser.address,
					role: newUser.role,
					nic: newUser.nic,
					status: "active",
				},
			});
			return NextResponse.json({ message: "Account created" }, { status: 201 });
		} else {
			return NextResponse.json(
				{ message: "You can only create an customer accounts" },
				{ status: 403 }
			);
		}
	}
}

export async function PUT(req: NextRequest) {
	// Get the user from the request header
	const user = req.headers.get("user");
	const updateUser = await req.json();

	if (user) {
		const userObj = JSON.parse(user);
		const existingUser = await prisma.user.findUnique({
			where: { email: updateUser.email },
		});

		if (!existingUser) {
			return NextResponse.json({ message: "User not found" }, { status: 404 });
		}

		if (userObj.role === "admin") {
			// Allow admin to update any user
			await prisma.user.update({
				where: { email: updateUser.email },
				data: {
					name: updateUser.name,
					phone: updateUser.phone,
					address: updateUser.address,
					role: updateUser.role,
					nic: updateUser.nic,
					status: updateUser.status,
				},
			});
			return NextResponse.json(
				{ message: "User updated successfully" },
				{ status: 200 }
			);
		} else if (userObj.role === "manager") {
			if (existingUser.role === "staff") {
				// Managers can only update staff accounts
				await prisma.user.update({
					where: { email: updateUser.email },
					data: {
						name: updateUser.name,
						phone: updateUser.phone,
						address: updateUser.address,
						status: updateUser.status,
					},
				});
				return NextResponse.json(
					{ message: "Staff account updated successfully" },
					{ status: 200 }
				);
			} else {
				return NextResponse.json(
					{ message: "Managers can only update staff accounts" },
					{ status: 403 }
				);
			}
		} else {
			return NextResponse.json(
				{ message: "You are not authorized to update users" },
				{ status: 403 }
			);
		}
	} else {
		return NextResponse.json(
			{ message: "You need to login to update users" },
			{ status: 401 }
		);
	}
}
