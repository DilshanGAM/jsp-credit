import { NextRequest , NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest){
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

    // Check if there any visits already started by the user
    const existingVisit = await prisma.visit.findFirst({
        where: {
            collectorId: userObj.nic,
            status: "started"
        }
    });

    if (existingVisit) {
        return NextResponse.json({ message: "You have already started a visit. Please complete it before starting a new one." }, { status: 403 });
    }

    const visit = await prisma.visit.create({
        data: {
            collectorId: userObj.nic
        }
    });

    return NextResponse.json(visit, { status: 201 });

}

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

    // Get all the visits
    const visits = await prisma.visit.findMany();

    return NextResponse.json(visits, { status: 200 });

}