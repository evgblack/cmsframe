import {
    codegen
} from '@graphql-codegen/core';
import * as fs from 'fs';
import * as path from 'path';
import {
    printSchema,
    parse,
    GraphQLSchema,
    buildSchema,
    DocumentNode
} from 'graphql';
import {
    Types
} from '@graphql-codegen/plugin-helpers';
import {
    mergeTypeDefs
} from 'graphql-toolkit';
import * as glob from 'glob';
import {
    DIRECTIVES
} from '@graphql-codegen/typescript-mongodb';
import {
    makeExecutableSchema
} from 'graphql-tools';

import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptMongoDbPlugin from '@graphql-codegen/typescript-mongodb';

const folder = '../generated/';

async function getGraphqlSchema() {
    return new Promise((resolve, reject) => {
        glob("./src/graphql/**/*.graphql", async (er, files) => {
            let graphql = files.map((f) => {
                return fs.readFileSync(f).toString();
            }).join('\r\n');
            resolve(graphql);
        });
    });
}


async function start() {
    let graphql = await getGraphqlSchema();

    //const schema: GraphQLSchema = buildSchema(graphql);
    const schema: GraphQLSchema = makeExecutableSchema({
        typeDefs: [
            DIRECTIVES,
            graphql
        ]
    });

    fs.writeFile('all.schema.graphql', printSchema(schema), () => {
        console.log('all.schema.graphql generated!');
    });

    //const documentNode: DocumentNode = parse(printSchema(schema));
    //return buildSchema(readFileSync(schemaString, { encoding: 'utf-8' }));
};

start();