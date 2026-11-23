import { NextRequest, NextResponse } from "next/server";

export interface PortalUser {
	nic: string;
	name: string;
	email: string | null;
	role: "admin" | "manager";
}

/**
 * For new routes only. The middleware puts the verified token's payload in the "user" header
 * (and rejects requests that send their own). Returns the user, or a response to send back.
 */
export function requirePortalUser(req: NextRequest): PortalUser | NextResponse {
	const header = req.headers.get("user");
	if (!header) {
		return NextResponse.json({ message: "You are not logged in. Please log in again and try." }, { status: 401 });
	}
	const user = JSON.parse(header);
	if (user.role !== "admin" && user.role !== "manager") {
		return NextResponse.json({ message: "Only admins and managers can do this." }, { status: 403 });
	}
	return { nic: String(user.nic), name: String(user.name), email: user.email ?? null, role: user.role };
}
