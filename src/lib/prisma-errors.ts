// Prisma error messages quote the query's arguments, so a failed write of a password
// would put it in the server log. Rethrow with only the error type and code.
export function hideQueryArgs(e: any): never {
	throw new Error(["User write failed:", e?.name, e?.code].filter(Boolean).join(" "));
}
