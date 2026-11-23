import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { parseConfig, parseName } from "@/lib/analytics/layout";
import { requirePortalUser } from "@/lib/server-auth";

// Saved dashboards, shared by every admin and manager, and editable by any of them.
// Updates carry the version they were based on, so one person can't silently overwrite another.

const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

async function withNames<T extends { createdBy: string; updatedBy: string }>(rows: T[]) {
	const nics = [...new Set(rows.flatMap((r) => [r.createdBy, r.updatedBy]))];
	const users = await prisma.user.findMany({ where: { nic: { in: nics } }, select: { nic: true, name: true } });
	const names = new Map(users.map((u) => [u.nic, u.name]));
	return rows.map((r) => ({ ...r, createdByName: names.get(r.createdBy) ?? r.createdBy, updatedByName: names.get(r.updatedBy) ?? r.updatedBy }));
}

const duplicateName = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

function parseId(value: unknown) {
	const id = typeof value === "string" ? Number(value) : value;
	return Number.isInteger(id) && (id as number) > 0 ? (id as number) : null;
}

// GET: all layouts without their config; GET ?id=: one layout with it
export async function GET(req: NextRequest) {
	const user = requirePortalUser(req);
	if (user instanceof NextResponse) return user;

	const idParam = req.nextUrl.searchParams.get("id");
	if (idParam !== null) {
		const id = parseId(idParam);
		if (!id) return bad("id must be a positive whole number.");
		const layout = await prisma.dashboardLayout.findUnique({ where: { id } });
		if (!layout) return bad("Layout not found.", 404);
		return NextResponse.json((await withNames([layout]))[0]);
	}
	const layouts = await prisma.dashboardLayout.findMany({
		omit: { config: true },
		orderBy: [{ isDefault: "desc" }, { name: "asc" }],
	});
	return NextResponse.json(await withNames(layouts));
}

// POST { name, config }
export async function POST(req: NextRequest) {
	const user = requirePortalUser(req);
	if (user instanceof NextResponse) return user;
	const body = await req.json().catch(() => null);
	const name = parseName(body?.name);
	if (!name) return bad("Give the layout a name of up to 60 characters.");
	const config = parseConfig(body?.config);
	if (typeof config === "string") return bad(config);
	try {
		const created = await prisma.dashboardLayout.create({
			data: { name, config: config as unknown as Prisma.InputJsonValue, createdBy: user.nic, updatedBy: user.nic },
		});
		return NextResponse.json((await withNames([created]))[0], { status: 201 });
	} catch (e) {
		if (duplicateName(e)) return bad("A layout with this name already exists.", 409);
		throw e;
	}
}

// PUT { id, version, name?, config?, isDefault? }
export async function PUT(req: NextRequest) {
	const user = requirePortalUser(req);
	if (user instanceof NextResponse) return user;
	const body = await req.json().catch(() => null);
	const id = parseId(body?.id);
	const version = body?.version;
	if (!id || !Number.isInteger(version)) return bad("id and version are required.");

	const data: Prisma.DashboardLayoutUpdateManyMutationInput = {
		version: { increment: 1 },
		updatedBy: user.nic,
		updatedAt: new Date(),
	};
	if (body.name !== undefined) {
		const name = parseName(body.name);
		if (!name) return bad("Give the layout a name of up to 60 characters.");
		data.name = name;
	}
	if (body.config !== undefined) {
		const config = parseConfig(body.config);
		if (typeof config === "string") return bad(config);
		data.config = config as unknown as Prisma.InputJsonValue;
	}
	if (body.isDefault !== undefined) {
		if (body.isDefault !== true && body.isDefault !== false) return bad("isDefault must be true or false.");
		data.isDefault = body.isDefault;
	}

	try {
		const updated = await prisma.$transaction(async (tx) => {
			// Only succeeds if nobody saved since this version was loaded.
			const { count } = await tx.dashboardLayout.updateMany({ where: { id, version }, data });
			if (count === 0) return null;
			if (body.isDefault === true) {
				await tx.dashboardLayout.updateMany({ where: { id: { not: id }, isDefault: true }, data: { isDefault: false } });
			}
			return tx.dashboardLayout.findUniqueOrThrow({ where: { id } });
		});
		if (!updated) {
			const current = await prisma.dashboardLayout.findUnique({ where: { id }, select: { version: true, updatedBy: true } });
			if (!current) return bad("Layout not found.", 404);
			const [named] = await withNames([{ createdBy: current.updatedBy, updatedBy: current.updatedBy }]);
			return NextResponse.json(
				{ message: `${named.updatedByName} changed this layout after you opened it. Reload it to see their changes.`, version: current.version },
				{ status: 409 }
			);
		}
		return NextResponse.json((await withNames([updated]))[0]);
	} catch (e) {
		if (duplicateName(e)) return bad("A layout with this name already exists.", 409);
		throw e;
	}
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
	const user = requirePortalUser(req);
	if (user instanceof NextResponse) return user;
	const id = parseId(req.nextUrl.searchParams.get("id"));
	if (!id) return bad("id must be a positive whole number.");
	const { count } = await prisma.dashboardLayout.deleteMany({ where: { id } });
	if (count === 0) return bad("Layout not found.", 404);
	return NextResponse.json({ message: "Layout deleted" });
}
