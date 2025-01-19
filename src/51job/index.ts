import { log } from "console";
import Site from "../common/site";
import { logger } from "../utils/Logger";

export default class Wujob extends Site {
    constructor(url: string) {
        super(url);
    }
    scrape = async () => {
        const id = this.createSession();
        id.then(async (iid: string) => {
            console.log(iid);
            const page = await this.newPage(iid.toString());

            await page.goto(this.getUrl(), { waitUntil: "networkidle0" });
            await page.locator("textarea.gLFyf").fill("puppeteer");
            await page.locator("input.gNO89b").click();
            await page.locator("a[jsname='UWckNb']").click();
        }).catch((err: Error) => {
            console.error(err);
        });
    };

    scrape2 = async () => {
        const cities = await this.getCities();
        logger.debug(JSON.stringify(cities));
    };
    getCities = async () => {
        console.log(`${this.getUrl()} scrape2...`);
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
        }
    };
}
