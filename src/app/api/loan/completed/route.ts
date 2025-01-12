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
                status:"completed"
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