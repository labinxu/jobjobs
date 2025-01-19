import { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { logger } from "../utils/Logger";

puppeteer.use(StealthPlugin());

export default class Site {
    #url: string;
    constructor(url: string) {
        // private member variable
        this.#url = url;
    }
    getUrl() {
        return this.#url;
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
