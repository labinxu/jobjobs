import { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { logger } from "../utils/Logger";
import { Cluster } from "puppeteer-cluster";
import fs, { promises } from "fs";
import { City } from "../common/city";

puppeteer.use(StealthPlugin());
interface ISite {
    scrapeCities(): Promise<any>;
    scrape(): Promise<any>;
}
export default class Site implements ISite {
    #url: string;

    constructor(url: string) {
        // private member variable
        this.#url = url;
    }
    getCluster = async (): Promise<Cluster<any, any>> => {
        return Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: 2,
            puppeteerOptions: {
                headless: false,
            },
            puppeteer: puppeteer,
        });
    };
    async init(citiesfile: string): Promise<City[]> {
        logger.info("Init cluster");
        let result: Promise<any[]> = new Promise((resolve, rejects) => {
            if (!fs.existsSync(citiesfile)) {
                logger.debug("scrape cities...");
                this.scrapeCities().then((data) => {
                    promises
                        .writeFile(citiesfile, JSON.stringify(data), {
                            flag: "w",
                        })
                        .then(() => {
                            console.log("Store cities Successfully");
                            resolve(data);
                        });
                });
            } else {
                logger.debug(`read cities from ${citiesfile}`);
                fs.readFile(citiesfile, "utf8", (error: any, data: string) => {
                    if (error) {
                        rejects(new Error(`read ${citiesfile} failed!`));
                    }
                    resolve(JSON.parse(data));
                });
            }
        });
        return result;
    }
    getUrl() {
        return this.#url;
    }

    public async scrape(): Promise<any> {
        logger.error("Not implement!");
        return Promise.reject(new Error("Not implement!"));
    }
    public async scrapeCities(): Promise<any> {
        logger.error("Please implement it in subclass.");
        return Promise.reject(new Error("not implement"));
    }
    launchBrowser = async (): Promise<Browser> => {
        logger.debug("launch browser...");
        return puppeteer.launch({ headless: true });
    };
    createSession = async (): Promise<string> => {
        console.log("create steel session...");
        const createSession = {
            sessionContext: {
                ANY_ADDITIONAL_PROPERTY: "anything",
            },
            extensions: [null],
            dimensions: {
                width: 1,
                height: 1,
            },
        };
        const url = `${process.env.STEEL_BASE_URL}/v1/sessions`;
        console.log(`Create session with url:${url}`);
        const resp = await fetch(url, {
            method: "POST",
            body: JSON.stringify(createSession),
            headers: { "Content-Type": "application/json" },
        });
        if (resp && resp.ok) {
            const content = await resp.json();
            return new Promise((resolve, reject) => {
                try {
                    resolve(content.id);
                } catch (error) {
                    console.log(error);
                    reject(new Error("Create session failed!"));
                }
            });
        }
        return Promise.reject(new Error("Create session failed"));
    };
    releaseSession = async (id: string): Promise<boolean> => {
        console.log(`Release session:${id}`);
        return Promise.resolve(true);
    };
    newPage = async (id: string): Promise<Page> => {
        const browser = await puppeteer.connect({
            browserWSEndpoint: `${process.env.WS_URL}?apiKey=${process.env.STEEL_API_KEY}&sessionId=${id}`,
        });
        return browser.newPage();
    };
}
