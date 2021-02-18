import { generate } from '@graphql-codegen/cli';
import { DIRECTIVES } from '@graphql-codegen/typescript-mongodb';
import { Types } from '@graphql-codegen/plugin-helpers';
import { makeExecutableSchema } from 'graphql-tools';
import { printSchema, parse, GraphQLSchema, buildSchema, DocumentNode } from 'graphql';
import * as glob from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { Schema } from 'inspector';
// import { mergeTypeDefs } from 'graphql-toolkit';

let folder = './src/generated/';

async function getGraphqlSchema() : Promise<Types.Schema> {
    return new Promise((resolve, reject) => {
        glob("./src/graphql/**/*.graphql", async (er, files) => {
            glob("./src/generated/graphql/!(all).graphql", async (er, files2) => {
                let graphql = files.concat(files2).map((f) => {
                    return fs.readFileSync(f).toString();
                }).join('\r\n');

                fs.writeFile("./src/generated/graphql/all.graphql", graphql, () => {
                    resolve(graphql);
                });
            });
        });
    });
}

async function generateDirectives() {
    return new Promise((resolve, reject) => {
        const schema: GraphQLSchema = makeExecutableSchema({
            typeDefs: [
                DIRECTIVES
            ]
        });
        
        fs.writeFile(folder+'graphql/directives.graphql', printSchema(schema), () => {
            resolve();
        });
    });
}


async function start() {
    await generateDirectives();

    let graphql: Types.Schema = await getGraphqlSchema();

    //const schema: GraphQLSchema = buildSchema(graphql);
    //const documentNode: DocumentNode = parse(printSchema(schema));

    let config: Types.Config = {
        schema: graphql,
        require: 'ts-node/register',
        documents: null,
        generates: {
            [folder + 'types.d.ts']: {
                plugins: ['typescript-mongodb', 'typescript', 'typescript-resolvers']
            },
            [folder + 'document-nodes.ts']: {
                plugins: ['typescript-document-nodes']
            },
            [folder + 'my.ts']: {
                plugins: ['src/plugins/my.ts']
            }
        }
    }

    await generate(
        config,
        true
    );
}

start();