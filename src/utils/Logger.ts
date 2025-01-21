import pino from "pino";
import { dirname } from "path";
import { env } from "../env";

// export const logger = pino({
//     name: "jobjobs",
//     level: "debug",
//     transport: {
//         target: "pino-pretty",
//         options: {
//             colorize: true,
//             prettyPrint: {
//                 translateTime: true,
//                 messageFormat: "",
//             },
//         },
//     },
// }).child({ filename: path.basename(__filename) });
const STACKTRACE_OFFSET = 2;
const LINE_OFFSET = 7;
const {
    symbols: { asJsonSym },
} = pino;

function traceCaller(pinoInstance: any) {
    const get = (target: any, name: any) =>
        name === asJsonSym ? asJson : target[name];

    function asJson(...args: any[]) {
        args[0] = args[0] || Object.create(null);
        args[0].caller = Error()
            .stack?.split("\n")
            .filter(
                (s) =>
                    !s.includes("node_modules/pino") &&
                    !s.includes("node_modules\\pino"),
            )
            [STACKTRACE_OFFSET].substring(LINE_OFFSET)
            .replace(env.ROOT_DIR, "");
        return pinoInstance[asJsonSym].apply(this, args);
    }
    return new Proxy(pinoInstance, { get });
}

export const logger = traceCaller(
    pino({
        level: "debug",
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                prettyPrint: {
                    translateTime: true,
                },
            },
        },
    }),
);
