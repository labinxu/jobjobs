import { Cluster } from "puppeteer-cluster";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { env } from "../src/env";
puppeteer.use(StealthPlugin());
console.log(__dirname);
console.log(env.DATA_PATH);
const test_cluster_bot = async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_BROWSER,
        maxConcurrency: 2,
        puppeteerOptions: {
            headless: false,
        },
        puppeteer: puppeteer,
    });
    await cluster.task(async ({ page, data }) => {
        await page.goto(data.url);
        await page.screenshot({ path: `logs/images/${data.name}.jpg` });
    });
    cluster.queue({ name: "sannysoft", url: "https://bot.sannysoft.com/" });
    // cluster.queue("https://www.google.com.hk");
    //await cluster.idle();
    // await cluster.close();
};
test_cluster_bot();
