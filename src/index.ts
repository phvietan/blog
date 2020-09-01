import path from "path";
import helmet from "helmet";
import dotenv from "dotenv";
import express from "express";
import nunjucks from "nunjucks";

dotenv.config();

const app = express();

app.use(helmet());
app.use(helmet.frameguard({ action: 'deny' }));

const env = nunjucks.configure(
    path.join("src", "views"), {
    autoescape: true,
    express: app,
});

env.addGlobal("HTML_TITLE", process.env.HTML_TITLE);
env.addGlobal("HTML_DESCRIPTION", process.env.HTML_DESCRIPTION);

app.get( "/", ( req, res ) => {
    res.render("index.html");
} );

const port = process.env.APP_PORT || 8000;
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );