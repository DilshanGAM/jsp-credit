import { NextRequest,NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function GET(req:NextRequest){

    const user = req.headers.get("user");
    
    const query = req.nextUrl.searchParams.get("query")||"";

    if(user){
        const userObj = JSON.parse(user);
        if(userObj.role === "admin"||userObj.role === "manager"){
            const usersList = await prisma.user.findMany({
                take:10,
                where:{
                    OR:[
                        {
                            email:{
                                contains:query
                            }
                        },
                        {
                            name:{
                                contains:query
                            }
                        },
                        {
                            nic:{
                                contains:query
                            }
                        }
                    ]
                }
            });
            return NextResponse.json(usersList);        
        }else{
            return NextResponse.json({message:"Not Authorized"},{status:403});
        }
    }
    
}