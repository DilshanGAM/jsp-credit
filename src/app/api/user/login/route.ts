import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as jose from "jose";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
export async function POST(req: NextRequest) {
	//get the email and password from the request body
	const { email, password } = await req.json();
	//find the user in the database
	const user = await prisma.user.findFirst({
		where: {
			email: email,
		},
	});
	//check if the user exists
	if (user) {
		//compare the password
		const match = await bcrypt.compare(password, user.password);
		if (match) {
			//generate jwt token
			if (user.status !== "active") {
				return NextResponse.json(
					{
						message:
							"Account is in " +
							user.status +
							" mode. Please contact the admin!",
					},
					{ status: 401 }
				);
			}
			const payload = {
				email: user.email,
				name: user.name,
				phone: user.phone,
				role: user.role,
                nic: user.nic,
			};
			const token = await new jose.SignJWT(payload)
				.setProtectedHeader({ alg: "HS256" })
				.setExpirationTime("48h")
				.sign(new TextEncoder().encode(process.env.JOSE_SECRET));
			return NextResponse.json(
				{
					token,
					user: payload,
					message: "Login successful",
				},
				{
					status: 200,
				}
			);
		} else {
			return NextResponse.json(
				{
					message: "Invalid password",
				},
				{
					status: 401,
				}
			);
		}
	} else {
		return NextResponse.json(
            {
                message: "User not found",
            },
            {
                status: 404,
            }
        );
	}
}
