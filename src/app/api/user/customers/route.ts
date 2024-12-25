import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
	//only admins and managers can access this route
	const user = req.headers.get("user");
	if (user) {
		const userObj = JSON.parse(user);
		if (userObj.role === "admin" || userObj.role === "manager") {
			const customerList = await prisma.user.findMany({
				where: {
					role: "customer",
				},
			});
            return NextResponse.json(customerList, { status: 200 });
		} else {
			return NextResponse.json(
				{ message: "Only admins and managers can perform this." },
				{ status: 403 }
			);
		}
	} else {
		return NextResponse.json(
			{ message: "Not logged in. Login and try again." },
			{ status: 403 }
		);
	}
}

export async function POST(req: NextRequest) {
	//admins managers and staff can access this route
	//default password is 123
	//default role is customer
	const user = req.headers.get("user");
	if (user) {
		const userObj = JSON.parse(user);
		if (
			userObj.role === "admin" ||
			userObj.role === "manager" ||
			userObj.role === "staff"
		) {
			const newCustomer = await req.json();
            const hashedPassword = await bcrypt.hash("123", 10);
			const customer = await prisma.user.create({
				data: {
					email: newCustomer.email,
					password: "123",
					name: newCustomer.name,
					phone: newCustomer.phone,
					address: newCustomer.address,
					role: "customer",
					nic: newCustomer.nic,
					status: "active",
				},
			});
			return NextResponse.json(customer, { status: 201 });
		} else {
			return NextResponse.json(
				{ message: "Only admins, managers and staff can perform this." },
				{ status: 403 }
			);
		}
	}
}

export async function PUT(req: NextRequest) {
    //only admins and managers can access this route
    const user = req.headers.get("user");
    if (user) {
        const userObj = JSON.parse(user);
        if (userObj.role === "admin" || userObj.role === "manager") {
            const updatedCustomer = await req.json();
            const customer = await prisma.user.update({
                where: {
                    email: updatedCustomer.email,
                },
                data: {
                    name: updatedCustomer.name,
                    phone: updatedCustomer.phone,
                    address: updatedCustomer.address,
                    nic: updatedCustomer.nic,
                    status: updatedCustomer.status,
                },
            });
            return NextResponse.json(customer, { status: 200 });
        } else {
            return NextResponse.json(
                { message: "Only admins and managers can perform this." },
                { status: 403 }
            );
        }
    }
}
