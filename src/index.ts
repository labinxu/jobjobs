import WUJob from "./51job";
import { logger } from "./utils/Logger";
async function main() {
    const site = new WUJob("https://www.51job.com");
    await site.scrape();
    logger.info("End of main!");
}
main();
