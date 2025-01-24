import { pathToFileURL } from "url";
import { logger } from "../src/utils/Logger";
import { dirname } from "path";
import { env } from "../src/env";
console.log(env.DATA_DIR);
const test_reject = async (): Promise<boolean> => {
    return Promise.reject("test reject");
};

const main = async () => {
    const result = await test_reject().catch((error) => {
        logger.error(error);
    });
    if (result) {
        logger.info("test reject success");
    } else {
        logger.error("test reject failed");
    }
};
main();
