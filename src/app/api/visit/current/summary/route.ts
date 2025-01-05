import { NextRequest,NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function GET(req:NextRequest){
    //get the user from the headers
    const user = req.headers.get("user");

    if(!user){
        return NextResponse.json({message:"You are not logged in. Please log in again and try."},{status:403});
    }
    const userObj = JSON.parse(user);

    //check if there is a started visit
    const visit = await prisma.visit.findMany({
        where:{
            collectorId:userObj.nic,
            status:"started"
        }
    });

    //if there is no started visit
    if(visit.length === 0){
        return NextResponse.json({message:"No started visit found"},{status:404});
    }

    //if there are multiple started visits
    if(visit.length > 1){
        return NextResponse.json({message:"Multiple visits found"},{status:400});
    }

    //get the visit
    const currentVisit = visit[0];

    //get the payments
    const payments = await prisma.payment.findMany({
        where:{
            visitId:currentVisit.id
        }
    });

    let total = 0;
    payments.forEach((payment)=>{
        total += payment.amount;
    });

    return NextResponse.json({total, payments, visit:currentVisit});

}