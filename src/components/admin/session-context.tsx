"use client";

import { createContext, useContext } from "react";

export interface SessionUser {
	email: string | null;
	name: string;
	role: "admin" | "manager";
	nic: string;
}

export const SessionContext = createContext<SessionUser | null>(null);

/** The signed-in admin or manager. AppShell renders pages only once this is known. */
export function useSession() {
	const user = useContext(SessionContext);
	if (!user) throw new Error("useSession must be used inside AppShell");
	// UI only: every API route does its own permission check.
	return { user, isAdmin: user.role === "admin" };
}
