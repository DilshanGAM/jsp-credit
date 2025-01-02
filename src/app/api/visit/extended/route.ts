import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
	const user = req.headers.get("user");

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
			{ message: "Only admins, managers and staff can start visits" },
			{ status: 403 }
		);
	}
	const visitId = parseInt(req.nextUrl.searchParams.get("visitId") || "-99");

	if (visitId === -99) {
		return NextResponse.json({ message: "Invalid visit id" }, { status: 400 });
	}

	const visit = await prisma.visit.findUnique({
		where: {
			id: visitId,
		},
	});

	if (!visit) {
		return NextResponse.json({ message: "Visit not found" }, { status: 404 });
	}

	const collector = await prisma.user.findUnique({
		where: {
			nic: visit.collectorId,
		},
	});

	var manager = null;
	if (visit.managerId) {
		manager = await prisma.user.findUnique({
			where: {
				nic: visit.managerId,
			},
		});
	}

	const payments = await prisma.payment.findMany({
		where: {
			visitId: visitId,
		},
	});

	var total = 0;
	payments.forEach((payment) => {
		total += payment.amount;
	});

	return NextResponse.json({
		visit: visit,
		collector: collector,
		manager: manager,
		payments: payments,
		total: total,
	});
}