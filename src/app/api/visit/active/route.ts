import { NextRequest,NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req:NextRequest){
    
    const user = req.headers.get("user");

    if(!user){
        return NextResponse.json({message:"You are not logged in. Please log in again and try."},{status:403});
    }

    const userObj = JSON.parse(user);

    if(!userObj.role||(userObj.role!=="admin"&&userObj.role!=="manager")){
        return NextResponse.json({message:"Only admins, managers and staff can start visits"},{status:403});
    }
    //get all visits that are active
    const visits = await prisma.visit.findMany({
        where:{
            status:"started"
        }
    });

    return NextResponse.json(visits);


}