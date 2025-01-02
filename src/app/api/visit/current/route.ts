import { NextRequest , NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest){
    // Get the user from the request header
    const user = req.headers.get("user");
    if (!user) {
        return NextResponse.json({ message: "You are not logged in. Please log in again and try." }, { status: 403 });
    }

    //check if the user is a staff manager or admin
    const userObj = JSON.parse(user);
    if (!userObj.role || (userObj.role !== "admin" && userObj.role !== "manager" && userObj.role !== "staff")) {
        return NextResponse.json({ message: "Only admins, managers and staff can start visits" }, { status: 403 });
    }

    // Get one visit by user nic and status started
    const visits = await prisma.visit.findMany({
        where: {
            collectorId: userObj.nic,
            status: "started"
        }
    });

    //check if there multiple visits started by the user
    if(visits.length>1){
        return NextResponse.json({ message: "You have multiple visits started. Please complete them before starting a new one." }, { status: 403 });
    }

    //check if array is empty
    if(visits.length===0){
        return NextResponse.json({ message: "No visit started by you. Please start one to collect payments" }, { status: 404 });
    }



    return NextResponse.json(visits[0], { status: 200 });

}