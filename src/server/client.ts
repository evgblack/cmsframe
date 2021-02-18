
import { graphql } from 'graphql';
import { getSchema } from "./graphql";
import { logl } from './utils';
import * as fake from './fake';
const util = require("util");

function log(label, obj) {
    console.log(`------------------${label}------------------`);
    console.log(JSON.stringify(obj));
}

export async function runQueries() {
    try {
        let schema = await getSchema();
        //console.log('-------------runQuerys-------------');
        let clientEntities = [];
        let res = await queryEntities(schema);
        if (!res.data) {
            console.log("queryEntities : ", res);
            throw ("bad query queryEntities ! ");
        }
        let entities = res.data.entities;

        // let post = await createPost(schema);
        //console.log("post : ", post);


        //let result = await queryHello(schema);
        //log("queryHello", result);

        //result = await queryUsers(schema);
        //log("queryUsers", result);

        //result = await queryTags(schema);
        //log("queryTags", result);
        //checkTags(result);

        /*         console.time("(((( queryUsersPosts");
                result = await queryUsersPosts(schema);
                checkUsersPosts(result);
                console.timeEnd("(((( queryUsersPosts"); */
    } catch (error) {
        console.error(error);
    }
}

async function createPost(schema) {
    let query = `mutation createPost($input: CreatePost!) {
        createPost(input: $input) {
          post {
            title
            route
            slug
            tags {
              name
            }
          }
        }
      }
      `;

    let root = {}, context = {},
        variableValues = {
            "input": {
                "title": "-8889-"
            }
        };

    return graphql(schema, query, root, context, variableValues);
}

export async function generateData() {
    try {
        let ent = {
            "Post": {
                "count": 5,
                "entities": {
                    "Tag": { "min": 1, "max": 5 },
                    "Redirect": { "min": 0, "max": 1 }
                }
            },
            "Tag": { "count": 5 },
            "Redirect": { "count": 5 },
            "Chunk": {
                "count": 5,
                "chunks": { "min": 0, "max": 2 }
            },
            "User": { "count": 5 },
        };

        let schema = await getSchema();

        let res = await queryEntities(schema);
        if (!res.data) {
            console.log("queryEntities : ", res);
            throw ("bad query queryEntities ! ");
        }
        let entities = res.data.entities;
        let hash = {};

        for (const entity of entities) {
            hash[entity['name']] = entity;
        }

        /*         for(const entity of entities){
                    console.log(`--- entity : ${entity['name']}`);
                    for(const field of entity['fields']){
                        if(field['required']){
                            console.log(`   ${field['name']}`);
                        }
                    }
                } */

        for (const name in ent) {
            let genEntity = ent[name];
            let entity = hash[name];
            let result = await createEntity(schema, name, genEntity.count, entity);

            if(result.errors){
                console.log(result.errors);
            }else{
                let data = result.data["create"+name][entity.singular];
                console.log(JSON.stringify(data, null, 4));
            }
        }
    } catch (error) {
        console.error(error);
    }
}

async function createEntity(schema, name, count, entity) {
    //console.log(`createEntity ${name} : ${count}`);
    let data = {};
    //let required = [];
    for (const field of entity['fields']) {
        if (field['required']) {
            //required.push(field['name']);
            fake.genField(data, field);
            //console.log(`   ${field['name']}`);
        }
    }
    //console.log(`   ${JSON.stringify(data)}`);
    // ${required.join('\r\n')}

    let query = `mutation create${name}($input: Create${name}!) {
    create${name}(input: $input) {
        ${entity.singular} {
            _id
        }
    }
}`;

    console.log(query);
    let root = {}, context = {},
        variableValues = {
            "input": data
        };

    return graphql(schema, query, root, context, variableValues);
}

async function queryEntities(schema): Promise<any> {
    let query = `query entities {
        entities {
          name
          description
          plural
          singular
          fields
        }
      }`

    return graphql(schema, query);
}

async function queryTags(schema) {
    let query = `query getTags(
        $sort: String,
        $limit: Int,
        $start: Int,
        $where: JSON
      ){
          tags(sort: $sort, limit: $limit, start: $start, where: $where){
          _id
          name
          countPosts
          posts {
            route
            tags {
              _id
              name
            }
          }
        }
      }
    `;

    let root = {}, context = {}, variableValues = {};

    return graphql(schema, query);
}

function prettyPrint(obj) {
    console.log('----------------------------');
    JSON.stringify(obj, null, 2);
    console.log('----------------------------');
}

async function queryUsersPosts(schema) {
    let query = `query {
        users(limit: 5) {
          _id
          username
          countPosts
          posts(limit: 5) {
            author {
              _id
            }
          }
        }
      }`;

    return graphql(schema, query);
}

function checkUsersPosts(queryResult) {
    const queryName = "query getTags";

    if (!queryResult) {
        throw (`${queryName} -> !queryResult`);
    }

    if (!queryResult.data) {
        console.error(queryResult);
        throw (`${queryName} -> !queryResult.data`);
    }
    let data = queryResult.data;

    if (!data.users) {
        //console.error(object);
        throw (`${queryName} -> !queryResult.data.users`);
    }

    let users = data.users;

    console.log(`--------------  users ${users.length} -----------------`);
    for (const user of users) {
        if (user === null) {
            throw (`${queryName} -> user === null`);
        }
        let posts = user.posts;

        console.log(`${user.username} posts : (${posts.length}) , countPosts : ${user.countPosts}`);

        /*         if (user.countPosts !== posts.length) {
                    console.log("user.name : ", user.name);
                    console.log("user.countPosts : ", user.countPosts);
                    console.log("user.posts.length : ", posts.length);
                    throw (`${queryName} -> user.countPosts !== user.posts.length`);
                } */

        for (const post of posts) {
            if (post["author"]["_id"] !== user["_id"]) {
                throw (`${queryName} ->post["author"]["_id"] !== user["_id"]`);
            }
        }
    }
}

function checkTags(queryResult) {
    const queryName = "query getTags";

    if (!queryResult) {
        throw (`${queryName} -> !queryResult`);
    }

    //prettyPrint(queryResult);

    if (!queryResult.data) {
        console.error(queryResult);
        throw (`${queryName} -> !queryResult.data`);
    }
    let data = queryResult.data;

    if (!data.tags) {
        //console.error(object);
        throw (`${queryName} -> !queryResult.data.tags`);
    }

    let tags = data.tags;

    //console.log('--------------  tags -------------------');
    for (const tag of tags) {
        if (tag === null) {
            console.error(prettyPrint(tags));
            throw (`${queryName} -> tag === null`);
        }
        //console.log(`${tag.name} (${tag.posts.length})`);
        let posts = tag.posts;
        if (tag.countPosts !== tag.posts.length) {
            console.log("tag.name : ", tag.name);
            console.log("tag.countPosts : ", tag.countPosts);
            console.log("tag.posts.length : ", tag.posts.length);
            throw (`${queryName} -> tag.countPosts !== tag.posts.length`);
        }
        let routes = {};
        for (const post of posts) {
            if (!post) {
                console.error(prettyPrint(tag));
                throw (`${queryName} -> post === null || post === undefined`);
            }
            if (post.route in routes) {
                console.log('-----------post before-----------');
                console.log(routes[post.route]);
                console.log('-----------post after -----------');
                console.log(post);

                throw (`${queryName} -> duplicate route : ${post.route}`);
            }
            //console.log(`   ${post.route}`);
            routes[post.route] = post;

            let tagNames = {};

            if (!post.tags.some(el => el.name === tag.name)) {
                throw (`${queryName} -> tag not found in post.tags`);
            }

            for (const tag of post.tags) {
                if (tag === null) {
                    console.log('---------- post --------------');
                    console.log(post);
                    //console.error(prettyPrint(post));
                    console.log('------------------------------');
                    throw (`${queryName} -> level 2 tag === null`);
                }
                if (tag.name in tagNames) {
                    throw (`${queryName} -> duplicate tag : ${tag.name}`);
                }

                //console.log(`       ${tag.name}`);
                tagNames[tag.name] = true;
            }
        }
    }
    console.log("+++++++++++ tags checked ++++++++++++++");
}

async function queryUsers(schema) {
    let query = `query {
        users {
            username
            email
        }
    }`;

    let root = {}, context = {}, variableValues = {};

    return graphql(schema, query);
}

async function queryHello(schema) {
    let query = '{ hello }';
    let root = {}, context = {}, variableValues = {};

    return graphql(schema, query);
}

function printEntities(entities) {
    for (const entity of entities) {
        console.log("------------------------------");
        console.log(`           ${entity.name}`);
        console.log("------------------------------");
        for (const field of entity.fields) {
            let type = field.type;
            if (field.list) {
                type = '[' + field.type;
                if (field.listNonNull) {
                    type += '!]';
                } else {
                    type += ']';
                }
            }
            console.log(`   ${field.name} : ${type} `);
        }
    }
}

async function genSchema(clientEntities) {
    //--------------------------------------
    console.log('++++++++++++++++  entities  +++++++++++++++++');
    let arr = [];
    for (const entity of clientEntities) {
        //console.log(`----------------${entity.name}------------------`);
        arr.push(`"""
${entity.description}
"""
type ${entity.name} @entity(plural: "${entity.plural}") {`);

        for (const field of entity.fields) {
            //if(field.name === 'id' || field.name === 'name' || field.name === 'title'){
            /*             if(field.name === 'content'){
                            console.log(field);
                        } */

            let type = field.type;
            if (field.list) {
                type = '[' + field.type;
                if (field.listNonNull) {
                    type += '!]';
                } else {
                    type += ']';
                }
            }

            let compute = '';
            if (field.compute) {
                compute = ` @compute(${field.compute["length"] ? 'length: true, ' : ''}${field.compute.hash ? 'hash: SHA1' : ''})`;
            }

            let nonNull = ' ';
            if (field.nonNull) {
                nonNull = '! ';
            }

            let unique = '';
            if (field.unique) {
                nonNull = ' @unique';
            }

            let required = '';
            if (field.required) {
                required = ' @required';
            }

            if (field.enum) {
                logl(`${entity.name}.${field.name} * enum * `, field.enum);
            }

            arr.push(`  ${field.name}: ${type}${nonNull}${unique}${required}${compute}`);
        }
        arr.push('}\r\n\r\n');
    }

    console.log(arr.join('\r\n'));
}