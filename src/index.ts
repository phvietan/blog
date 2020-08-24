import path from "path";
import dotenv from "dotenv";
import express from "express";

dotenv.config();
const app = express();

const port = process.env.APP_PORT;

app.set( "views", path.join( __dirname, "views" ) );
app.set( "view engine", "ejs" );

app.get( "/", ( req, res ) => {
    console.log("!");
    res.render("index");
} );

// start the express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );