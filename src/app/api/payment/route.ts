import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
	const collector = req.headers.get("user");
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

		//add paid amonunt to the loan number and edit it
		const loan = await prisma.loan.findFirst({
			where: {
				id: data.loanId,
			},
		});
		if (!loan) {
			return NextResponse.json({ message: "Loan not found" }, { status: 404 });
		}
		//update loan
		const updatedLoan = await prisma.loan.update({
			where: {
				id: data.loanId,
			},
			data: {
				paidAmount: loan.paidAmount + data.amount,
			},
		});

		//add the payment]
		/*
        model payment{
  id Int @id @default(autoincrement())
  loanId Int
  loan Loan @relation(fields: [loanId], references: [id])
  amount Float
  visitId Int
  visit visit @relation(fields: [visitId], references: [id])
  paidDate DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
}
        */
		const payment = await prisma.payment.create({
            data:{
                loanId: data.loanId,
                amount: data.amount,
                visitId: visit.id
            }
        })

        //create a json with rest payment, end date, total amount, paid amount loan id and visit id and collectors name
        const restPayment = loan.totalAmount - updatedLoan.paidAmount;
        const endDate = new Date(loan.issuedDate);
        const numberOfInstallemnts = Math.ceil(restPayment / loan.installmentAmount);
        const paidAmount = updatedLoan.paidAmount;
        const collectorName = collectorObj.name;

        return NextResponse.json({
            restPayment,
            endDate,
            numberOfInstallemnts,
            paidAmount,
            loanId: data.loanId,
            visitId: visit.id,
            collectorName
        })

	}
}
