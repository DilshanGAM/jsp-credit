import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
	try {
		// Get the user from the request header
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
				{ message: "Only admins and managers can start loans" },
				{ status: 403 }
			);
		}

		// Parse and validate the request payload
		const newLoan = await req.json();

		// Ensure numeric fields are properly parsed
		const loanData = {
			customerId: newLoan.customerId,
			amount: parseFloat(newLoan.amount),
			interestRate: parseFloat(newLoan.interestRate),
			durationDays: parseInt(newLoan.durationDays, 10),
			durationMonths: parseFloat(newLoan.durationMonths),
			interestAmount:
				parseFloat(newLoan.amount) *
				(parseFloat(newLoan.interestRate) / 100) *
				parseFloat(newLoan.durationMonths),
			totalAmount: parseFloat(newLoan.totalAmount),
			installmentAmount: parseFloat(newLoan.installmentAmount),
			issuedDate: new Date().toISOString(), // Store in ISO format
			issuedBy: userObj.nic,
			status: "active",
			paidAmount: 0,
		};

		console.log("Processed Loan Data:", loanData);

		// Create the loan record
		const loan = await prisma.loan.create({ data: loanData });
		return NextResponse.json(loan, { status: 201 });
	} catch (e:any) {
		return NextResponse.json(
			{ message: "Error creating loan", error: e.message },
			{ status: 500 }
		);
	}
}
//get Loans
export async function GET(req: NextRequest){
	//check if the user is logged in
	const user = req.headers.get("user");
	if (!user) {
		return NextResponse.json(
			{ message: "You are not logged in. Please log in again and try." },
			{ status: 403 }
		);
	}
	//if user is staff manager or admin retrieve all loans
	const userObj = JSON.parse(user);
	if (userObj.role === "staff" || userObj.role === "manager" || userObj.role === "admin") {
		const loans = await prisma.loan.findMany();
		return NextResponse.json(loans, { status: 200 });
	} else {
		//return the loans with the user's NIC in customer ID
		const loans = await prisma.loan.findMany({
			where: {
				customerId: userObj.nic,
			},
		});
		return NextResponse.json(loans, { status: 200 });
	}
}
//delete loan and all related records
//only admin can do this
export async function DELETE(req: NextRequest){
	//check if the user is logged in
	const user = req.headers.get("user");
	if (!user) {
		return NextResponse.json(
			{ message: "You are not logged in. Please log in again and try." },
			{ status: 403 }
		);
	}
	//if user is not admin return not authorized
	const userObj = JSON.parse(user);
	if (userObj.role !== "admin") {
		return NextResponse.json(
			{ message: "Only admins can delete loans" },
			{ status: 403 }
		);
	}
	//get the loan id from the url
	const query = req.nextUrl.searchParams.get("id")||"";
	//delete the loan
	try {
		const id:number = parseInt(query, 10);
		//delete all payments related to the loan
		await prisma.payment.deleteMany({
			where:{
				loanId:id
			}
		});
		await prisma.loan.delete({
			where:{
				id:id
			}
		});
		return NextResponse.json({ message: "Loan deleted" }, { status: 200 });
	} catch (e:any) {
		return NextResponse.json(
			{ message: "Error deleting loan", error: e.message },
			{ status: 500 }
		);
	}
}