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
import { TPage } from "../common/page";

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
        logger.info(`Scrape ${cities.length} cities ${JSON.stringify(cities)}`);
        await scrapeSleep();
        const indus = await this.scrapeIndusties(cities.slice(0, 1));
        if (!(indus.length > 0)) {
            logger.error("Error hanppend fail to scrape industy !");
            throw Error("Error hanppend fail to scrape industy !");
        }
        logger.info(`Scrape ${indus.length} industies`);
        await this.scrapePositions(indus.slice(2, 3));
        logger.info("End of scrape!");
    };
    //return the next page if it exists
    private doScrapePositions = async (
        page: Page,
        data: { name: string; link: string },
    ): Promise<any> => {
        const pn = await page.$eval(
            "div.dw_page ul li.on",
            (el) => el.textContent,
        );
        logger.info(`doScrapePositions,page:${pn} ${JSON.stringify(data)}`);
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
        logger.info(`Scrape ${positions.length} [${data.name}] ${data.link}`);
        let nextPage = await this.getNextPage(page).catch(async (err) => {
            await page.screenshot({
                path: `${env.LOG_DIR}/images/err_nopage_${now()}.jpg`,
                fullPage: true,
            });
        });
        if (nextPage) {
            logger.info(`Next page found! ${JSON.stringify(nextPage)}`);
            await sleep(randomInteger(1000, 6000));
            const payload = {
                name: data.name,
                link: nextPage.link,
            };
            await nextPage.handle.click();
            await page.waitForNavigation({ waitUntil: "networkidle0" });
            await this.doScrapePositions(page, payload);
            nextPage = await this.getNextPage(page).catch((err) => {
                logger.info(err);
            });
        } else {
            await page.screenshot({
                path: `${env.LOG_DIR}/images/err_nopage_${now()}.jpg`,
                fullPage: true,
            });
            logger.info("End of pages!");
            return Promise.reject("End of pages!");
        }
    };
    private getNextPage = async (page: Page): Promise<TPage> => {
        const nextPage = await page.$("div.dw_page ul li.on +li a");
        if (nextPage) {
            const nextData = await nextPage.evaluate((el) => {
                return {
                    handle: nextPage,
                    name: el.textContent,
                    link: el.href,
                };
            });

            logger.info(`Next page found! ${JSON.stringify(nextData)}`);
            return Promise.resolve(nextData);
        } else {
            logger.info("No next page found!");
            return Promise.reject("No next page found!");
        }
    };
    private printPageNumber = async (page: Page) => {
        const pageNum = await page.$eval(
            "div.dw_page ul li.on",
            (el) => el.textContent,
        );

        logger.info(`Current page : ${pageNum}`);
    };

    private _scrapePositions = async ({
        page,
        data,
    }: {
        page: Page;
        data: { name: string; link: string };
    }) => {
        logger.debug(`goto ${data.link} for ${data.name}`);

        try {
            await page.goto(data.link, { waitUntil: "networkidle0" });
        } catch (err) {
            logger.error(`goto ${data.link} for ${data.name} failed`);
            return;
        }
        await this.printPageNumber(page);
        await this.doScrapePositions(page, data);
        logger.info("end positions scrape.");
        return Promise.resolve("End of positions scrape!");
    };

    scrapePositions = async (industies: any[]) => {
        const cluster = await this.getCluster();
        // add tasks
        await Promise.allSettled(
            industies.map(async (i) => {
                scrapeSleep();
                return cluster.execute(i, this._scrapePositions);
            }),
        );
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
        const cluster = await this.getCluster();
        const cities = await cluster.execute(
            this.getLink(),
            async ({ page, data }: { page: Page; data: string }) => {
                logger.info(`goto ${data}`);
                await page.goto(data, { waitUntil: "networkidle0" });
                const cityLinks = await page.$$eval("div.hcity a", (el) =>
                    el.map((x) => {
                        return { name: x.textContent, link: x.href };
                    }),
                );
                if (cityLinks.length <= 0) {
                    logger.error("no city found!");
                    page.screenshot({
                        path: `${env.LOG_DIR}/images/err_nocity_${now()}.jpg`,
                    });
                    return Promise.reject("no city found!");
                } else {
                    return Promise.resolve(cityLinks);
                }
            },
        );

        cities.pop();
        return cities;
    }
}
