// @ts-nocheck
import bodyParser from "body-parser";
import { Router } from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import crypto from "crypto";

const router = Router();

type crawled = {
	id: string;
	ogTitle: string;
	ogType: string;
	ogDescription: string;
	ogUrl: string;
	cachedImage: string;
};

const DEFAULT_FETCH_OPTIONS: any = {
	redirect: "follow",
	follow: 1,
	headers: {
		"user-agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
	},
	size: 1024 * 1024 * 8,
	compress: true,
	method: "GET",
};

router.post("/", bodyParser.json(), async (req, res) => {
	if (!req.body) throw new Error("Invalid Body (url missing) \nExample: url:https://discord.com");

	const { url } = req.body;

	const hash = crypto.createHash("md5").update(url).digest("hex");

	try {
		const request = await fetch(url, DEFAULT_FETCH_OPTIONS);

		const text = await request.text();
		const $ = cheerio.load(text);

		const ogTitle = $('meta[property="og:title"]').attr("content");
		const ogDescription = $('meta[property="og:description"]').attr("content");
		const ogImage = $('meta[property="og:image"]').attr("content");
		const ogUrl = $('meta[property="og:url"]').attr("content");
		const ogType = $('meta[property="og:type"]').attr("content");

		const filename = new URL(url).host.split(".")[0];

		const ImageResponse = await fetch(ogImage, DEFAULT_FETCH_OPTIONS);
		const ImageType = ImageResponse.headers.get("content-type");
		const ImageExtension = ImageType?.split("/")[1];
		const ImageResponseBuffer = (await ImageResponse.buffer()).toString("base64");
		const cachedImage = `/external/${ID}/${filename}.${ImageExtension}`;

		await db.data.externals.push({ image: ImageResponseBuffer, id: ID, type: ImageType });

		const new_cache_entry: crawled = { id: ID, ogTitle, ogDescription, cachedImage, ogUrl, ogType };
		await db.data.crawler.push(new_cache_entry);

		res.send(new_cache_entry);
	} catch (error) {
		console.log(error);

		throw new Error("Couldn't fetch website");
	}
});

router.get("/:id/:filename", async (req, res) => {
	const { id, filename } = req.params;
	const { image, type } = await db.data.externals({ id: id }).get();
	const imageBuffer = Buffer.from(image, "base64");

	res.set("Content-Type", type);
	res.send(imageBuffer);
});

export default router;
