import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function GET(req: NextRequest) {
	const user = req.headers.get("user");

	const query = req.nextUrl.searchParams.get("query") || "";

	const nic = req.nextUrl.searchParams.get("nic") || "";

	if (user) {
		const userObj = JSON.parse(user);
		if (
			userObj.role === "admin" ||
			userObj.role === "manager" ||
			userObj.role === "staff"
		) {
			const foundUser = await prisma.user.findFirst({
				where: {
					nic: nic,
				},
			});
			if (foundUser) {
				return NextResponse.json(foundUser);
			} else
				return NextResponse.json(
					{ message: "User not found" },
					{ status: 404 }
				);
		} else {
			return NextResponse.json({ message: "Not Authorized" }, { status: 403 });
		}
	}
}
