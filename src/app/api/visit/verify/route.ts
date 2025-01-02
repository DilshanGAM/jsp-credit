import { NextRequest, NextResponse } from "next/server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function PUT(req: NextRequest) {
	const user = req.headers.get("user");
	const body = await req.json();
	if (!user) {
		return NextResponse.json(
			{ message: "You are not logged in. Please log in again and try." },
			{ status: 403 }
		);
	}
	const userObj = JSON.parse(user);
	if (
		!userObj.role ||
		(userObj.role !== "admin" && userObj.role !== "manager")
	) {
		return NextResponse.json(
			{ message: "Only admins and managers can verify visits" },
			{ status: 403 }
		);
	}
	try {
		const visit = await prisma.visit.update({
			where: {
				id: body.id,
			},
			data: {
				status: "ended",
				managerId: userObj.nic,
                notes: body.notes||"",
			},
		});
        return NextResponse.json(visit);
	} catch (e: any) {
		return NextResponse.json(
			{ message: "Error verifying visit" },
			{ status: 500 }
		);
	}
}
