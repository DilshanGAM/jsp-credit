import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
	if (userObj.role === "admin") {

		//loans paid_amount>=loan_amount
		const loans = await prisma.loan.findMany({
			where:{
				paidAmount:{
					gte:prisma.loan.fields.totalAmount
				},
				status:"active"
			}
		});
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
//update loan status to completed
//only admin can do this
export async function PUT(req: NextRequest){
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
			{ message: "Only admins can complete loans" },
			{ status: 403 }
		);
	}
	//get the loan id from the url
	const query = req.nextUrl.searchParams.get("id")||"";
	//update the loan
	try {
		const id:number = parseInt(query, 10);
		await prisma.loan.update({
			where:{
				id:id
			},
			data:{
				status:"completed"
			}
		});
		return NextResponse.json({ message: "Loan completed" }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ message: "Failed to complete loan" }, { status: 500 });
	}
}
