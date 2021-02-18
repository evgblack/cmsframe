const util = require("util");
import * as fs from 'fs';
import { graphql, GraphQLSchema, GraphQLScalarType, parse } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
//import GraphQLJSON from 'graphql-type-json';
const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json');
import * as moment from 'moment';
import { Kind } from 'graphql/language';
import { DateTimeResolver } from './resolvers/DateTime'
import {
    //DateTimeResolver,
    EmailAddressResolver,
    NegativeFloatResolver,
    NegativeIntResolver,
    NonNegativeFloatResolver,
    NonNegativeIntResolver,
    NonPositiveFloatResolver,
    NonPositiveIntResolver,
    PhoneNumberResolver,
    PositiveFloatResolver,
    PositiveIntResolver,
    PostalCodeResolver,
    UnsignedFloatResolver,
    UnsignedIntResolver,
    URLResolver,
    BigIntResolver,
    LongResolver,
    GUIDResolver,
    HexColorCodeResolver,
    HSLResolver,
    HSLAResolver,
    IPv4Resolver,
    IPv6Resolver,
    ISBNResolver,
    MACResolver,
    PortResolver,
    RGBResolver,
    RGBAResolver,
    USCurrencyResolver,
    JSONResolver,
    JSONObjectResolver,
} from 'graphql-scalars';

//import { resolvers } from 'graphql-scalars';
import * as schemaManager from './schema';
import { logl, logArgs } from './utils';
import * as db from './db';
import * as fake from './fake';
import * as generate from "./generate";

let graphQLSchema: GraphQLSchema, schema;

moment.locale('ru');

const resolversMap = {
    //...resolvers,

    Query: {
        hello: () => "world",
        entities: async () => {
            for (let entity of schema.entities.array) {
                if (entity.embedded) {
                    entity.count = null;
                } else {
                    entity.count = await db.count(entity.name);
                }
            }
            return schema.entities.array;
        },
        entity: (_, { name }) => schema.entities.hash[name]
    },

    Mutation: {

    },

    /*     Entity: {
            indexes: (parent) => {
                return {'name_1_unique': '', 'key': {'name': 1}, 'unique': true};
            }
        }, */

    JSON: GraphQLJSON,

    DateTime: DateTimeResolver,
    BigInt: BigIntResolver,
    Long: LongResolver,
    EmailAddress: EmailAddressResolver,
    URL: URLResolver,
    RGB: RGBResolver,
    RGBA: RGBAResolver,
    IPv4: IPv4Resolver,
    IPv6: IPv6Resolver,
    MAC: MACResolver,
    Port: PortResolver,

    ISBN: ISBNResolver,
    USCurrency: USCurrencyResolver,

    PhoneNumber: PhoneNumberResolver,
    PostalCode: PostalCodeResolver,
    //JSONObject: JSONObjectResolver,
    //JSON: JSONResolver,

    /*     NonPositiveInt: NonPositiveIntResolver,
        PositiveInt: PositiveIntResolver,
        NonNegativeInt: NonNegativeIntResolver,
        NegativeInt: NegativeIntResolver,
        NonPositiveFloat: NonPositiveFloatResolver,
        PositiveFloat: PositiveFloatResolver,
        NonNegativeFloat: NonNegativeFloatResolver,
        NegativeFloat: NegativeFloatResolver,
        UnsignedFloat: UnsignedFloatResolver,
        UnsignedInt: UnsignedIntResolver,
        GUID: GUIDResolver,
    
        HexColorCode: HexColorCodeResolver,
        HSL: HSLResolver,
        HSLA: HSLAResolver,
     */

    /*     Post: {
            //author: post => find(authors, { id: post.authorId }),
        }, */

    /*     User: {
            role: (parent, args, context, info)=>{
                let role = db.find("Role", "id", parent.role);
                //console.log("User.role : ", role);
                return role;
            }
        } */
};

function createMutation(entity) {
    let mutations = resolversMap['Mutation'];

    mutations["create" + entity.name] = async function (parent, args, context, info) {
        return await db.createEntity(entity, args.input);
    }
    mutations["update" + entity.name] = async function (parent, args, context, info) {
        return await db.updateEntity(entity, args.input);
    }
    mutations["delete" + entity.name] = async function (parent, args, context, info) {
        return await db.deleteEntity(entity, args.id);
    }
}

function createQuery(entity) {
    resolversMap['Query'][entity.plural] = async function (parent, args, context, info) {
        console.log("info.fieldNodes.length : ", info.fieldNodes.length);
        console.log(`selectionSet from "${entity.name}"`);
        for (const sel of info.fieldNodes[0].selectionSet.selections) {
            console.log(`   ${sel.name.value}`);
            /*             if(sel.selectionSet){
                            let type = entity.fieldsHashByName[sel.name.value];
                            console.log(`:: LINK :: ${sel.name.value}`, type);
                        } */
        }
        //selectionSet

        let res = await db.findAndProcess(entity, args);
        return res;
    }

    resolversMap['Query'][entity.singular] = async function (parent, args, context, info) {
        let res = await db.findOneAndProcess(entity, args.id);
        return res;
    }
}

function createQueryLink(entity, field) {
    resolversMap[entity.name][field.name] = async function (parent, args, context, info) {
        return await db.find(field.type, "_id", parent[field.name]);
    }
}

function createQueryListLink(entity, field) {
    resolversMap[entity.name][field.name] = async function (parent, args, context, info) {
        if (field.virtual) {
            return await db.findVirtualList(parent, entity, field, args); // limit
        }
        return await db.findList(field.type, parent[field.name], args);
    }
}

function createResolvers() {
    for (const entity of schema.entities.array) {
        resolversMap[entity.name] = {};
        // TODO: перепеисать с использованием списка entity.relations
        for (const field of entity.fields) {
            if (field.type in schema.entities.hash) {
                if (field.list) {
                    createQueryListLink(entity, field);
                } else {
                    createQueryLink(entity, field);
                }
            }
        }
    }
    for (const entity of schema.entities.array) {
        createMutation(entity);
        createQuery(entity);
    }
}

function generateUnion() {
    let arr = [];
    for (const entityName in schema.entities.hash) {
        arr.push(entityName);
    }
    return 'union Morph = ' + arr.join('|');
}

let directives = '';
// Promise<GraphQLSchema>
export async function getSchema(): Promise<any> {
    let promise = new Promise(async (resolve, reject) => {
        if (graphQLSchema) {
            resolve(graphQLSchema);
            return;
        }

        directives = fs.readFileSync("./src/graphql/schema.graphql").toString();

        let astNode = await schemaManager.getSchemaAST();

        schema = schemaManager.parseSchemaFromAST(astNode);

        createResolvers();

        db.setSchema(schema);
        fake.setSchema(schema);

        await db.createCollections();

        //await fake.generateDB();

        let unionMorph = generateUnion();

        let schemaString = directives + generate.generateGraphQLSchemaString(schema) + unionMorph;
        // console.log(schemaString);

        astNode = parse(schemaString);

        //printResolvers();
        //printRelations();

        graphQLSchema = makeExecutableSchema({ 'typeDefs': astNode, resolvers: resolversMap });

        //fs.writeFile("./src/generated/entities2.json", JSON.stringify(entities), ()=>{});

        resolve(graphQLSchema);
    });

    return promise.catch(function (reason) {
        console.log("async function getSchema()");
        console.error(reason);
    });
}

function printResolvers() {
    console.log('------------------  resolvers  ---------------------');
    for (let key1 in resolversMap) {
        console.log(key1);
        for (let key2 in resolversMap[key1]) {
            console.log(`   ${key2}`);
        }
    }
}

function printRelations() {
    console.log('------------------  relations  ---------------------');
    for (const entity of schema.entities.array) {
        console.log(entity.name);
        for (const fieldName in entity.relations) {
            let relation = entity.relations[fieldName];
            console.log(`   ${fieldName} : ${JSON.stringify(relation.to)} <-> ${JSON.stringify(relation.back)}`); // ${JSON.stringify(relation)}
        }
    }
}

/* [ { name: 'ENUM_AD_TAG',
    values: [ 'yandex', 'adsense', 'luckyads' ] },
  { name: 'ENUM_POST_CHANGEFREQ',
    values:
     [ 'always',
       'hourly',
       'daily',
       'weekly',
       'monthly',
       'yearly',
       'never' ] },
  { name: 'ENUM_POST_STATE', values: [ 'draft', 'published' ] } ] */