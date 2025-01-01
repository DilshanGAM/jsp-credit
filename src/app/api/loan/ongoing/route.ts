import { NextRequest,NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function GET(req:NextRequest){
    const user = req.headers.get("user");
    if(!user){
        return NextResponse.json({message:"You are not logged in. Please log in again and try."},{status:403});
    }
    const userObj = JSON.parse(user);
    if(!userObj.role || (userObj.role !== "admin" && userObj.role !== "manager" && userObj.role !== "staff")){
        return NextResponse.json({message:"Only admins, managers and staff can start visits"},{status:403});
    }
    //get user nic from params
    const nic = req.nextUrl.searchParams.get("nic")||"";

    // get "active" loans by nic
    try{const loans = await prisma.loan.findMany({
        where:{
            customerId:nic,
            status:"active"
        }
    });

    return NextResponse.json(loans);}catch(e:any){
        return NextResponse.json({message:"Error fetching loans"},{status:500});
    }
}