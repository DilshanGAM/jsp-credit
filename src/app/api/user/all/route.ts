import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { UserType } from "@/types/user";

const prisma = new PrismaClient();
export async function GET(req:NextRequest){
    //if it is and admin search all users except customers
    //if it is a manager search all users except admin and customers
    //other wise send message with 403 status saying not authorized

    const user = req.headers.get("user");
    if(user){
        const userObj = JSON.parse(user) as UserType;
        if(userObj.role === "admin"){
            const usersList = await prisma.user.findMany({
                where:{
                    role:{
                        not:"customer"
                    }
                }
            });
            console.log(usersList);
            return NextResponse.json(usersList);
        }else if(userObj.role === "manager"){
            const usersList = await prisma.user.findMany({
                where:{
                    role:{
                        notIn:["customer","admin"]
                    }
                }
            });
            console.log(usersList);
            return NextResponse.json(usersList);
        }else{
            return NextResponse.json({message:"Not Authorized"},{status:403});
        }
    }
}