import pino from "pino";
export const logger = pino({
    name: "jobjobs",
    level: "debug",
});
