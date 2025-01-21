import { z } from "zod";
import { config } from "dotenv";
config();
console.log("load env module");
const envSchema = z.object({
    DATA_PATH: z.string().optional().default(__dirname),
    ROOT_DIR: z.string().optional().default(__dirname),
});
export const env = envSchema.parse(process.env);
