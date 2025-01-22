import { Page } from "puppeteer";
import { Db, MongoClient } from "mongodb";
import { City } from "../common/city";
import Site from "../common/site";
import { logger } from "../utils/Logger";
import path from "path";
import { env } from "../env";
import { sleep, randomInteger, now } from "../utils";
import { getMongoDb } from "../db";
import { scrapeSleep } from "../utils";

export default class WUJob extends Site {
    #db: Db | null = null;
    constructor(url: string) {
        super(url);
    }
    getDb = async (): Promise<Db> => {
        if (!this.#db) {
            logger.info("Init db...");
            this.#db = await getMongoDb();
        }
        return this.#db;
    };
    getCollection = async (name: string) => {
        const db = await this.getDb();
        return db.collection(name);
    };
    scrape = async () => {
        const citiesfile = path.join(env.DATA_DIR, "wujob", "cities.json");
        logger.debug("subclass scrape function");
        const cities = await this.initCities(citiesfile);
        if (cities.length <= 0) {
            logger.error("Cities is empty!");
            throw Error("Cities is empty!");
        }
        scrapeSleep();
        const indus = await this.scrapeIndusties(cities.slice(0, 1));
        if (!(indus.length > 0)) {
            logger.error("Error hanppend fail to scrape industy !");
            throw Error("Error hanppend fail to scrape industy !");
        }
        logger.info(`Scrape ${indus.length} industies`);
        const positions = await this.scrapePositions(indus.slice(1, 2));
        logger.info(`Scrape ${positions.length} positions`);
        await this.getCluster().then((cluster) => {
            cluster.close();
        });
    };
    private _scrapePositions = async ({
        page,
        data,
    }: {
        page: Page;
        data: { name: string; link: string };
    }): Promise<any[]> => {
        logger.debug(`goto ${data.link} for ${data.name}`);
        try {
            await page.goto(data.link, { waitUntil: "networkidle0" });
        } catch (err) {
            logger.error(`goto ${data.link} for ${data.name} failed`);
            return Promise.reject("goto failed");
        }
        const positions = await page.$$eval(
            "div.detlist.gbox .e.sensors_exposure",
            (el) =>
                el.map((x) => {
                    const data = x.getAttribute("sensorsdata");
                    if (data) {
                        return JSON.parse(data);
                    } else {
                        return null;
                    }
                }),
        );
        if (positions.length <= 0) {
            logger.error(`No positions found! ${data.name} on ${data.link}`);
            await page.screenshot({
                path: `${env.LOG_DIR}/images/err_nopositions_${now()}.jpg`,
            });

            return Promise.reject("No positions found!");
        }
        this.getCollection(env.COLLECTION_NAME).then((collection) => {
            logger.info(
                `Insert ${positions.length} positions for ${data.name}`,
            );
            collection.insertMany(positions);
        });
        logger.info(
            `Scrape ${positions.length} positions for ${data.name} on ${data.link}`,
        );
        // find next page
        // const next = await page.$("div.dw_page ul :nth-last-child(1 of li.bk) a");
        const pagesTag = await page.$$eval("div.dw_page ul li", (el) =>
            el.map((e) => e.textContent),
        );
        if (pagesTag.length < 0) {
            logger.error("No pages found!");
            return Promise.resolve(positions);
        }
        logger.info(`pages: ${JSON.stringify(pagesTag)}`);
        const next = await page.$("div.dw_page ul li.on  +li a");
        if (next) {
            logger.info(
                `Current page: ${await next.evaluate((a) => a.textContent)}`,
            );
            await sleep(randomInteger(1000, 6000));
            const ps = await this.cluster?.execute(
                {
                    name: data.name,
                    link: await next.evaluate((a) => a.href),
                },
                this._scrapePositions,
            );
            positions.push(...ps);
        } else {
            logger.info("No next page found!");
        }
        return Promise.resolve(positions);
    };
    scrapePositions = async (industies: any[]): Promise<any[]> => {
        const cluster = await this.getCluster();
        // add tasks
        const positions = await Promise.allSettled(
            industies.map(async (i) => {
                scrapeSleep();
                return cluster.execute(i, this._scrapePositions);
            }),
        );
        return positions
            .filter((p: any) => p.status === "fulfilled")
            .map((p: any) => p.value)
            .reduce((acc, current) => acc.concat(current), []);
    };
    scrapeIndusties = async (cities: City[]): Promise<any[]> => {
        logger.info("scrape industies...");
        const cluster = await this.getCluster();
        const _scrapeIndusties = async ({
            page,
            data,
        }: {
            page: Page;
            data: { name: string; link: string };
        }) => {
            try {
                logger.debug(`goto ${data.link}`);
                await page.goto(data.link, { waitUntil: "networkidle0" });
                const hles = await page.$$("div.hle");
                if (hles.length <= 0) {
                    await page.screenshot({
                        path: `${env.LOG_DIR}/images/err_div.hle${now()}.jpg`,
                    });
                    return Promise.reject("no div.hle found");
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
                                return { name: name, link: a.href };
                            }
                        }),
                    );
                }
                return Promise.resolve(indsts);
            } catch (error) {
                logger.error(JSON.stringify(error));
                return Promise.reject([error]);
            }
        };
        // add tasks
        const indts = await Promise.allSettled(
            cities.map(async (city) => {
                return cluster.execute(city, _scrapeIndusties);
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
        logger.info(`Scrape cities from :${this.getLink()}`);
        const browser = await this.launchBrowser();
        try {
            const page = await browser.newPage();
            await page.goto(this.getLink(), { waitUntil: "networkidle0" });
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
            logger.error(error);
            return Promise.reject(error);
        } finally {
            browser.close();
        }
    }
}
