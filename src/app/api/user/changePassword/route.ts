import { NextRequest , NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
    const user = request.headers.get("user");

    if(!user){
        return NextResponse.json({message:"You are not logged in. Please log in again and try."},{status:403});
    }

    const userObj = JSON.parse(user);
    const { email, password ,confirmPassword } = await request.json();

    if((!userObj.role||(userObj.role!=="admin"))&&userObj.email!==email){
        return NextResponse.json({message:"Only admins can change others passwords"},{status:403});
    }
    
    const updatingUser = await prisma.user.findFirst({
        where: {
            email
        }
    });
    if (!updatingUser) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    if (password !== confirmPassword) {
        return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await prisma.user.update({
            where: {
                email
            },
            data: {
                password: hashedPassword
            }
        });
        return NextResponse.json({ message: "Password updated successfully" });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }

}