import { GraphQLSchema } from 'graphql';
import * as express from 'express';
const graphqlExpress = require('express-graphql');
const bodyParser = require('body-parser');
const db = require('./db');

import { getSchema } from "./graphql";

async function start() {
   let graphQLSchema : GraphQLSchema = await getSchema();
   const app = express();
   await db.connect();

   app.use('/graphql', bodyParser.json(), async (req, res, next) => {
      graphQLSchema = await getSchema();

      const graphql = graphqlExpress({
         graphQLSchema,
         'graphiql': { 'defaultQuery': `{ hello }` },
         'context': { 'name': 'world' }
      });

      graphql(req, res, next);
   });

   app.listen({ port: 4000 }, () => {
      console.log("Server ready at http://localhost:4000");
   });
}

start();