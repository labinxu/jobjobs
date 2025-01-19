import WUJob from "./51job";

async function main() {
    const site = new WUJob("https://www.51job.com");
    await site.scrape();
}
main();
