const faker = require('faker');
import * as db from './db';

let schema;

export function setSchema(_schema) {
    schema = _schema;
}

function random() {
    return Math.floor(Math.random() * 100);
}

export function genField(data, field) {
    let val = null;

    if(field.computed){
        return;
    }

    let type = field.type;
    if (type === "String") {

        if (field.name === "username") {
            val = faker.internet.userName();
        } else if (field.name === "content") {
            val = faker.lorem.paragraphs();
        } else if (field.name === "description") {
            val = faker.lorem.paragraph();
        } else if (field.name === "slug" || field.name === "route") {
            data["slug"] = faker.lorem.slug() + '-' + faker.random.uuid();
            data["route"] = "/" + data["slug"];
            return;
        } else if (field.name === "keywords") {
            val = faker.lorem.words().split(" ").join(",");
        } else if (field.name === "width" || field.name === "height") {
            val = String(Math.round(Math.random() * 1000)) + "px";
        } else if (field.name === "mime") {
            val = faker.system.mimeType();
        } else if (field.name === "ext") {
            val = faker.system.fileExt();
        } else if (field.name === "url") {
            val = faker.image.imageUrl() + '/' + faker.random.uuid();
        } else if (field.name === "title") {
            val = faker.random.word() + ' ' + faker.random.word() + ' ' + faker.random.word();
        } else {
            val = faker.random.word();
        }

    } else if (type === "DateTime") {
        val = faker.date.past(100);
    } else if (type === "Float") {
        val = Math.random();
    } else if (type === "Int") {
        val = Math.round(Math.random() * 1000);
    } else if (type === "Boolean") {
        val = faker.random.boolean();
    } else if (type === "JSON") {
        let key1 = faker.random.word().split('.').join(' ');
        let key2 = faker.random.word().split('.').join(' ');
        val = { [key1]: faker.random.word(), [key2]: faker.random.word() };
    } else if (type === "EmailAddress") {
        val = `${faker.internet.userName()}@mail.ru`;
    }

    if (field.enum) {
        val = faker.random.arrayElement(field.enum);
    }

    data[field.name] = val;
}

async function findOrCreate(type, fieldName, isList) {
    let record = await db.findNotExist(type, fieldName);

    if (record) {
        return record;
    }

    if (isList) {
        if (!record) {
            record = await db.findEmptyList(type, fieldName);
        }

        if (!record) {
            record = await db.findMinList(type, fieldName);
        }
    }

    if (!record) {
        record = await generateEntity(type);
    }

    return record;
}

async function generateEntityField(entity, record, fieldName) {
    let relation = entity.relations[fieldName];
    let backRecord;
    let toType = relation.to.type;
    let id = record["_id"];
    let back = relation.back;
    let toEntity = schema.entities.hash[toType];

    let collection = db.getCollection(entity.name);

    if (!back) {
        throw ("generateEntityField : !relation.back ");
    }

    if (relation.to.list) {
        for (let i = 0, len = random(); i < len; ++i) {
            // TODO: relation.back может отсутствовать
            backRecord = await findOrCreate(toType, back.name, back.list);

            let addToSetResult = await collection.updateOne(
                { "_id": id },
                { "$addToSet": { [fieldName]: backRecord["_id"] } }
            )
            // addToSetResult.result
            // { n: 1, nModified: 1, ok: 1 }  - Это если документ был найден и отредактирован
            // { n: 1, nModified: 0, ok: 1 }  - Это если документ был найден, но не отредактирован
            if (addToSetResult.result.nModified) {

            }
            db.computeFields(toEntity, backRecord);
        }
    } else {
        backRecord = await findOrCreate(toType, back.name, back.list);

        await collection.updateOne({ "_id": id }, { "$set": { [fieldName]: backRecord["_id"] } });

        await db.computeFields(toEntity, backRecord);
    }
}

async function generateEntity(entityName, values = {}) {
    //console.log(`--------------   generateEntity   ${entityName}--------------------`);
    let entity = schema.entities.hash[entityName];

    let result, count = 0, data = {};
    do {
        data = {};
        for (const field of entity.fields) {
            if (field.name === "_id" || field.list) {
                continue;
            }

            if (field.name in values) {
                data[field.name] = values[field.name];
            } else {
                genField(data, field);
            }
        }
        ++count;
        if (count > 1000) {
            break;
        }

        result = await db.createEntity(entity, data);
        if (result.error) {
            console.log("createEntity error : ", result.error);
        }
    }
    while (result.error);
    // result.error === 'not uniq name !'

    if (!result[entity.singular]) {
        console.log('-----------entity.singular------------');
        console.log(entity.singular);
        console.log('-----------result------------');
        console.log(result);
        console.log('-----------data------------');
        console.log(data);
        console.log('-----------count------------');
        console.log(count);
        throw ("generateEntity : !result[entity.singular]");
    }

    let record = result[entity.singular];
    //console.log('>',record._id);

    if (entityName === "Tag" && !record.name) {
        throw ("generateEntity : 'Tag' without 'name' field ");
    }

    for (const fieldName in entity.relations) {
        await generateEntityField(entity, record, fieldName);
    }

    await db.computeFields(entity, record);

    record = await db.find(entity.name, "_id", record["_id"]);

    await db.updateRelations(entity, record);

    return record;
}

export async function generateDB() {
    console.log("------------- generateDB ---------------");
    for (let i = 0, count = random(); i < count; ++i) {
        for (const entityName in schema.entities.hash) {
            await generateEntity(entityName);
        }
    }
    db.checkNonNullFields();
}