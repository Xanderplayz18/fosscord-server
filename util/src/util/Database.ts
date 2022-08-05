import path from "path";
import "reflect-metadata";
import { DataSource, createConnection } from "typeorm";
import * as Models from "../entities";
import { Migration } from "../entities/Migration";
import { yellow, green, red } from "picocolors";

// UUID extension option is only supported with postgres
// We want to generate all id's with Snowflakes that's why we have our own BaseEntity class

let promise: Promise<any>;
let dataSource: DataSource | undefined;
let dbConnectionString = process.env.DATABASE || path.join(process.cwd(), "database.db");
let verbose_db = false;

export async function initDatabase(): Promise<DataSource> {
	if (dataSource) return dataSource; // prevent initalizing multiple times

	const type = dbConnectionString.includes("://") ? dbConnectionString.split(":")[0]?.replace("+srv", "") : "sqlite" as any;
	const isSqlite = type.includes("sqlite");
	if(process.env.DB_VERBOSE) verbose_db = true;

	console.log(`[Database] ${yellow(`connecting to ${type} db`)}`);
	if(isSqlite)
		console.log(`[Database] ${red(`You are running sqlite! Please keep in mind that we recommend setting up a dedicated database!`)}`);
	if(verbose_db)
		console.log(`[Database] ${red(`Verbose database logging is enabled, this might impact performance! Unset VERBOSE_DB to disable.`)}`);
	// @ts-ignore
	dataSource = new DataSource({
		type,
        charset: 'utf8mb4',
		url: isSqlite ? undefined : dbConnectionString,
		database: isSqlite ? dbConnectionString : undefined,
		// @ts-ignore
		entities: Object.values(Models).filter((x) => x.constructor.name !== "Object" && x.name),
		synchronize: type !== "mongodb",
		logging: verbose_db,
		cache: {
			duration: 1000 * 3, // cache all find queries for 3 seconds
		},
		bigNumberStrings: false,
		supportBigNumbers: true,
		name: "default",
		migrations: [path.join(__dirname, "..", "migrations", "*.js")],
	});
	promise = dataSource.initialize();
	await promise;
	// run migrations, and if it is a new fresh database, set it to the last migration
	if (dataSource.migrations.length) {
		if (!(await Migration.findOne({}))) {
			let i = 0;

			await Migration.insert(
				dataSource.migrations.map((x) => ({
					id: i++,
					name: x.name,
					timestamp: Date.now(),
				}))
			);
		}
	}
	await dataSource.runMigrations();
	console.log(`[Database] ${green("connected")}`);

	return promise;
}

export { dataSource };

export function closeDatabase() {
	dataSource?.destroy();
}
