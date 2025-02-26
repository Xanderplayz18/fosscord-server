/*
	Spacebar: A FOSS re-implementation and extension of the Discord.com backend.
	Copyright (C) 2023 Spacebar and Spacebar Contributors
	
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

import { Router, Request, Response } from "express";
import { route } from "@spacebar/api";
import { getIpAdress, IPAnalysis } from "@spacebar/api";
const router = Router();

router.get("/", route({}), async (req: Request, res: Response) => {
	//TODO
	//Note: It's most likely related to legal. At the moment Discord hasn't finished this too
	const country_code = (await IPAnalysis(getIpAdress(req))).country_code;
	res.json({
		consent_required: false,
		country_code: country_code,
		promotional_email_opt_in: { required: true, pre_checked: false },
	});
});

export default router;
