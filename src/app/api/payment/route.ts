import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
	try{const collector = req.headers.get("user");
	if (!collector) {
		return NextResponse.json(
			{ message: "You are not logged in. Please log in again and try." },
			{ status: 403 }
		);
	}
	const collectorObj = JSON.parse(collector);
	//check if the collector is a staff manager or admin or manager
	if (
		!collectorObj.role ||
		(collectorObj.role !== "admin" &&
			collectorObj.role !== "manager" &&
			collectorObj.role !== "staff")
	) {
		return NextResponse.json(
			{ message: "Only admins, managers and staff can start visits" },
			{ status: 403 }
		);
	}

	//get the collectors visits
	const visits = await prisma.visit.findMany({
		where: {
			collectorId: collectorObj.nic,
			status: "started",
		},
	});
	//see whether multiple visits are started
	if (visits.length > 1) {
		return NextResponse.json(
			{ message: "You have multiple visits please contact the admin" },
			{ status: 403 }
		);
	}
	if (visits.length === 1) {
		const visit = visits[0];

		const data = await req.json();

		//check if there loanId, amount
		if (!data.loanId || !data.amount) {
			return NextResponse.json(
				{ message: "Please provide loanId and amount" },
				{ status: 400 }
			);
		}

		if (Number(data.amount) < 0) {
			return NextResponse.json(
				{ message: "Amount must be greater than zero" },
				{ status: 400 }
			);
		}

		// One transaction, and the database does the addition: otherwise simultaneous
		// payments overwrite each other, and a failed insert leaves paidAmount already raised.
		const result = await prisma.$transaction(async (tx) => {
			const loan = await tx.loan.findFirst({
				where: {
					id: data.loanId,
				},
			});
			if (!loan) return null;
			const updatedLoan = await tx.loan.update({
				where: {
					id: data.loanId,
				},
				data: {
					paidAmount: { increment: data.amount },
				},
			});
			const payment = await tx.payment.create({
				data: {
					loanId: data.loanId,
					amount: data.amount,
					visitId: visit.id,
				},
			});
			return { loan, updatedLoan, payment };
		});
		if (!result) {
			return NextResponse.json({ message: "Loan not found" }, { status: 404 });
		}
		const { loan, updatedLoan, payment } = result;

        //create a json with rest payment, end date, total amount, paid amount loan id and visit id and collectors name
        const restPayment = loan.totalAmount - updatedLoan.paidAmount;
        const endDate = new Date(loan.issuedDate);
        const paidAmount = updatedLoan.paidAmount;
        const collectorName = collectorObj.name;
		const customer = await prisma.user.findFirst({
			where: {
				nic: loan.customerId,
			},
		});


        return NextResponse.json({
			customerId: loan.customerId,
			customerName: customer?.name,
			payment: data.amount,
			recieptNumber: payment.id,
            restPayment,
            endDate,
            numberOfInstallemnts:loan.durationDays,
            paidAmount,
            loanId: data.loanId,
            visitId: visit.id,
            collectorName
        })

	}}catch(e:any){
        return NextResponse.json({message: e.message, error: e.message}, {status: 500})
    }
}
