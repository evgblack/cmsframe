import * as express from 'express';
const graphqlExpress = require('express-graphql');
const bodyParser = require('body-parser');

import { getSchema } from "./graphql";
import * as client from "./client";
const db = require('./db');

if (process.env.NODE_ENV !== 'production') {
   require('longjohn');
}

async function start() {
   console.time("start");

   process.on('unhandledRejection', error => {
      // Will print "unhandledRejection err is not defined"
      console.log('unhandledRejection', error); // error["message"]
   });

   await db.connect();
   let schema = await getSchema();

   // await db.fixRelations();

   //await client.runQueries();

   await client.generateData();

   const app = express();

   app.use('/graphql', bodyParser.json(), async (req, res, next) => {
      schema = await getSchema();

      const graphql = graphqlExpress({
         schema,
         'graphiql': { 'defaultQuery': `{ hello }` },
         'context': { 'name': 'world' }
      });
      try {
         graphql(req, res, next);
      } catch (error) {
         console.error(error);
      }
   });

   app.listen({ port: 4000 }, () => {
      console.log("Server ready at http://localhost:4000");
      console.timeEnd("start");
   });
}

start();