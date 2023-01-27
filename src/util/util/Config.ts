/*
	Fosscord: A FOSS re-implementation and extension of the Discord.com backend.
	Copyright (C) 2023 Fosscord and Fosscord Contributors
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published
	by the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ConfigEntity } from "../entities/Config";
import fs from "fs/promises";
import { existsSync } from "fs";
import { ConfigValue } from "../config";
import { OrmUtils } from "..";
import { DeepPartial } from "typeorm";

// TODO: yaml instead of json
const overridePath = process.env.CONFIG_PATH ?? "";

let config: ConfigValue;
let pairs: ConfigEntity[];

// TODO: use events to inform about config updates
// Config keys are separated with _

export const Config = {
	init: async function init() {
		if (config) return config;
		console.log("[Config] Loading configuration...");
		if (!process.env.CONFIG_PATH) {
			pairs = await ConfigEntity.find();
			config = pairsToConfig(pairs);
		} else {
			console.log(`[Config] Using CONFIG_PATH rather than database`);
			if (existsSync(process.env.CONFIG_PATH)) {
				const file = JSON.parse(
					(await fs.readFile(process.env.CONFIG_PATH)).toString(),
				);
				config = file;
			} else config = new ConfigValue();
			pairs = generatePairs(config);
		}

		// If a config doesn't exist, create it.
		if (Object.keys(config).length == 0) config = new ConfigValue();

		config = OrmUtils.mergeDeep({}, { ...new ConfigValue() }, config);

		return this.set(config);
	},
	get: function get() {
		if (!config) {
			// If we haven't initialised the config yet, return default config.
			// Typeorm instantiates each entity once when initising database,
			// which means when we use config values as default values in entity classes,
			// the config isn't initialised yet and would throw an error about the config being undefined.

			return new ConfigValue();
		}

		return config;
	},
	set: function set(val: DeepPartial<ConfigValue>) {
		if (!config || !val) return;
		config = OrmUtils.mergeDeep({}, { ...config }, val);

		return applyConfig(config);
	},
};

// TODO: better types
const generatePairs = (obj: object | null, key = ""): ConfigEntity[] => {
	if (typeof obj == "object" && obj != null) {
		return Object.keys(obj)
			.map((k) =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				generatePairs((obj as any)[k], key ? `${key}_${k}` : k),
			)
			.flat();
	}

	const ret = new ConfigEntity();
	ret.key = key;
	ret.value = obj;
	return [ret];
};

async function applyConfig(val: ConfigValue) {
	if (process.env.CONFIG_PATH)
		await fs.writeFile(overridePath, JSON.stringify(val, null, 4));
	else {
		const pairs = generatePairs(val);
		await Promise.all(pairs.map((pair) => pair.save()));
	}
	return val;
}

function pairsToConfig(pairs: ConfigEntity[]) {
	// TODO: typings
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const value: any = {};

	pairs.forEach((p) => {
		const keys = p.key.split("_");
		let obj = value;
		let prev = "";
		let prevObj = obj;
		let i = 0;

		for (const key of keys) {
			if (!isNaN(Number(key)) && !prevObj[prev]?.length)
				prevObj[prev] = obj = [];
			if (i++ === keys.length - 1) obj[key] = p.value;
			else if (!obj[key]) obj[key] = {};

			prev = key;
			prevObj = obj;
			obj = obj[key];
		}
	});

	return value as ConfigValue;
}
