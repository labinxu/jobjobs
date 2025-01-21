import { resolve } from "dns";
import { City } from "../common/city";
import Site from "../common/site";
import { logger } from "../utils/Logger";
import path from "path";

export default class WUJob extends Site {
    constructor(url: string) {
        super(url);
    }
    scrape = async () => {
        const citiesfile = path.join("/tmp", "data", "wujob", "cities.json");
        logger.debug("subclass scrape function");
        const cities = await this.initCities(citiesfile);
        if (cities.length <= 0) {
            throw Error("Cities is empty!");
        }
        const indus = await this.scrapeIndusties(cities.slice(0, 1));
        if (!(indus.length > 0)) {
            logger.error("Error hanppend fail to scrape industy !");
            return;
        }
        logger.debug(JSON.stringify(indus));
        const positions = await this.scrapePositions(indus.slice(0, 1));
        logger.debug(JSON.stringify(positions));
        await this.getCluster().then((cluster) => {
            cluster.close();
        });
    };
    scrapePositions = async (industies: any[]): Promise<any[]> => {
        const cluster = await this.getCluster();
        await cluster.task(async ({ page, data }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    logger.debug(`goto ${data.url} for ${data.name}`);
                    await page.goto(data.url, { waitUntil: "networkidle0" });
                    const detList = page.$("div.detlist.gbox");
                    if (!detList) {
                        logger.error("div.detlist.gbox not found");
                        await page.screenshot({
                            path: `logs/images/err_${data.name}_div.detlist.gnox.jpg`,
                        });
                        reject("div.detlist.gbox not found");
                        return;
                    }
                    const positions = await page.$$eval(
                        ".e.sensors_exposure",
                        (el) =>
                            el.map((x) => {
                                const data = x.getAttribute("sensorsdata");
                                if (data) {
                                    return JSON.parse(data);
                                } else {
                                    return {};
                                }
                            }),
                    );
                    resolve(positions);
                } catch (err) {
                    reject("Some error happend!");
                }
            });
        });
        // add tasks
        const positions = await Promise.allSettled(
            industies.map(async (i) => {
                return cluster.execute(i);
            }),
        );
        await cluster.idle();
        return positions
            .filter((p: any) => p.status === "fulfilled")
            .map((p: any) => p.value)
            .reduce((acc, current) => acc.concat(current), []);
    };
    scrapeIndusties = async (cities: City[]): Promise<any[]> => {
        logger.info("scrape industies...");
        const cluster = await this.getCluster();
        await cluster.task(async ({ page, data }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    logger.debug(`goto ${data.url}`);
                    await page.goto(data.url, { waitUntil: "networkidle0" });
                    //await page.screenshot({ path: `logs/images/${data.name}.jpg` });
                    const hles = await page.$$("div.hle");
                    if (hles.length <= 0) {
                        await page.screenshot({
                            path: `logs/images/err_${data.name}_div.hle.jpg`,
                        });
                        reject("no div.hle found");
                        return;
                    }
                    let indsts: any[] = [];
                    for (let hle of hles) {
                        const eleA = await hle.$("a");
                        if (!eleA) {
                            continue;
                        }
                        indsts.push(
                            await eleA.evaluate((a) => {
                                const name = a.textContent?.trim();
                                if (name && name !== "") {
                                    return { name: name, url: a.href };
                                }
                            }),
                        );
                    }
                    resolve(indsts);
                } catch (error) {
                    logger.error(JSON.stringify(error));
                    reject(error);
                }
            });
        });
        // add tasks
        const indts = await Promise.allSettled(
            cities.map(async (city) => {
                return cluster.execute(city);
            }),
        );
        await cluster.idle();
        // await cluster.close();
        return indts
            .filter((p: any) => p.status === "fulfilled")
            .map((p: any) => p.value)
            .reduce((acc, current) => acc.concat(current), []);
    };
    override async scrapeCities(): Promise<any> {
        logger.info(`Scrape cities from :${this.getUrl()}`);
        const browser = await this.launchBrowser();
        try {
            const page = await browser.newPage();
            await page.goto(this.getUrl(), { waitUntil: "networkidle0" });
            // await page.screenshot({ path: "logs/images/51job1.jpg" });
            const hcity = await page.$("div.hcity");
            if (!hcity) {
                logger.error("div.hcity not found!");
                return null;
            }
            const citiesLink = await hcity.$$("a");
            if (citiesLink.length <= 0) {
                logger.error("a not found in div.hcity!");
                return null;
            }
            const cities: any[] = [];
            for (const link of citiesLink) {
                cities.push(
                    await link.evaluate((l) => {
                        const name = l.textContent?.trim();
                        if (name && name !== "") {
                            return {
                                name: l.textContent?.trim(),
                                link: l.href,
                            };
                        }
                    }),
                );
            }
            cities.pop(); //remove the last useless item
            // logger.warn(JSON.stringify(cities));
            return Promise.resolve(cities);
        } catch (error) {
            console.error(error);
        } finally {
            browser.close();
        }
    }
}
