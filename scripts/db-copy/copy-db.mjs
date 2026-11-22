// Copies a Postgres database (e.g. production) over a LOCAL one.
//
//   node scripts/db-copy/copy-db.mjs                   copy SOURCE to TARGET
//   node scripts/db-copy/copy-db.mjs --dry-run         check both connections, write nothing
//   node scripts/db-copy/copy-db.mjs --yes             skip the confirmation
//   node scripts/db-copy/copy-db.mjs --restore <file>  put a backup back into TARGET
//
// Connection strings are read from .env.db-copy in the project root (created on first run).
//
// - SOURCE is only read.
// - TARGET must be on localhost. There is deliberately no override.
// - TARGET is backed up to scripts/db-copy/backups/, then replaced in one transaction:
//   on any error, including a row count mismatch, it is rolled back.
//
// Needs Node 20.12+ and Postgres client tools at least as new as the source server.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(HERE, "..", "..", ".env.db-copy");
const BACKUP_DIR = path.join(HERE, "backups");

const CONFIG_TEMPLATE = `# Settings for: node scripts/db-copy/copy-db.mjs
# Keep the quotes. In passwords, URL-encode special characters (@ is %40, # is %23).

# Copy FROM here (only read). Use the direct connection string, not a pooled one.
# Example: "postgresql://user:password@prod-host:5432/dbname?sslmode=require"
SOURCE_DATABASE_URL=""

# Copy INTO here (OVERWRITTEN). Must be localhost. Created if it doesn't exist.
# Example: "postgresql://postgres:password@localhost:5432/jsp_credit"
TARGET_DATABASE_URL=""

# Optional: folder containing pg_dump, if it isn't detected.
PG_BIN=""
`;

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "::1"];

// URL parameters that libpq understands, and the variables that carry them.
const SOURCE_PARAMS = {
	sslmode: "PGSSLMODE",
	sslrootcert: "PGSSLROOTCERT",
	channel_binding: "PGCHANNELBINDING",
	options: "PGOPTIONS",
};

// These parameters can redirect a connection whatever host the URL shows.
const REDIRECT_PARAMS = ["host", "hostaddr", "port", "dbname", "service", "user"];

// Not restored: the schema is recreated by this script, and the others refer to
// roles or replication setups that only exist on the hosted server.
const SKIPPED_ENTRIES = /^\d+; \d+ \d+ (SCHEMA - |POLICY |ROW SECURITY |PUBLICATION TABLE )/;

const abort = new AbortController();
process.on("SIGINT", () => abort.abort());

function parseConnection(name, value) {
	if (!value) throw new Error(`${name} is empty. Fill it in here: ${path.resolve(CONFIG_FILE)}`);

	let url, user, password, database;
	try {
		url = new URL(value);
		user = decodeURIComponent(url.username);
		password = decodeURIComponent(url.password);
		database = decodeURIComponent(url.pathname.slice(1));
	} catch {
		// The original error is dropped because it contains the password.
		throw new Error(`${name} is not a valid URL. Are special characters in the password URL-encoded?`);
	}

	if (!["postgres:", "postgresql:"].includes(url.protocol)) {
		throw new Error(`${name} must start with postgresql:// (Accelerate and prisma:// URLs won't work).`);
	}
	if (url.hash) throw new Error(`${name} contains a raw "#". Write it as %23.`);

	for (const key of url.searchParams.keys()) {
		if (REDIRECT_PARAMS.includes(key.toLowerCase())) {
			throw new Error(`${name} must not use the "${key}" URL parameter. Put it in the main part of the URL.`);
		}
	}

	const host = url.hostname.replace(/^\[|\]$/g, "");
	if (!host || !user || !database) throw new Error(`${name} needs a user, host and database name.`);
	// libpq can treat a database name containing "=" or "://" as a whole connection string.
	if (!/^[\w-]+$/.test(database)) {
		throw new Error(`${name}: database names may only contain letters, digits, _ and -.`);
	}

	const schema = url.searchParams.get("schema") || "public";
	if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`${name} has an unsupported schema name.`);

	const port = url.port || "5432";
	return { host, port, user, password, database, schema, params: url.searchParams };
}

// Built from scratch, so a stray PGHOSTADDR or PGSERVICE in the shell can't redirect a connection.
function connectionEnv(db, paramMap = {}) {
	const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG/i.test(key)));
	Object.assign(env, {
		PGHOST: db.host,
		PGPORT: db.port,
		PGUSER: db.user,
		PGDATABASE: db.database,
		PGCONNECT_TIMEOUT: "15",
		PGCLIENTENCODING: "UTF8",
	});
	if (db.password) env.PGPASSWORD = db.password; // not in argv, where other processes could see it
	for (const [param, variable] of Object.entries(paramMap)) {
		if (db.params.has(param)) env[variable] = db.params.get(param);
	}
	return env;
}

function findBinDir(configured) {
	const exe = process.platform === "win32" ? "pg_dump.exe" : "pg_dump";
	if (configured) {
		if (!fs.existsSync(path.join(configured, exe))) throw new Error(`PG_BIN has no ${exe}: ${configured}`);
		return configured;
	}
	const root = path.join(process.env.ProgramFiles ?? "", "PostgreSQL");
	if (process.platform === "win32" && fs.existsSync(root)) {
		const newest = fs
			.readdirSync(root)
			.filter((version) => fs.existsSync(path.join(root, version, "bin", exe)))
			.sort((a, b) => Number(b) - Number(a))[0];
		if (newest) return path.join(root, newest, "bin");
	}
	return ""; // use PATH
}

function createRunner(binDir) {
	return (tool, args, env) =>
		new Promise((resolve, reject) => {
			abort.signal.throwIfAborted();
			const child = spawn(binDir ? path.join(binDir, tool) : tool, args, {
				env,
				signal: abort.signal,
				stdio: ["ignore", "pipe", "pipe"],
			});
			let stdout = "";
			let stderr = "";
			let failure;
			child.stdout.setEncoding("utf8").on("data", (text) => (stdout += text));
			child.stderr.setEncoding("utf8").on("data", (text) => (stderr += text));
			child.on("error", (error) => (failure = error));
			// Settle on close, so temporary files are no longer in use when they get deleted.
			child.on("close", (code) => {
				if (failure?.code === "ENOENT") reject(new Error(`${tool} not found. Set PG_BIN in .env.db-copy.`));
				else if (failure) reject(failure);
				else if (code !== 0) reject(new Error(`${tool} failed:\n${stderr.trim()}`));
				else resolve(stdout.trim());
			});
		});
}

function query(run, env, sql) {
	return run("psql", ["-X", "-w", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], env);
}

function dumpSchema(run, env, schema, file) {
	const args = ["-w", "-Fc", "--no-owner", "--no-acl", "-n", schema, "-f", file];
	return run("pg_dump", args, env);
}

// Counts rows in the dump itself. Querying the live source would give false mismatches
// whenever someone records a payment during the copy.
async function countRows(sqlFile) {
	const counts = new Map();
	let table = null;
	let rest = Buffer.alloc(0);

	// Split on \n by hand: readline also splits on U+2028, which can appear inside data.
	for await (const chunk of fs.createReadStream(sqlFile)) {
		const data = Buffer.concat([rest, chunk]);
		let start = 0;
		let end;
		while ((end = data.indexOf(10, start)) !== -1) {
			const line = data.toString("utf8", start, end).replace(/\r$/, "");
			start = end + 1;
			if (table !== null) {
				if (line === "\\.") table = null;
				else counts.set(table, counts.get(table) + 1);
			} else {
				const copy = /^COPY (.+?) (?:\(.*\) )?FROM stdin;$/.exec(line);
				if (copy) {
					table = copy[1];
					counts.set(table, 0);
				}
			}
		}
		rest = data.subarray(start);
	}
	return counts;
}

async function prepareRestore(run, env, archive, schema, workDir) {
	const list = await run("pg_restore", ["-l", archive], env);
	const entries = list.split(/\r?\n/);
	if (!entries.some((line) => line.includes(` TABLE ${schema} `))) {
		throw new Error(`No tables found in schema "${schema}". Refusing to replace TARGET with nothing.`);
	}

	const listFile = path.join(workDir, "contents.list");
	const before = path.join(workDir, "before.sql");
	const data = path.join(workDir, "data.sql");
	const after = path.join(workDir, "after.sql");

	fs.writeFileSync(listFile, entries.filter((line) => !SKIPPED_ENTRIES.test(line)).join("\n") + "\n");
	await run("pg_restore", ["--no-owner", "--no-acl", "--no-comments", "-L", listFile, "-f", data, archive], env);

	fs.writeFileSync(
		before,
		`SET lock_timeout = '15s';
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS "${schema}" CASCADE;
CREATE SCHEMA "${schema}";
`,
	);

	// These run inside the restore transaction, so a mismatch undoes the whole replacement.
	const counts = await countRows(data);
	const checks = [...counts].map(
		([table, expected]) => `DO $check$ BEGIN
	IF (SELECT count(*) FROM ${table}) <> ${expected} THEN
		RAISE EXCEPTION 'row count mismatch, expected ${expected} in ${table.replaceAll("'", "''")}';
	END IF;
END $check$;
`,
	);
	fs.writeFileSync(after, checks.join(""));

	return { files: [before, data, after], counts };
}

async function confirm(database) {
	if (!process.stdin.isTTY) throw new Error("Can't ask for confirmation here. Pass --yes to proceed.");
	const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
	prompt.on("SIGINT", () => abort.abort());
	try {
		const answer = await prompt.question(`Type the target database name (${database}) to overwrite it: `, {
			signal: abort.signal,
		});
		if (answer.trim() !== database) throw new Error("Name didn't match. Nothing was changed.");
	} finally {
		prompt.close();
	}
}

async function main() {
	const { values: options } = parseArgs({
		options: {
			"dry-run": { type: "boolean" },
			yes: { type: "boolean" },
			restore: { type: "string" },
		},
	});

	if (!fs.existsSync(CONFIG_FILE)) {
		fs.writeFileSync(CONFIG_FILE, CONFIG_TEMPLATE, { flag: "wx", mode: 0o600 });
		console.log(`Created ${path.resolve(CONFIG_FILE)}. Fill it in and run this again.`);
		return;
	}
	const config = parseEnv(fs.readFileSync(CONFIG_FILE, "utf8"));

	const target = parseConnection("TARGET_DATABASE_URL", config.TARGET_DATABASE_URL);
	if (!LOOPBACK_HOSTS.includes(target.host)) {
		throw new Error(`TARGET host "${target.host}" is not local. Refusing to overwrite it. Are the strings swapped?`);
	}

	const restoreFile = options.restore && path.resolve(options.restore);
	if (restoreFile && !fs.existsSync(restoreFile)) throw new Error(`No such backup: ${restoreFile}`);

	const source = restoreFile ? null : parseConnection("SOURCE_DATABASE_URL", config.SOURCE_DATABASE_URL);
	if (source && source.schema !== target.schema) {
		throw new Error("SOURCE and TARGET must use the same ?schema= (default: public).");
	}

	const run = createRunner(findBinDir(config.PG_BIN));
	const targetEnv = connectionEnv(target);
	const adminEnv = connectionEnv({ ...target, database: "postgres" });
	const sourceEnv = source && connectionEnv(source, SOURCE_PARAMS);

	console.log("Checking connections...");
	const encoding = await query(
		run,
		adminEnv,
		`SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = '${target.database}'`,
	);
	const targetExists = encoding !== "";
	if (targetExists && encoding !== "UTF8") {
		throw new Error(`TARGET uses ${encoding}, not UTF8. Use a new database name and it will be created as UTF8.`);
	}

	if (source) {
		// Comparing the servers themselves catches aliases and tunnels that comparing URLs would miss.
		const identity =
			"SELECT extract(epoch FROM pg_postmaster_start_time())::text || '/' || oid FROM pg_database WHERE datname = current_database()";
		const sourceId = await query(run, sourceEnv, identity);
		if (targetExists && sourceId === (await query(run, targetEnv, identity))) {
			throw new Error("SOURCE and TARGET are the same database. Refusing to continue.");
		}
	}

	const from = source ? `${source.host}:${source.port}/${source.database}` : restoreFile;
	console.log(`
  FROM  ${from}
  INTO  ${target.host}:${target.port}/${target.database}  ${targetExists ? "(will be OVERWRITTEN)" : "(will be created)"}
  Schema: ${target.schema}
`);
	if (options["dry-run"]) {
		console.log("Dry run: connections are OK. Nothing was changed.");
		return;
	}
	if (!options.yes) await confirm(target.database);

	const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "db-copy-"));
	try {
		let archive = restoreFile;
		if (source) {
			console.log("Reading source...");
			archive = path.join(workDir, "source.dump");
			await dumpSchema(run, sourceEnv, source.schema, archive);
		}
		const { files, counts } = await prepareRestore(run, targetEnv, archive, target.schema, workDir);

		if (!targetExists) {
			console.log("Creating local database...");
			await query(run, adminEnv, `CREATE DATABASE "${target.database}" ENCODING 'UTF8' TEMPLATE template0`);
		} else {
			const tables = await query(
				run,
				targetEnv,
				`SELECT count(*) FROM pg_tables WHERE schemaname = '${target.schema}'`,
			);
			if (tables !== "0") {
				fs.mkdirSync(BACKUP_DIR, { recursive: true });
				const stamp = new Date().toISOString().replace(/[:.]/g, "-");
				const backup = path.join(BACKUP_DIR, `${target.database}-${stamp}.dump`);
				await dumpSchema(run, targetEnv, target.schema, backup);
				console.log(`Backed up local database to ${backup}`);
			}
		}

		console.log("Replacing local data...");
		const fileArgs = files.flatMap((file) => ["-f", file]);
		await run("psql", ["-X", "-w", "-q", "-v", "ON_ERROR_STOP=1", "--single-transaction", ...fileArgs], targetEnv);

		console.table([...counts].map(([table, rows]) => ({ table, rows })));
		console.log("Done, row counts verified. Restart the dev server if it is running.");
	} finally {
		// Holds a plain-text copy of customer data.
		fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 5 });
	}
}

main().catch((error) => {
	console.error(abort.signal.aborted ? "\nCancelled." : `\nERROR: ${error.message}`);
	process.exitCode = 1;
});
