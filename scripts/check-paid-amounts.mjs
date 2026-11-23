// Read-only check: compares each loan's stored paidAmount with the sum of its payments.
// Usage: node scripts/check-paid-amounts.mjs   (uses DATABASE_URL from .env, like the app)
//
// paidAmount is a running total kept by POST /api/payment. Before payments were made
// transactional, simultaneous or failed payments could leave it wrong. This only reports.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	// Read-only transaction, and exact decimal sums rather than floating point.
	const rows = await prisma.$transaction(async (tx) => {
		await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
		return tx.$queryRaw`
			SELECT l.id,
			       l."customerId" AS customer,
			       l.status,
			       l."paidAmount"::numeric(14, 2) AS stored,
			       COALESCE(SUM(p.amount), 0)::numeric(14, 2) AS payments,
			       COUNT(p.id)::int AS count
			FROM "Loan" l
			LEFT JOIN payment p ON p."loanId" = l.id
			GROUP BY l.id
			ORDER BY l.id`;
	});

	const wrong = rows.filter((r) => r.stored.toString() !== r.payments.toString());
	console.log(`Checked ${rows.length} loans: ${wrong.length} with paidAmount different from their payments.`);
	if (wrong.length) {
		console.table(
			wrong.map((r) => ({
				loan: r.id,
				customer: r.customer,
				status: r.status,
				"paidAmount (stored)": r.stored.toString(),
				"sum of payments": r.payments.toString(),
				difference: (Number(r.stored) - Number(r.payments)).toFixed(2),
				payments: r.count,
			}))
		);
		console.log("Nothing was changed. Fixing these needs a separate, approved update.");
	}
}

main()
	.catch((e) => {
		console.error(e.message);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
