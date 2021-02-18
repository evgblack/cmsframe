import * as crypto from 'crypto';
import * as hash from 'object-hash';
import * as moment from 'moment';
import { MongoClient } from 'mongodb';
import * as assert from 'assert';
import { transformOperation } from 'apollo-link/lib/linkUtils';
const slug = require('limax');
const ObjectID = require('mongodb').ObjectID;

let db, schema;
let dbVersion;

let collation = { 'locale': "ru", 'strength': 3 };
let default_language = "russian";

export function setSchema(_schema) {
    schema = _schema;
}

export async function connect(): Promise<any> {
    const dbName = "fake";
    const mongoUri = `mongodb://localhost:27017/${dbName}`;

    const client = await MongoClient.connect(mongoUri, { 'useNewUrlParser': true, 'useUnifiedTopology': true });

    db = client.db(dbName);
    assert.ok(db != null);
    console.log('---------  Mongo connected  ---------');

    return db;
}

export async function count(collectionName): Promise<Number> {
    return db.collection(collectionName).countDocuments(); // estimatedDocumentCount
}

export async function find(collectionName: string, fieldName: string, fieldValue) {
    let collection = db.collection(collectionName);
    return collection.findOne({ [fieldName]: fieldValue });
}

export function getCollection(collectionName: string) {
    return db.collection(collectionName);
}

export async function findNotExist(collectionName: string, fieldName: string) {
    return db.collection(collectionName).findOne({ "$or": [{ [fieldName]: null }, { [fieldName]: { "$exists": false } }] });
}

export async function findAndProcess(entity, args) {
    let limit = args.limit ? args.limit : 100;
    let result = await db.collection(entity.name).find().limit(limit).toArray();
    let count = 0;

    for (let doc of result) {
        if (!doc) {
            ++count;
            console.log('~~~', count);
            return;
            //throw("document not found !");
        }
        for (const field of entity.fields) {
            if (field.name === "_id") {
                continue;
            }
            if (!(field.name in doc)) {
                continue;
                //throw(`field (${field.name}) not exist in document (${entity.name}) !`);
            }
            if (field.type === "DateTime") {
                doc[field.name] = moment(doc[field.name]).format(field.format);
            }
        }
    }

    return result;
    //return { [entity.plural]: result };
}

export async function findOneAndProcess(entity, id) {
    let _id = ObjectID(id);
    let doc = await db.collection(entity.name).findOne({_id});

    if(!doc){
        return null;
    }

    for (const field of entity.fields) {
        if (field.name === "_id") {
            continue;
        }
        if (!(field.name in doc)) {
            continue;
            //throw(`field (${field.name}) not exist in document (${entity.name}) !`);
        }
        if (field.type === "DateTime") {
            doc[field.name] = moment(doc[field.name]).format(field.format);
        }
    }

    return doc;
}

/* export function findList(collectionName: string, ids: Array<string>) {
    let collection = getCollection(collectionName);

    let list = [];
    for (const id of ids) {
        let rec = collection.find((elem) => (elem["id"] === id));
        list.push(rec);
    }

    return list;
} */

export async function findList(collectionName: string, ids: Array<string>, args) {
    if (!ids || !ids.length) {
        return [];
    }
    let limit = args.limit ? args.limit : 100;

    return db.collection(collectionName).find({ '_id': { '$in': ids } }).limit(limit).toArray();
}

export async function findVirtualList(parent, entity, field, args) {
    let relation = entity.relations[field.name];
    let toColl = db.collection(field.type);
    let back = relation.back;
    let limit = args.limit ? args.limit : 100;

    // db.Post.find({"author": ObjectId("5da1c6487eb5614b307923cd")})

    return toColl.find({ [back.name]: parent._id }).limit(limit).toArray();
}

/* export function findEmptyList(collectionName: string, fieldName) {
    let collection = getCollection(collectionName);
    if (collection.length === 0) {
        return null;
    }
    for (let elem of collection) {
        if (elem[fieldName] && elem[fieldName].length === 0) {
            return elem;
        }
    }
} */

export async function findEmptyList(collectionName: string, fieldName) {
    return db.collection(collectionName).findOne({ [fieldName]: { $exists: true, $size: 0 } })
}

export async function findMinList(collectionName: string, fieldName) {
    let collection = db.collection(collectionName);
    let cursor = collection.aggregate([
        {
            "$project": {
                "_id": 1,
                //"length": { "$size": `$${fieldName}` }
                "length": { "$size": { "$ifNull": [`$${fieldName}`, []] } }
            }
        },
        { "$sort": { "length": 1 } },
        { "$limit": 1 }
    ]);

    let result = await cursor.toArray();
    if (!result || !result[0]) {
        return null;
    }
    return collection.findOne({ '_id': result[0]._id });
}

/* export function append(collectionName, data) {
    let collection = getCollection(collectionName);
    collection.push(data);
} */

function niceHash(buffer) {
    return crypto
        .createHash('sha256')
        .update(buffer)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\//g, '-')
        .replace(/\+/, '_');
}

// TODO: Нужно сделать проверки какие данные изменились чтобы апдейтить только те поля, которые реально поменялись
export async function computeFields(entity, data) {
    if (!entity.computedFields) {
        //console.log(`Entity (${entity.name}) not have computed fields`);
        return;
    }

    for (const fieldName in entity.computedFields) {
        let field = entity.computedFields[fieldName];
        let computed = field.computed;

        //  {"return": "String", "what": "hash", "field": field.name, "alg": compute};
        switch (computed.alg) {
            case 'slug':
                if (!data[fieldName] && (computed.from in data)) {
                    data[fieldName] = slug(data[computed.from]);
                }
                break;

            case 'route':
                if (!data[fieldName] && (computed.from in data)) {
                    data[fieldName] = '/' + data[computed.from];
                }
                break;

            case 'hash':
                if (computed.from in data) {
                    data[fieldName] = niceHash(data[computed.from]);
                }
                break;

            case 'length':
                if (computed.from in data) {
                    data[fieldName] = data[computed.from].length;
                } else {
                    data[fieldName] = 0;
                }
                break;

            case 'DateTimeOnce':
                if (!data[field.name]) {
                    data[field.name] = new Date();
                }
                break;

            case 'DateTime':
                data[field.name] = new Date();
                break;
        }
    }

    return;
}

async function computeSize(collection, entity, fieldName, to, isArray) {
    let computed = entity.computeSize[fieldName];

    if (computed) {
        let set = [
            { "$set": { [computed.name]: { '$size': { "$ifNull": ["$" + fieldName, []] } } } }
        ];

        if (isArray) {

            await collection.updateMany(
                { "_id": { "$in": to } },
                set
            );

        } else {

            await collection.updateOne(
                { "_id": to },
                set
            );
        }
    }
}

// id = author (id )
// entity = User
// coll = User
// toColl = Post
// fieldName = "posts"
// backName = "author"
async function computeSizeVirtual(id, entity, coll, toColl, fieldName, backName) {
    let computed = entity.computeSize[fieldName];
    if (computed) {
        let count = await toColl.find({ [backName]: id }).count();
        // let count = await Post.find({"author": id}).count();

        await coll.updateOne({ '_id': id }, { '$set': { [computed.name]: count } });
        // await User.updateOne({'_id': id}, {'$set': {"countPosts": count}});
    }
}

/*
flag :
1 - create
2 - update
3 - remove

append - appended "id" to relation fields
*/

export async function updateRelations(entity, record, append = null, remove = null) {
    let id = record["_id"];
    let coll = db.collection(entity.name);

    for (const fieldName in entity.relations) {
        let to = record[fieldName]; // Один id-шник или массив id-шников. Если relation.to.list === true, тогда это массив

        // TODO: "to" это может быть список удалённых или добавленных. Надо по разному обработать

        let relation = entity.relations[fieldName];
        let toType = relation.to.type;
        let toColl = db.collection(toType);
        let toEntity = schema.entities.hash[toType];
        let back = relation.back;

        if (relation.to.list) {
            let append_ids, remove_ids, changed_ids;

            if (to) {
                append_ids = to;
            }

            if (append && append[fieldName]) {
                if (!append_ids) {
                    append_ids = append[fieldName];
                } else {
                    append_ids.push(append[fieldName]);
                }
            }

            changed_ids = append_ids;

            if (remove && remove[fieldName]) {
                remove_ids = remove[fieldName];
                if (!changed_ids) {
                    changed_ids = remove_ids;
                } else {
                    changed_ids.push(remove_ids);
                }
            }

            if (!changed_ids || !changed_ids.length) {
                continue;
            }

            if (back) {
                if (back.list) {
                    if (back.virtual) {
                        // Post.tags -> Tag.posts
                        //console.log("!!!! relation.back.virtual !!!!");
                        //console.log(`(${entity.name}.${fieldName}) --> (${toEntity.name}.${back.name})`);
                        //await computeSizeVirtual(id, toEntity, coll, toColl, fieldName, back.name);

                        if (!relation.to.virtual) {
                            if (toEntity.computeSize) {
                                let computed = toEntity.computeSize[back.name];

                                if (computed) {
                                    let res = await coll.aggregate([
                                        { "$match": { [fieldName]: { "$in": changed_ids } } },
                                        { "$project": { "_id": 1, [fieldName]: 1 } },
                                        { "$unwind": '$' + fieldName },
                                        { "$match": { [fieldName]: { "$in": changed_ids } } },
                                        { "$group": { "_id": '$' + fieldName, "count": { "$sum": 1 } } },
                                    ]).toArray();
                                    //console.log(res);
                                    //console.log(': set : ', computed.name);

                                    let batch = toColl.initializeUnorderedBulkOp({ 'useLegacyOps': true });
                                    for (const rec of res) {
                                        batch.find({ "_id": rec["_id"] }).updateOne({ '$set': { [computed.name]: rec["count"] } });
                                    }
                                    batch.execute(() => { });
                                }
                            }
                        } else {
                            // TODO : будет использоваться 3-я коллекция которая связывает первые 2-е
                        }
                    } else {

                        await toColl.updateMany(
                            { "_id": { "$in": append_ids } },
                            { "$addToSet": { [back.name]: id } }
                        );

                        await toColl.updateMany(
                            { "_id": { "$in": remove_ids } },
                            //{ "$pullAll": { [back.name]: [id] } }
                            { "$pull": { [back.name]: id } }
                        );

                        await computeSize(toColl, toEntity, back.name, changed_ids, true);
                    }
                } else {
                    toColl.updateMany(
                        { "_id": { "$in": append_ids } },
                        { "$set": { [back.name]: id } }
                    );
                }
            } else {
                if (relation.to.virtual) {
                    throw ("If 'virtual' field, need back relation");
                } else {
                    // TODO : 
                }
            }

            if (!relation.to.virtual) {
                await computeSize(coll, entity, fieldName, id, false);
            }

        } else {
            if (!to || !back) {
                continue;
            }

            if (back.list) {
                // Post.author -> User.posts

                if (relation.back.virtual) {
                    await computeSizeVirtual(to, toEntity, toColl, coll, back.name, fieldName);
                } else {
                    await toColl.updateOne(
                        { "_id": to },
                        { "$addToSet": { [back.name]: id } }
                    )

                    await computeSize(toColl, toEntity, back.name, to, false);
                }

            } else {
                toColl.updateOne(
                    { "_id": to },
                    { "$set": { [back.name]: id } }
                );
            }
        }
    }
}

export async function setRelationList(backCollectionName, backId, backFieldName, ids) {
    return db.collection(backCollectionName).updateOne(
        { "_id": backId },
        { "$addToSet": { [backFieldName]: ids } }
    )
}

export async function setRelation(backCollectionName, backId, backFieldName, id) {
    return db.collection(backCollectionName).updateOne(
        { "_id": backId },
        { "$set": { [backFieldName]: id } }
    );
}

function stringToObjectID(entity, data) {
    for (const fieldName in entity.relations) {
        let relation = entity.relations[fieldName];
        if (relation.to.list) {
            let to = data[fieldName];
            for (let ind in to) {
                to[ind] = ObjectID(to[ind]);
            }
        }
    }
}

export async function createEntity(entity, data) {
    let collection = db.collection(entity.name);

    computeFields(entity, data);

    for (const fieldName in entity.computeSize) {
        let compute = entity.computeSize[fieldName];
        if (data[fieldName]) {
            data[compute.name] = data[fieldName].length;
        } else {
            data[compute.name] = 0;
        }
    }

    stringToObjectID(entity, data);

    //console.log('----------------------');
    //console.log(data);

    let result = await collection.insertOne(data);

    /*     console.log('------------- insertOne -------------');
        console.log("insertedCount : ", result.insertedCount);
        console.log("insertedId : ", result.insertedId);
        console.log('-------------  -------------');
        console.log(result.ops[0]); */

    if (result.insertedCount) {
        let record = result.ops[0];

        await updateRelations(entity, record);

        return { [entity.singular]: record };
    }
}

/* export function deleteFieldFromEntity(entityName, fieldName) {
    let collection = getCollection(entityName);
    for (let record of collection) {
        delete record[fieldName];
    }
} */
/* export function getAllRecords(entityName) {
    return getCollection(entityName);
} */

// TODO: проверить уникальность айдишников 
function arrayObjectID(array) {
    for (let ind in array) {
        array[ind] = ObjectID(array[ind]);
    }
}

export async function deleteEntity(entity, id) {
    let collection = db.collection(entity.name);
    let _id = ObjectID(id);
    let record = await collection.findOne({ _id });
    let res = await collection.deleteOne({ _id });

    if (res.result && res.result.ok) {
        if (res.deletedCount) {
            let relations = schema.relations[entity.name];

            for (const rel of relations) {
                let field = rel.field;
                let relColl = db.collection(rel.entity.name);

                console.log("rel.entity.name : ", rel.entity.name);
                console.log('field : ', field);

                if (field.list) {
                    console.log('>>list');
                    if (field.virtual) {
                        console.log('>>virtual : ');
                        // ------
                        let ids;

                        let fields = entity.fieldsHashByType[rel.entity.name];
                        console.log('back fields : ', fields);

                        if(fields.length === 1){
                            ids = record[fields[0].name];
                        }else{
                            ids = [];
                            for(const field of fields){
                                ids.push(record[field.name]);
                            }
                        }

                        console.log('ids : ', ids);
                        if (rel.entity.computeSize && ids && ids.length) {
                            let computed = rel.entity.computeSize[field.name];
                            if (computed) {
                                console.log("computed : ", computed);
                                let res = await relColl.updateMany({ '_id': { "$in": ids } }, {'$inc': {[computed.name]: -1}});
                                console.log('$inc.result :', res.result);
                            }
                        }
                    } else {
                        let ids = [];
                        let objects = await relColl.find(
                            { [field.name]: _id },
                            { '_id': 1 }
                        ).toArray();

                        for (let obj of objects) {
                            ids.push(obj._id);
                        }

                        console.log("ids : ", ids);

                        if (!ids || !ids.length) {
                            continue;
                        }

                        let pullResult = await relColl.updateMany(
                            { '_id': { '$in': ids } },
                            { "$pull": { [field.name]: _id } }
                        );

                        console.log("pullResult : ", pullResult.result);
                        // $pull res.result :  { n: 4, nModified: 4, ok: 1 }

                        if (rel.entity.computeSize) {
                            let computed = rel.entity.computeSize[field.name];
                            if (computed) {
                                //await computeSize(relColl, rel.entity, field.name, _id, false);
                                console.log("computed.name : ", computed.name);
                                console.log("field.name : ", field.name);

                                let computeSizeResult = await relColl.updateMany(
                                    { '_id': { '$in': ids } },
                                    [{ "$set": { [computed.name]: { '$size': { "$ifNull": ["$" + field.name, []] } } } }]
                                );

                                console.log("computeSizeResult : ", computeSizeResult.result);
                            }
                        } else {

                        }
                    }
                } else {
                    await relColl.updateOne(
                        { [field.name]: _id },
                        { "$unset": {[field.name]: 1 }} // TODO: check non null fields
                    );
                }
            }
        }
        return !!res.deletedCount;
    }

    throw (res);
}

/*
if (field.list) {
    if (field.virtual) {
        if (rel.entity.computeSize) {
            let computed = rel.entity.computeSize[field.name];
            if (computed) {
                relColl.updateMany({ '_id': { "$in": record[field.name] } }, {'$inc': {[computed.name]: -1}});
            }
        }
    } else {
        let ids = [];
        let objects = await relColl.find(
            { [field.name]: _id },
            { '_id': 1 }
        ).toArray();

        for (let obj of objects) {
            ids.push(obj._id);
        }

        console.log("ids : ", ids);

        if (!ids || !ids.length) {
            continue;
        }

        let res = await relColl.updateMany(
            { '_id': { '$in': ids } },
            { "$pull": { [field.name]: _id } }
        );

        console.log("$pull res.result : ", res.result);
        // $pull res.result :  { n: 4, nModified: 4, ok: 1 }

        if (rel.entity.computeSize) {
            let computed = rel.entity.computeSize[field.name];
            if (computed) {
                //await computeSize(relColl, rel.entity, field.name, _id, false);
                console.log("computed.name : ", computed.name);
                console.log("field.name : ", field.name);

                let res2 = await relColl.updateMany(
                    { '_id': { '$in': ids } },
                    { "$set": { [computed.name]: { '$size': { "$ifNull": ["$" + field.name, []] } } } }
                );

                console.log("computeSize res.result : ", res.result);
            }
        } else {

        }
    }
} else {
    await relColl.updateOne(
        { [field.name]: _id },
        { [field.name]: null } // TODO: check non null fields
    );
}
*/

// временная функция
async function updateSizes(entity, record){
    let collection = db.collection(entity.name);
    for (const fieldName in entity.relations) {
        let to = record[fieldName];
        let relation = entity.relations[fieldName];
        let toType = relation.to.type;
        let toColl = db.collection(toType);
        let toEntity = schema.entities.hash[toType];
        let back = relation.back;

        if (back) {
            if (back.list) {
                if (back.virtual) {
                    let computed = toEntity.computeSize[back.name];

                    if (computed) {
                        toColl.updateMany({ '_id': { "$in": to } }, {'$inc': {[computed.name]: -1}});

                        let res = await collection.aggregate([
                            { "$match": { [fieldName]: { "$in": to } } },
                            { "$project": { "_id": 1, [fieldName]: 1 } },
                            { "$unwind": '$' + fieldName },
                            { "$match": { [fieldName]: { "$in": to } } },
                            { "$group": { "_id": '$' + fieldName, "count": { "$sum": 1 } } },
                        ]).toArray();
                        console.log(res.result);
                        console.log(': back.name : ', back.name);
    
                        let batch = toColl.initializeUnorderedBulkOp({ 'useLegacyOps': true });
                        for (const rec of res) {
                            batch.find({ "_id": rec["_id"] }).updateOne({ '$set': { [computed.name]: rec["count"] } });
                        }
                        batch.execute(() => { });
                    }
                }
            }
        }
    }
}


export async function updateEntity(entity, input) {
    let collection = db.collection(entity.name);
    console.log('-----------  updateEntity  -----------');
    console.log(input);
    if (!input.where || !input.where.id) {
        throw ("!input.where.id");
    }

    let update = {};
    let { set, unset, addToSet, push, pull, pullAll } = input;
    let flag = 0;
    let $addToSet = {}, $pull = {}, $pullAll = {}, $push = {}, $unset = {};
    let flagAddToSet, flagPull, flagPullAll, flagPush, flagUnset;
    let append = null, remove = null;

    if (set) {
        update["$set"] = set;
    }

    if (unset) {
        for (let fieldName of unset) {
            let field = entity.fieldsHashByName[fieldName];

            if (field && field.nonNull) {
                continue;
            }

            if (fieldName in set) {
                delete set[fieldName];
            }

            $unset[fieldName] = 1;
            flagUnset = true;
        }
    }

    if (flagUnset) {
        console.log("$unset ", $unset);
        update["$unset"] = $unset;
    }

    if (addToSet) {
        for (let fieldName in addToSet) {
            let values = addToSet[fieldName];
            if (values && values.length) {
                let field = entity.fieldsHashByName[fieldName];
                if (field && field.isEntityType) {
                    arrayObjectID(values);
                    if (!append) {
                        append = {};
                    }
                    if (!append[fieldName]) {
                        append[fieldName] = values;
                    } else {
                        append[fieldName].push(values);
                    }
                }

                $addToSet[fieldName] = { '$each': values };
                ++flag;
                flagAddToSet = true;
            }
        }
    }

    if (push) {
        for (let fieldName in push) {
            let values = push[fieldName];
            if (values && values.length) {
                let field = entity.fieldsHashByName[fieldName];

                if (field && field.isEntityType) {
                    arrayObjectID(values);
                    if (!append) {
                        append = {};
                    }
                    if (!append[fieldName]) {
                        append[fieldName] = values;
                    } else {
                        append[fieldName].push(values);
                    }
                }

                $push[fieldName] = { '$each': values };
                ++flag;
                flagPush = true;
            }
        }
    }

    /*     if(pull){
            for(let fieldName in pull){
                let values = pull[fieldName];
                if(values && values.length){
                    let field = entity.fieldsHashByName[fieldName];
    
                    if(field.isEntityType){
                        arrayObjectID(values);
                    }
        
                    $pull[fieldName] = {'$in': values};
                    ++flag;
                    flagPull = true;
                }
            }
        } */

    if (pullAll) {
        for (let fieldName in pullAll) {
            let values = pullAll[fieldName];
            if (values && values.length) {
                let field = entity.fieldsHashByName[fieldName];

                if (field && field.isEntityType) {
                    arrayObjectID(values);
                    if (!remove) {
                        remove = {};
                    }
                    if (!remove[fieldName]) {
                        remove[fieldName] = values;
                    } else {
                        remove[fieldName].push(values);
                    }
                }

                $pullAll[fieldName] = values;
                ++flag;
                flagPullAll = true;
            }
        }
    }

    let res;
    let id = ObjectID(input.where.id);

    if (flag < 2) {
        if (flagAddToSet) {
            update["$addToSet"] = $addToSet;
        }
        if (flagPush) {
            update["$push"] = $push;
        }
        if (flagPullAll) {
            update["$pullAll"] = $pullAll;
        }
        res = await collection.updateOne(
            { "_id": id },
            update
        );
    }

    if (flag > 1) {
        let batch = collection.initializeUnorderedBulkOp({ 'useLegacyOps': true });

        if (flagAddToSet) {
            update["$addToSet"] = $addToSet;
            flagAddToSet = false;
        } else {
            if (flagPush) {
                update["$push"] = $push;
                flagPush = false;
            } else {
                if (flagPullAll) {
                    update["$pullAll"] = $pullAll;
                    flagPullAll = false;
                }
            }
        }

        batch.find({ "_id": id }).updateOne(update);

        if (flagPush) {
            batch.find({ "_id": id }).updateOne({ "$push": $push });
        }

        if (flagPullAll) {
            batch.find({ "_id": id }).updateOne({ "$pullAll": $pullAll });
        }

        res = await batch.execute();
    }

    if (res.result && res.result.ok) {
        await updateRelations(entity, { "_id": id }, append, remove);
        return await collection.findOne({ "_id": id });
    }

    throw (res);
}
/*
{
  "errors": [
    {
      "message": "Updating the path 'tags' would create a conflict at 'tags'",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "updatePost"
      ]
    }
  ],
  "data": {
    "updatePost": null
  }
}
*/

export async function checkNonNullFields() {
    for (const entity of schema.entities.array) {
        let collection = db.collection(entity.name);

        for (const fieldName of entity.nonNullFields) {
            let res = await collection.findOne({ "$or": [{ [fieldName]: null }, { [fieldName]: { "$exists": false } }] });

            if (res) {
                throw (`nonNull field (${entity.name}:${fieldName}) === undefined or null`);
            }
        }
    }
}

function genNameForIndex(indexKey, options) {
    let arr = [];
    if (!indexKey) {
        throw ("index option not contain fields !");
    }
    let fields = Object.keys(indexKey); //.sort();

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
        arr.push(hash(options));
    }
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

async function getIndexes(collection) {
    let hash = {};

    let indexes = await collection.indexes();
    for (let ind of indexes) {
        if (ind.name === '_id_') {
            continue;
        }
        hash[ind.name] = ind;
    }

    return hash;
}

export async function createIndexes(entity) {
    console.log(`~~~~~~~~~  ${entity.name}  ~~~~~~~~~`);
    if (!entity.indexes) {
        return;
    }
    let collection = db.collection(entity.name);

    let hash = await getIndexes(collection);

    let count = 0;

    let forCreate = {};

    for (const index of entity.indexes) {
        let indexKey = index[0];
        let options = index[1];
        if (!options) {
            options = {};
        }

        if (ifTextIndex(indexKey)) {
            //console.log("indexKey :", indexKey);
            //console.log("options :", options);
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
        } else {
            options["name"] = indexName;
            forCreate[indexName] = { "key": indexKey, "options": options };
        }
    }

    for (const indexName in hash) {
        let index = hash[indexName];
        if (!index.check) {
            console.log(">>>>>>> drop index : ", indexName);
            await collection.dropIndex(indexName).catch((error) => {
                console.log("Error in collection.dropIndex : ", error.errmsg);
            });
        }
    }

    for (const indexName in forCreate) {
        let index = forCreate[indexName];

        console.log(">>>>>>> create index : ", indexName, index.key);
        await collection.createIndex(index.key, index.options).catch((error) => {
            console.log("Error in collection.createIndex : ", error);
        });
    }
}

async function getCollectionIndexes(collectionName) {
    let collection = db.collection(collectionName);
    /*     console.log('-------------- collection ---------------');
        console.log(collection);
        console.log('-----------------------------'); */

    let indexStats = await collection.aggregate([{ '$indexStats': {} }]).toArray();

    console.log('-------------- indexStats ---------------');
    console.log(indexStats);
    console.log('-----------------------------');

    const stats = await collection.stats();
    console.log('-------------- collection.stats() ---------------');
    console.log(stats);
    console.log('-----------------------------');

    const indexInformation = await collection.indexInformation({ 'full': true });
    console.log('-------------- collection.indexInformation() ---------------');
    console.log(indexInformation);
    console.log('-----------------------------');

    let indexes = await collection.indexes();
    console.log('-------------- collection.indexes() ---------------');
    console.log(indexes);
    console.log('-----------------------------');

    let listIndexes = await collection.listIndexes();
    console.log('-------------- collection.listIndexes() ---------------');
    console.log(listIndexes);
    console.log('-----------------------------');



    let adminDb = db.admin();

    // command(command, options, callback)

    adminDb.serverInfo(async function (err, info) {
        console.log('-------------  serverInfo  ---------------');
        console.log(info);
    });

    /*     adminDb.buildInfo(async function (err, info) {
            console.log('-------------  buildInfo  ---------------');
            console.log(info);
        }); */

    adminDb.listDatabases(async function (err, info) {
        console.log('-------------  listDatabases  ---------------');
        console.log(info);
    });

    //  { 'full': true }
    adminDb.validateCollection("Post", async function (err, info) {
        console.log('-------------  validateCollection  ---------------');
        console.log(info);
    });

    adminDb.serverStatus(async function (err, info) {
        //console.log('info : ', info);
        dbVersion = parseFloat(info.version);
        console.log("MongoDB version : ", dbVersion);

        console.log('-------------  listIndexes  ---------------');
        console.log(info.metrics.commands.listIndexes);
        console.log('-------------  listCollections  ---------------');
        console.log(info.metrics.commands.listCollections);
        console.log('-------------  listCommands  ---------------');
        console.log(info.metrics.commands.listCommands);
        console.log('-------------  listDatabases  ---------------');
        console.log(info.metrics.commands.listDatabases);
        console.log('-------------  createIndexes  ---------------');
        console.log(info.metrics.commands.createIndexes);
        console.log('-------------  hostInfo  ---------------');
        console.log(info.metrics.commands.hostInfo);
        console.log('------------------------------------');
    });


    /*     let collections = await db.listCollections().toArray();
        console.log('-------------  collections  ---------------');
        console.log(util.inspect(collections, true, 5));
        console.log('------------------------------------'); */


    /*     db.getCollectionInfos({'name': 'Post'}, async function (err, info) {
            console.log('-------------  getCollectionInfos  ---------------');
            console.log(info);
        }); */

    //console.log(util.inspect(adminDb, true, 5));

    /*     let res = await adminDb.getIndexes();
        console.log(res); */

    /*     const listIndexes = await collection.indexInformation();
        console.log("listIndexes : ", listIndexes); */

    /*     return indexes.map(it => {
            const usageStats = (() => {
                const stats = (indexStats || []).filter(stat => stat.name === it.name);
                if (_.isEmpty(stats)) return { "usage stats": "not available" };
    
                const formatAccesses = (it) => `${it.ops} since ${it.since.toLocaleString()}`
                if (stats.length > 1) {
                    return {
                        "usage stats": stats.reduce((acc, cur, i) => {
                            acc[i] = {
                                host: cur.host,
                                accesses: formatAccesses(cur.accesses)
                            }
    
                            return acc;
                        }, {})
                    }
                } else {
                    return {
                        ...stats[0],
                        accesses: formatAccesses(stats[0].accesses),
                    }
                }
            })();
    
            const size = indexSizes[it.name];
            const type = (_.find(_.values(it.key), v => _.isString(v)) || "regular").toUpperCase();
            const info = {
                ...it,
                size,
                type,
                ...usageStats,
            }
    
            const commonFields = ["name", "key", "type", "size", "ns", "accesses", "usage stats"];
    
            return _.omitBy({
                ..._.pick(info, commonFields),
                ...{ properties: _.omit(info, [...commonFields, "v", "host"]) },
                ..._.pick(info, "v", "host")
            }, _.isEmpty)
        }); */
}

export function createCollection(name) {
    db.createCollection(name);
}

function keyString(keys) {
    return Object.keys(keys).sort().join('-');
}

function checkIndexOptions(entity) {
    if (!entity.indexes) {
        return;
    }
    let state = hash(entity.indexes);

    let hashByKey = {}, hashByFieldName = {};

    for (let index of entity.indexes) {
        let indexKey = index[0];
        let indexName = genNameForIndex(indexKey, index[1]);

        let check = true;

        for (const name in indexKey) {
            hashByFieldName[name] = indexKey;
            if (!(name in entity.fieldsHashByName)) {
                console.log(`- remove index option for field (${name}) ->`, indexKey);
                check = false;
            }
        }

        if (check) {
            hashByKey[indexName] = index;
        }
    }

    for (const fieldName in entity.relations) {
        let relation = entity.relations[fieldName];
        if (relation.back.virtual) {
            let need = false;

            if (!(fieldName in hashByFieldName)) {
                need = true;
            } else {
                let keys = Object.keys(hashByFieldName[fieldName]);
                if (keys[0] !== fieldName) {
                    need = true;
                }
            }

            if (need) {
                console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
                console.log(`^^^ Need index on ${entity.name}.${fieldName}`);
                entity.indexes.push([{ [fieldName]: 1 }]);
            }
        }
    }

    let result = [];

    for (const indexName in hashByKey) {
        result.push(hashByKey[indexName]);
    }

    if (state !== hash(result)) {
        entity.indexes = result;
    }
}

export async function createCollections() {

    for (const name in schema.entities.hash) {
        let entity = schema.entities.hash[name];
        await db.createCollection(name, { collation }).catch((error) => {
            console.log("Error in createCollection : ", error);
        });;

        checkIndexOptions(entity);

        await createIndexes(entity).catch((error) => {
            console.log("Error in createIndexes : ", error);
        });
    }
}

export async function fixRelations() {
    //await fixRelationsUserPosts();
    await fixAllRelations();
}

async function fixRelationsUserPosts() {
    let User = db.collection("User");
    let userEntity = schema.entities.hash["User"];
    let Post = db.collection("Post");
    let users = await User.find({}).toArray();
    for (let user of users) {
        await updateRelations(userEntity, user);
    }
}

async function fixAllRelations() {
    for (const entityName in schema.entities.hash) {
        let entity = schema.entities.hash[entityName];
        let coll = db.collection(entityName);
        let records = await coll.find({}).toArray();
        for (let rec of records) {
            await updateRelations(entity, rec);
        }
    }
}
