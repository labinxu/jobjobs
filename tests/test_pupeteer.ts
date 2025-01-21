import { rejects } from "assert";
import { resolve } from "dns";
import { Cluster } from "puppeteer-cluster";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

//import { env } from "../src/env";
puppeteer.use(StealthPlugin());
// console.log(__dirname);
// console.log(env.DATA_PATH);
const test_cluster_bot = async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 2,
        puppeteerOptions: {
            headless: true,
        },
        puppeteer: puppeteer,
    });
    await cluster.task(async ({ page, data }) => {
        return new Promise(async (resolve, reject) => {
            try {
                await page.goto(data.url, {
                    waitUntil: "domcontentloaded",
                });
                resolve([`result for ${data.name}`]);
            } catch (err) {
                reject(err);
            }
        });
    });
    const cities = [
        { name: "sanny", url: "https://bot.sannysoft.com/" },
        { name: "google", url: "https://www.google.com.hk" },
    ];
    const results = await Promise.allSettled(
        cities.map(async (city) => {
            return cluster.execute(city);
        }),
    );
    const rr = results
        .filter((p) => p.status === "fulfilled")
        .map((p) => p.value)
        .reduce((acc, current) => acc.concat(current), []);
    console.log(rr);
    // cluster
    //     .execute({
    //         name: "sannysoft",
    //         url: "https://bot.sannysoft.com/",
    //     })
    //     .then((result) => {
    //         console.log(`sannysoft result:${result}`);
    //     });
    // console.log("execute google task");
    // cluster
    //     .execute({
    //         name: "google",
    //         url: "https://www.google.com.hk",
    //     })
    //     .then((result) => {
    //         console.log(`google result:${result}`);
    //     });

    await cluster.idle();
    await cluster.close();
};
test_cluster_bot();
const test_throw_err = () => {
    const result = (async () => {
        return Promise.reject("err");
    })();
    result
        .then((data) => {
            console.log(data);
        })
        .catch((err) => {
            console.log(JSON.stringify(err));
        });
};
