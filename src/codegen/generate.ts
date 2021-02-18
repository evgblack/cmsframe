import { codegen } from '@graphql-codegen/core';
import * as fs from 'fs';
import * as path from 'path';
import { printSchema, parse, GraphQLSchema, buildSchema, DocumentNode } from 'graphql';
import { Types } from '@graphql-codegen/plugin-helpers';
import { mergeTypeDefs } from 'graphql-toolkit';
import * as glob from 'glob';
import { DIRECTIVES } from '@graphql-codegen/typescript-mongodb';
import { makeExecutableSchema } from 'graphql-tools';

import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptMongoDbPlugin from '@graphql-codegen/typescript-mongodb';

const folder = './src/generated/';

async function getGraphqlSchema() {
    return new Promise((resolve, reject) => {
        glob("./src/graphql1/**/*.graphql", async (er, files) => {
            let graphql = files.map((f) => {
                return fs.readFileSync(f).toString();
            }).join('\r\n');
            resolve(graphql);
        });
    });
}

async function generateTypescript(documentNode) {
    const outputFile = folder + 'types.d.ts';
    const config: Types.GenerateOptions = {
        // used by a plugin internally, although the 'typescript' plugin currently
        // returns the string output, rather than writing to a file
        filename: outputFile,
        schema: documentNode,
        documents: null,
        config: {},
        plugins: [ // Each plugin should be an object
            {
                'typescript-mongodb': {},
                'typescript': {} // Here you can pass configuration to the plugin
            },
        ],
        pluginMap: {
            'typescript': typescriptPlugin,
            'typescript-mongodb': typescriptMongoDbPlugin
        },
    };

    const output = await codegen(config);
    fs.writeFile(outputFile, output, () => {
        console.log('types.d.ts generated!');
    });
}

async function generateTypescriptMongoDB(documentNode) {
    const outputFile = folder + 'mongodb.ts';
    const config: Types.GenerateOptions = {
        filename: outputFile,
        schema: documentNode,
        documents: null,
        config: {},
        plugins: [ // Each plugin should be an object
            {
                'typescript-mongodb': {}, // Here you can pass configuration to the plugin
            },
        ],
        pluginMap: {
            'typescript-mongodb': typescriptMongoDbPlugin,
        },
    };

    const output = await codegen(config);
    fs.writeFile(outputFile, output, () => {
        console.log('mongodb.ts generated!');
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

    const documentNode: DocumentNode = parse(printSchema(schema));

    //console.log('-------------------------');
    //console.log(schema);

    generateTypescript(documentNode);
    //generateTypescriptMongoDB(documentNode);
}

start();