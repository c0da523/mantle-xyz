// import express
import express, { Express } from "express";

// import local supagraph init scripts
import { start } from "./sync";
import { graphql } from "./graphql";
import { snapshot } from "./snapshot";

// type and cast default values
import { withDefault } from "supagraph";

// create a new app to respond to reqs
const app: Express = express();

// use json reqs/resps
app.use(express.json());

// attach supagraphs graphql endpoint
app.use("/graphql", graphql);

// attach snapshot strategy
app.post("/snapshot", snapshot);

// listen for connections (default to 8000)
app.listen(withDefault(process.env.port, 8000), async () => {
  // start the sync operation (no need to await - it will run forever)
  start();
  // server started - lets go...
  console.log(
    `⚡️[server]: Server is running at http://localhost:${withDefault(
      process.env.port,
      8000
    )}`
  );
});