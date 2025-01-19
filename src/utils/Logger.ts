import pino from "pino";
export const logger = pino({
    name: "jobjobs",
    level: "debug",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            prettyPrint: {
                translateTime: true,
                messageFormat: "{file}:{line}:{msg}",
            },
        },
    },
});
