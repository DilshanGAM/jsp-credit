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
    ///get page number from the query
    const pageData = req.nextUrl.searchParams.get("page") || 1;
    const limitData = req.nextUrl.searchParams.get("limit") || 10;

    const page = Number(pageData);
    const limit = Number(limitData);
    if (isNaN(page) || isNaN(limit)) {
        return NextResponse.json({ message: "Invalid page or limit" }, { status: 400 });
    }

    const total = await prisma.visit.count();
    const totalPages = Math.ceil(total / limit);

    //check if the user is a staff manager or admin
    const userObj = JSON.parse(user);
    if (!userObj.role || (userObj.role !== "admin" && userObj.role !== "manager" )) {
        return NextResponse.json({ message: "Only admins and managers can view all the visits" }, { status: 403 });
    }

    // Get all the visits in decending order by id
    const visits = await prisma.visit.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: {
            id: "desc"
        }
    });

    return NextResponse.json({visits , pageInfo : {
        page,
        limit,
        total,
        totalPages
    }},  { status: 200 });

}