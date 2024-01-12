import {Configuration, Inject} from "@tsed/di";
import {PlatformApplication} from "@tsed/common";
import "@tsed/platform-express";
import "@tsed/ajv";
import {config} from "./config";
import * as rest from "./controllers/rest/index";
import * as views from "./controllers/views/index";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import "@tsed/swagger";
import {isProduction} from "./config/envs";
import process from "process";
import cors from "cors";

const opts: Partial<TsED.Configuration> = {
    ...config,
    acceptMimes: ["application/json"],
    httpPort: process.env.PORT ?? 8083,
    httpsPort: (function (): number | boolean {
        if (process.env.HTTPS === "true") {
            return Number.parseInt(process.env.HTTPS_PORT as string);
        }
        return false;
    }()),
    componentsScan: [`./services/**/**.js`],
    mount: {
        "/rest": [
            ...Object.values(rest)
        ],
        "/": [
            ...Object.values(views)
        ]
    },
    socketIO: {
        cors: {
            origin: process.env.BASE_URL
        }
    },
    statics: {
        "/": [
            {
                root: `${__dirname}/public`
            }
        ]
    },
    middlewares: [
        cors({
            origin: process.env.BASE_URL
        }),
        cookieParser(),
        methodOverride(),
        bodyParser.json(),
        bodyParser.urlencoded({
            extended: true
        }),
    ],
    views: {
        root: `${__dirname}/public`,
        extensions: {
            ejs: "ejs"
        },
        options: {
            ejs: {
                rmWhitespace: isProduction
            }
        }
    },
    exclude: [
        "**/*.spec.ts"
    ]
};

if (!isProduction) {
    opts["swagger"] = [
        {
            path: "/api-docs",
            specVersion: "3.0.3"
        }
    ];
}

@Configuration(opts)
export class Server {

    @Inject()
    protected app: PlatformApplication;

    @Configuration()
    protected settings: Configuration;

}
