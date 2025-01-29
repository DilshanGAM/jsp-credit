import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");
    const status = req.nextUrl.searchParams.get("status");

    console.log("Received params:", { startDate, endDate, status });

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: "Start date and end date are required" 
      }, { status: 400 });
    }

    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const where: any = {
      issuedDate: {
        gte: startDateTime.toISOString(),
        lte: endDateTime.toISOString()
      }
    };

    // Add status filter if not 'all'
    if (status && status !== 'all') {
      where.status = status;
    }

    const loans = await prisma.loan.findMany({ where });

    console.log(`Found ${loans.length} loans`);
    return NextResponse.json(loans);

  } catch (error) {
    console.error("Server error details:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}