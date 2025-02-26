import { NextRequest , NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    if (userObj.role === "manager" || userObj.role === "admin") {
        //get start and end date from the query
        const startDate = req.nextUrl.searchParams.get("startDate")||"1970-01-01";
        const endDate = req.nextUrl.searchParams.get("endDate")||"2100-01-01";
        //check if the dates are valid
        try {
            new Date(startDate);
            new Date(endDate);
        } catch (error) {
            return NextResponse.json({ message: "Invalid date" }, { status: 400 });
        }
        const summary = {
            totalIssued:0,
            totalCollection:0,
            totalLoanAmount:0,
            totalVisits:0,
            pendingAmount:0,
            totalLoans:0

        };
        //get the sum of all loans between the dates
        const sumIssued = await prisma.loan.aggregate({
            _sum : {
                amount:true
            },
            where:{
                issuedDate:{
                    gte:new Date(startDate),
                    lte:new Date(endDate)
                }
            }
        });
        const sumLoanAmount = await prisma.loan.aggregate({
            _sum : {
                totalAmount:true
            },
            where:{
                issuedDate:{
                    gte:new Date(startDate),
                    lte:new Date(endDate)
                }
            }
        });
        const sumCollection = await prisma.payment.aggregate({
            _sum : {
                amount:true
            },
            where:{
                paidDate:{
                    gte:new Date(startDate),
                    lte:new Date(endDate)
                }
            }
        });
        const sumVisits = await prisma.visit.count({
            where:{
                startDateTime:{
                    gte:new Date(startDate),
                    lte:new Date(endDate)
                }
            }
        });
        const totalLoans = await prisma.loan.count({
            where:{
                issuedDate:{
                    gte:new Date(startDate),
                    lte:new Date(endDate)
                }
            }
        })
        const pendingAmount =(sumLoanAmount?._sum.totalAmount||0)-(sumCollection?._sum.amount||0);
        summary.totalIssued = sumIssued?._sum.amount||0;
        summary.totalCollection = sumCollection?._sum.amount||0;
        summary.totalLoanAmount = sumLoanAmount?._sum.totalAmount||0;
        summary.totalVisits = sumVisits;
        summary.pendingAmount = pendingAmount;
        summary.totalLoans = totalLoans;
        return NextResponse.json({ summary }, { status: 200 });

    } else {
        
        return NextResponse.json(
            { message: "Only managers and admins can view the summary" },
            { status: 403 }
        );
    }
}