// import { MongoMemoryServer } from 'mongodb-memory-server';
import { addMockFunctionsToSchema } from 'graphql-tools';
import * as hash from 'object-hash';
//var hash = require('object-hash');
//import { find } from './db';

let Db = require('mongodb').Db,
  MongoClient = require('mongodb').MongoClient,
  Server = require('mongodb').Server,
  ObjectID = require('mongodb').ObjectID,
  assert = require('assert');

/* const mongod = new MongoMemoryServer({
  "instance": {
    port: 4444, // by default choose any free port
    dbName: "fake", // by default generate random dbName
  }
}); */

let collation = { 'locale': "ru", 'strength': 3 };
let default_language = "russian";
//{ collation: { locale: "en", strength: 1 } }

export let db;

export async function connect(): Promise<any> {
  /*   const mongoUri = await mongod.getConnectionString();
    const dbName = await mongod.getDbName();
    console.log(': mongoUri :', mongoUri); */

  let client = await MongoClient.connect("mongodb://localhost:27017/fake", { 'useNewUrlParser': true, 'useUnifiedTopology': true });

  db = client.db("fake");
  assert.ok(db != null);
  console.log('---------  Mongo connected  ---------');

  return db;
}

/* export async function connect(): Promise<any> {
  const mongoUri = await mongod.getConnectionString();
  const dbName = await mongod.getDbName();

  let client = await MongoClient.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  db = client.db(dbName);
  assert.ok(db != null);

  return db;
} */

function simple() {
  let Posts = db.collection('Posts');

  Posts.insert({ 'name': 'Drake', 'email': 'drake@mail.ru' });
  Posts.insert({ 'name': 'Fox', 'email': 'fox@mail.ru' });

  let cursor = Posts.find();

  cursor.each(function (err, doc) {
    console.log(doc);
  });

  /*   let result = await Posts.findOne({'name': 'Fox'});
  console.log(result); */
}


function findEmptyList(collectionName: string, fieldName) {
  let collection = db.collection(collectionName);
  return collection.find({ [fieldName]: { $exists: true, $size: 0 } })
}

async function findMinList(collectionName: string, fieldName) {
  let collection = db.collection(collectionName);
  let cursor = collection.aggregate([
    {
      "$project": {
        "_id": 1,
        "length": { "$size": { "$ifNull": [`$${fieldName}`, []] } }
        //"length": { "$size": `$${fieldName}` }
      }
    },
    { "$sort": { "length": 1 } },
    { "$limit": 1 }
  ]);

  let result = await cursor.toArray();
  return result[0];

  /*   collection.update({ "_id": result._id }, { "$push": { "tags": "one" } });
  
    cursor = collection.find();
  
    cursor.each(function (err, doc) {
      console.log(doc);
    }); */

  /*   cursor.each(function (err, doc) {
      console.log(doc);
    });
   */
}

export async function find(collectionName: string, fieldName: string, fieldValue) {
  let collection = db.collection(collectionName);
  return collection.findOne({ [fieldName]: fieldValue });
}

async function count(collectionName: string) {
  let result = await db.collection(collectionName).countDocuments(); // estimatedDocumentCount
  console.log(result);
}

async function listAll(collectionName: string) {
  let cursor = db.collection(collectionName).find();

  cursor.each(function (err, doc) {
    console.log(doc);
  });
}

function insert() {
  let inventory = db.collection('inventory');

  inventory.insertMany([
    //{ item: "empty", qty: 0, tags: [], dim_cm: [1, 1] },
    { item: "postcard", qty: 45, tags: ["blue"], dim_cm: [10, 15.25] },
    { item: "journal", qty: 25, tags: ["blank", "red", "blue", "black"], dim_cm: [14, 21] },
    { item: "notebook", qty: 50, tags: ["red", "blank"], dim_cm: [14, 21] },
    { item: "paper", qty: 100, tags: ["red", "blank", "plain"], dim_cm: [14, 21] },
    { item: "planner", qty: 75, tags: ["blank", "red"], dim_cm: [22.85, 30] },
    //{ item: "null", tags: null },
    { item: "undefined" }
  ]);
}

async function update() {
  let inventory = db.collection('inventory');

  let res = await inventory.updateOne(
    //{ _id: 100 },
    { item: "undefined1" },
    {
      $set:
      {
        quantity: 500,
        details: { model: "14Q3", make: "xyz" },
        tags: ["coats", "outerwear", "clothing"]
      }
    }
  );

  // result: { n: 1, nModified: 1, ok: 1 }
  // { n: 0, nModified: 0, ok: 1 }
  console.log(res.result);

}

async function addToSet(collection, id, fieldName, value) {
  let addToSetResult = await collection.updateOne(
    { "_id": id },
    { "$addToSet": { [fieldName]: value } }
  );

  console.log(': upsertedId :> ', addToSetResult.upsertedId);
  console.log(': result :> ', addToSetResult.result);
  console.log(': modifiedCount :> ', addToSetResult.modifiedCount);
  return addToSetResult;
}

function temp() {
  //count('inventory');

  //let res = await find('inventory', "qty", 100);
  //let res = await find('inventory', "tags", null);

  //let res = await inventory.findOne( { "tags" : { "$exists": false } } );
  //let res = await inventory.findOne( { "$or" : [{ "tags" : null }, { "tags" : { "$exists": false } }] });

}

async function computeSize(collection, id, fieldName) {
  let res = await collection.aggregate(
    [
      { "$match": { '_id': id } },
      {
        '$group': {
          '_id': '$id',
          'count': { '$first': { '$size': { "$ifNull": ['$' + fieldName, []] } } }
          //'count': { '$size': '$' + fieldName }
        }
      }
    ]
  ).toArray();

  /*   {
      "$project": {
        "_id": 1,
        "length": { "$size": { "$ifNull": [`$${fieldName}`, []] } }
        //"length": { "$size": `$${fieldName}` }
      }
    }, */

  if (!res || !res.length) {
    throw (`document with id ( ${id} ) not found`);
  }

  return res[0].count;
}

function testComputeSize() {
  /*   let inventory = db.collection('inventory');
  
    insert(); */

  //listAll('inventory');

  /* 
    let result = await findMinList('inventory', fieldName);
    console.log('++++++++findMinList result ++++++++');
    console.log(result);
   */
  //let res = await addToSet(inventory, result["_id"], fieldName, "min1");
  /*   console.log('++++++++ addToSet result ++++++++');
    console.log(result); */

  //res = await addToSet(inventory, result["_id"], fieldName, "min1");
  /*   console.log('++++++++ addToSet result ++++++++');
    console.log(result); */
  /*  
    await addToSet(inventory, result["_id"], fieldName, "min2"); */

  ///update();

  //listAll('inventory');

  /*   console.log('----------------- computeSize ------------------');
  
    let arr = ["planner", "paper", "postcard", "journal", "undefined"];
    for(const a of arr){
      let object = await inventory.findOne({ "item": a });  // size == 3
      let size = await computeSize(inventory, object["_id"], "tags");
      console.log(`${a} : ${size}`);
    } */
}
// For an ascending index type, specify 1 for <type>.

async function createIndexes_(collectionName: string, options) {
  let collection = db.collection(collectionName);

  let hash = {};
  const indexes = await collection.indexInformation({ 'full': true });
  for (let index of indexes) {
    if (index.name === '_id_') {
      continue;
    }
    hash[index.name] = index;
  }

  let forCreate = {}, forDelete = {};

  for (const opt of options) {
    let arr = [];
    if (!opt["key"]) {
      throw ("index option not contain field 'key' !");
    }
    let keys = Object.keys(opt["key"]).sort();

    for (const key of keys) {
      arr.push(key);
      arr.push(opt["key"][key]);
    }
    if (opt["unique"]) {
      arr.push("unique");
    }
    if (opt["sparse"]) {
      arr.push("sparse");
    }
    /*     if(opt["partial"]){
          arr.push("partial"); // partialFilterExpression 
        } */
    let indexName = arr.join('_');

    if (indexName in hash) {
      hash[indexName].check = true;
      console.log('index already exists !', indexName);
    } else {
      console.log('need create index', indexName);
      forCreate[indexName] = opt;
      let o = { 'name': indexName, collation };
      if (opt["unique"]) {
        o["unique"] = true;
      }
      if (opt["sparse"]) {
        o["sparse"] = true;
      }
      await collection.createIndex(opt["key"], o);
    }
  }

  for (const indexName in hash) {
    let index = hash[indexName];
    if (!index.check) {
      forDelete[indexName] = true;
      await collection.dropIndex(indexName);
    }
  }
}

function check1() {
  // sparse
  // 'name':
  //  let collection = db.collection("Post");

  /*   await collection.createIndex({ 'name': -1 }, {'name': 'name_-1_unique', 'unique': true, collation }); // 'name': 'name', 
    await collection.createIndex({ 'name': 1, 'slug': -1 }, {'name': 'name_1_slug_-1', collation }); // 'name': 'name_slug'
    await collection.createIndex({ 'name': 1, 'slug': -1, 'route': 1 }, {'name': 'name_1_slug_-1_route_1', collation }); // 'name': 'name',  */

  /*   let indexStats = await collection.aggregate([{ '$indexStats': {} }]).toArray();
  
    console.log('-------------- indexStats ---------------');
    console.log(indexStats);
    console.log('-----------------------------'); */

  /*   const indexes = await collection.indexInformation({ 'full': true });
    console.log('-------------- collection.indexInformation() ---------------');
    console.log(indexes);
    console.log('-----------------------------'); */

  /*   await createIndexes("Post", [{ unique: true, key: { name: -1 } },
    { key: { name: 1, slug: -1 } },
    { key: { name: 1, slug: -1, route: 1 } },
      //{ key: { name: 1, tag: 1 } }
    ]);
  
    console.log('--------------------------------');
  
    await createIndexes("Post", [{ unique: true, key: { name: -1 } },
    { key: { name: 1, slug: -1 } },
    //{ key: { name: 1, slug: -1, route: 1 } },
    { key: { name: 1, tag: 1 } }
    ]);
  
  
    console.log('--------------------------------');
  
    await createIndexes("Post", [{ unique: true, key: { name: 1 } },
    { unique: true, key: { slug: 1 } },
    { unique: true, key: { route: 1, } }
    ]); */
}

function genNameForIndex(indexKey, options) {
  let arr = [];
  if (!indexKey) {
    throw ("index option not contain fields !");
  }
  let fields = Object.keys(indexKey).sort();

  for (const field of fields) {
    arr.push(field);
    arr.push(indexKey[field]);
  }

  if (options) {
    if (options["unique"]) {
      arr.push("unique");
    }
    if (options["sparse"]) {
      arr.push("sparse");
    }
  }

  arr.push(hash(options));

  /*     if(opt["partial"]){
        arr.push("partial"); // partialFilterExpression 
      } */
  return arr.join('_');
}

function ifTextIndex(indexKey) {
  for (const key in indexKey) {
    if (indexKey[key] === "text") {
      return true;
    }
  }
  return false;
}

async function createIndexes(collectionName: string, indexes) {
  let collection = db.collection(collectionName);

  let hash = {};
  const indexesInfo = await collection.indexInformation({ 'full': true });
  for (let info of indexesInfo) {
    if (info.name === '_id_') {
      continue;
    }
    hash[info.name] = info;
  }

  let count = 0;

  for (const index of indexes) {
    let indexKey = index[0];
    let options = index[1];
    if (!options) {
      options = {};
    }

    if (ifTextIndex(indexKey)) {
      console.log(indexKey);
      ++count;
      if (count > 1) {
        throw ("only one text index per collection allowed");
      }

      if (!options["default_language"]) {
        options["default_language"] = default_language;
      }
      if (!options["language_override"]) {
        options["language_override"] = "language";
      }

      options["collation"] = { 'locale': "simple" };
    } else {
      options["collation"] = collation;
    }

    let indexName = genNameForIndex(indexKey, options);

    if (indexName in hash) {
      hash[indexName].check = true;
      console.log('index already exists !', indexName);
    } else {
      options["name"] = indexName;
      await collection.createIndex(indexKey, options);
    }

    for (const indexName in hash) {
      let index = hash[indexName];
      if (!index.check) {
        await collection.dropIndex(indexName);
      }
    }
  }
}

async function checkCreateIndex() {
  let collection = await db.createCollection("Post", { collation });

  /*   // await collection.createIndex({ 'slug': 1, 'route': -1, 'notes': 'text' }, { 'collation': { 'locale': "simple" } });
    await collection.createIndex({ 'title': 1 }, { 'unique': true });
    await collection.createIndex({ 'slug': 1 }, { 'unique': true, 'sparse': true });
    await collection.createIndex({ 'route': 1 }, { 'unique': true, 'sparse': true });
    await collection.createIndex({ 'route': 'hashed' });
    // planner returned error: failed to use text index to satisfy $text query (if text index is compound, are equality predicates given for all prefix fields?)
    await collection.createIndex({ 'priority': 1, 'title': 'text', 'keywords': 'text', 'description': 'text', 'content': 'text' }, {
      'weights': {
        'title': 10,
        'keywords': 1,
        'content': 8,
        'description': 7
      },
      "default_language": "russian",
      "language_override": "language",
      'collation': { 'locale': "simple" }
    }); */

  let indexes = [
    [{ 'title': 1 }, { 'unique': true }],
    [{ 'slug': 1 }, { 'unique': true, 'sparse': true }],
    [{ 'route': 1 }, { 'unique': true, 'sparse': true }],
    [{ 'route': 'hashed' }],
    [{ 'title': 'text', 'keywords': 'text', 'description': 'text', 'content': 'text' },
    {
      'weights': {
        'title': 10,
        'keywords': 1,
        'content': 8,
        'description': 7
      }
    }
    ]
  ];

  await createIndexes("Post", indexes);

  await collection.insertMany([
    { "title": "Петров", "content": "Иван Геннадьевич", "keywords": "Кирилл", 'priority': 1, "tags": ["one", "two", "free", "four", "five"] },
    { "title": "Филатов", "content": "Иван Васильевич", "keywords": "Сергей", 'priority': 0.5, "tags": ["one", "two", "free", "four"] },
    { "title": "Соболев", "content": "Евгений Александрович", "keywords": "Иван", 'priority': 0.5, "tags": ["one", "two"] },
    { "title": "Широков", "content": "Антон Васильевич", "keywords": "Игорь", 'priority': 1, "tags": ["one"] },
    { "title": "Тарасов", "content": "Роман Андреевич", "keywords": "Иван", 'priority': 0.7, "tags": ["one", "two", "free", "four", "five", "six"] },
    { "title": "Пусто", 'priority': 0 },
  ]);

  console.log(await collection.find({ 'priority': 0.5, '$text': { '$search': 'Иван' } }).toArray());
}

async function checkContact() {
  let contact = await db.createCollection("contact", { collation });
  contact.insertMany([
    { "surname": "Петров", "name": "Иван Геннадьевич", "son": "Кирилл", age: 5 },
    { "surname": "Филатов", "name": "Иван Васильевич", "son": "Сергей", age: 10 },
    { "surname": "Соболев", "name": "Евгений Александрович", "son": "Иван", age: 3 },
    { "surname": "Широков", "name": "Антон Васильевич", "son": "Игорь", age: 8 },
    { "surname": "Тарасов", "name": "Роман Андреевич", "son": "Иван", age: 7 }
  ]);

  //contact.createIndex({"name": "text", "son": "text"}, {'default_language': "russian", 'collation': { 'locale': "simple" }});
  contact.createIndex({ "name": "text", "son": "text" },
    {
      "weights": { 'name': 1, 'son': 2 },
      'default_language': "russian",
      'collation':
        { 'locale': "simple" }
    });

  console.log(await contact.find({ '$text': { '$search': 'Иван' } }).toArray());

  // console.log(await contact.find().toArray());
}

async function start() {
  let db = await connect();

  // checkContact();
  //checkCreateIndex();
  computeManySizesVirtual();
}

start();

/*
[ { v: 2, key: { _id: 1 }, name: '_id_', ns: 'fake.Post' },
  { v: 2,
    unique: true,
    key: { name: 1 },
    name: 'name_1',
    ns: 'fake.Post',
    collation:
     { locale: 'ru',
       caseLevel: false,
       caseFirst: 'off',
       strength: 3,
       numericOrdering: false,
       alternate: 'non-ignorable',
       maxVariable: 'punct',
       normalization: false,
       backwards: false,
       version: '57.1' } },
  { v: 2,
    key: { name: 1, slug: 1 },
    name: 'name_1_slug_1',
    ns: 'fake.Post',
    collation:
     { locale: 'ru',
       caseLevel: false,
       caseFirst: 'off',
       strength: 3,
       numericOrdering: false,
       alternate: 'non-ignorable',
       maxVariable: 'punct',
       normalization: false,
       backwards: false,
       version: '57.1' } },
  { v: 2,
    key: { name: 1, slug: 1, route: 1 },
    name: 'name_1_slug_1_route_1',
    ns: 'fake.Post',
    collation:
     { locale: 'ru',
       caseLevel: false,
       caseFirst: 'off',
       strength: 3,
       numericOrdering: false,
       alternate: 'non-ignorable',
       maxVariable: 'punct',
       normalization: false,
       backwards: false,
       version: '57.1' } } ]
*/

async function computeManySizesVirtual() {
  //let tags_id_str = ["5da1c5b97eb5614b30791906", "5da1c04952136f3d9c1bf152"];
  let tags_id = [ObjectID("5da1c5b97eb5614b30791906"), ObjectID("5da1c04952136f3d9c1bf152")];

  /*   console.log(await db.collection("Post").countDocuments());
    return; */

  let res = await db.collection("Post").aggregate([
    { "$match": { "tags": { "$in": tags_id } } },
    { "$unwind": "$tags" },
    { "$match": { "tags": { "$in": tags_id } } },
    { "$group": { "_id": "$tags", "count": { "$sum": 1 } } },
  ]).toArray();

  console.log(res);

  res = await db.collection("Tag").find({ "_id": { "$in": tags_id } }, { "_id": 1, "countPosts": 1 }).toArray();
  console.log(res);
}

