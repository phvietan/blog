import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import nunjucks from "nunjucks";
import favicon from 'serve-favicon';

import { Request, Response, NextFunction, Express } from 'express';

dotenv.config();

function prepareTemplateEngine(app: Express) {
    const env = nunjucks.configure(
        path.join("src", "views"), {
        autoescape: true,
        express: app,
    });
    env.addGlobal("HTML_TITLE", process.env.HTML_TITLE);
    env.addGlobal("HTML_DESCRIPTION", process.env.HTML_DESCRIPTION);
}

function removeAllChars(s: string, c: string):string {
    return s.split(c).join('');
}

function prepareMiddlewares(app: Express) {
    app.use((_, res: Response, next: NextFunction) => {
        res.locals.cspNonce = crypto.randomBytes(16).toString("hex");
        const csp = `
            default-src 'none';
            base-uri 'none';
            block-all-mixed-content;
            font-src 'self' https: data:;
            frame-ancestors 'self';
            img-src 'self' data:;
            object-src 'none';
            script-src 'nonce-${res.locals.cspNonce}';
            style-src 'nonce-${res.locals.cspNonce}';
            upgrade-insecure-requests;
        `;
        // const csp = ``;
        res.set("Content-Security-Policy",
            removeAllChars(removeAllChars(csp, '\n'), '  ')
        );
        return next();
    });
    app.use(favicon(path.join(__dirname, '..', 'src', 'static', 'img', 'favicon.ico')));
}

function prepareEndpoints(app: Express) {
    app.get( "/", ( req: Request, res: Response ) => {
        const context = {
            nonce: res.locals.cspNonce,
        };
        res.render("index.html", context);
    } );

}

function main() {
    const app = express();
    prepareTemplateEngine(app);
    prepareMiddlewares(app);
    prepareEndpoints(app);

    const port = process.env.APP_PORT || 8000;
    app.listen( port, () => {
        console.log( `server started at http://localhost:${ port }` );
    } );
}

main();