import { configDotenv } from "dotenv";
import Wujob from "./51job";

configDotenv();
async function main() {
    const site = new Wujob("https://www.51job.com");
    site.scrape2();
}
main();
