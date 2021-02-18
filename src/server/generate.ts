import { lexicographicSortSchema } from "graphql";

//import * as fs from "fs";
const fs = require("fs");

const endType = "}\r\n",
    joinStr = "\r\n";

function generateEnumType(entityName, fieldName, options){
    let arr = [];
    arr.push(`enum ENUM_${entityName.toUpperCase()}_${fieldName.toUpperCase()} {`);
    for(const option of options){
        arr.push('  '+option);
    }
    arr.push(endType);
    return arr.join('\r\n');
}

function generateEnums(entity){
    let enums = [];
    for(const field of entity.fields){
        if(field.enum){
            let enumtype = generateEnumType(entity.name, field.name, field.enum);
            enums.push(enumtype);
        }
    }
    if(enums.length){
        return enums.join(joinStr);
    }else{
        return '';
    }
}

function computed(field){
    if(!field.computed){
        return '';
    }
    // @computed(from: tags, alg: size)

    let from = field.computed["from"] ? `from: ${field.computed["from"]}, ` : '';

    return ` @computed(${from}alg: ${field.computed["alg"]})`;
}

function fieldSearch(field){
    if(field.isEntityType && field.list){
        return `(sort: String, limit: Int, start: Int, where: JSON)`;
    }else{
        return '';
    }
}
/*
input :
1 - for ObjectType
2 - for InputType
3 - for EditType
*/
function fieldType(field, input = 1){
    let type = field.type;

    if(field.embedded && input > 1){
        type = 'Create'+type;
    }

    if(field.list){
        if(input === 1){
            if(field.listNonNull){
                type = `[${type}!]`;
            }else{
                type = `[${type}]`;
            }
        }
        if(input > 1){
            if(field.isEntityType){
                type = '[ID]';
            }
        }
    }else{
        if(input > 1){
            if(field.isEntityType){
                type = 'ID';
            }
        }
    }

    if(input === 1){
        if(field.nonNull){
            type = type+'!';
        }
    }
    if(input === 2){
        if(field.required){
            type = type+'!';
        }
    }
    return type;
}

function genEntityField(field){
    let required = field.required ? ' @required' : '';
    let embedded = field.embedded ? ' @embedded' : '';
    let virtual = field.virtual ? ' @virtual' : '';
    let format = '';
    if(field.format){
        format = ` @format(value: "${field.format}")`;
    }

    return `  ${field.name}${fieldSearch(field)}: ${fieldType(field, 1)}${required}${embedded}${virtual}${computed(field)}${format}`;
}

function genInputField(field){
    let def = field.default ? ` = ${field.default}` : '';
    return `  ${field.name}: ${fieldType(field, 2)}${def}`;
}

function genUpdateField(field){
    return `  ${field.name}: ${fieldType(field, 3)}`;
}

let skipFields = {
    'createdAt': true,
    'updatedAt': true
}

function genEmbedded(embedded){
    let arr = [], 
    createArr = [],
    updateArr = [];

    for(const field of embedded.fields){
        arr.push(genEntityField(field));
        createArr.push(genInputField(field));

        let updateField = genUpdateField(field);
        updateArr.push(updateField);
    }

    let fields = arr.join(joinStr);
    let createFields = createArr.join(joinStr);
    let updateFields = updateArr.join(joinStr);

    let name = embedded.name;

    let graphql = `
"""
${embedded.description}
"""
type ${name} {
${fields}
}

input Create${name} {
${createFields}
}

input Update${name} {
${updateFields}
}`;

    return graphql;
}

export function generateGraphQLSchemaString(schema){
    let arr = [];
    for(let entityName in schema.entities.hash){
        let entity = schema.entities.hash[entityName];
        let str = generateEntityType(entity);
        arr.push(str);
    }
    return arr.join(joinStr);
}

export function generateEntityType(entity){
    // schema.entities.hash['Post']
    let entityArr = [], 
        inputArr = [],
        updateArr = [],
        arrays = [];

    let embedded = '', embeddedArr = [];

    for(const field of entity.fields){
        if(field.name === '_id'){
            continue;
        }

        entityArr.push(genEntityField(field));
        if(field.name in skipFields){
            continue;
        }
        if(field.computed){
            continue;
        }
        inputArr.push(genInputField(field));

        let updateField = genUpdateField(field);

        if(field.list){
            arrays.push(updateField);
        }else{
            updateArr.push(updateField);
        }

        if(field.embedded){
            embeddedArr.push(genEmbedded(field.embedded));
        }
    }

    if(embeddedArr.length){
        embedded = embeddedArr.join(joinStr);
    }

    const name = entity.name;

    let entityFields = entityArr.join(joinStr);
    let inputFields = inputArr.join(joinStr);
    let updateFields = updateArr.join(joinStr);
    let inputArrays = '';
    let arraysOperators = '';
    if(arrays.length){
        inputArrays = `input ${name}Arrays {
${arrays.join(joinStr)}
}`;
        arraysOperators = `addToSet: ${name}Arrays
  push: ${name}Arrays
  pullAll: ${name}Arrays`;
    }

    let graphql = `
"""
${entity.description}
"""
type ${name} @entity(plural: "${entity.plural}") {
  _id: ID!
${entityFields}
}

input Create${name} {
${inputFields}
}

input Update${name}Data {
${updateFields}
}

extend type Query {
  ${entity.singular}(id: ID!): ${name}
  ${entity.plural}(sort: String, limit: Int, start: Int, where: JSON): [${name}!]
}

type Update${name}Result {
  ok: Int
  error: String
}

extend type Mutation {
  create${name}(input: Create${name}): ${name}Payload
  update${name}(input: Update${name}): ${name}
  delete${name}(id: ID!): Boolean
}

${inputArrays}

input Update${name} {
  where: InputID
  set: Update${name}Data
  unset: [String]
  ${arraysOperators}
}

type ${name}Payload {
  ${entity.singular}: ${name}
  error: String
}

${generateEnums(entity)}

${embedded}
`;
    return graphql;
}

function generateSchema(){
    let entities = JSON.parse(fs.readFileSync("./src/generated/entities.json", "utf8"));

    console.time();

    let entityArr = [];

    for(const entity of entities){
        let res = generateEntityType(entity);

        const dir = `./src/entities/${entity.name}`;

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        const file = `${dir}/${entity.name}.graphql`;

        fs.writeFile(file, res, ()=>{});
        entityArr.push(res);
    }

    //console.log(entityArr.join(joinStr));
    console.timeEnd();
}

//generateSchema();

function capitalizeFLetter(name) { 
    return name[0].toUpperCase() + name.slice(1); 
}