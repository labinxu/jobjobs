import { z } from "zod";
import { config } from "dotenv";
config();
console.log("load env module");
const envSchema = z.object({
    DATA_PATH: z.string().optional().default(__dirname),
    ROOT_DIR: z.string().optional().default(__dirname),
    DB_CONN_STRING: z.string(), //.default("http://localhost:27017/"),
    DATA_DIR: z.string(),
    LOG_DIR: z.string(),
    COLLECTION_NAME: z.string().default("col_position"),
});
export const env = envSchema.parse(process.env);
