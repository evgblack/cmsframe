//import * as fs from "fs";
const fs = require("fs");

let entitiesHash = {};

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

let skipFields = {
    'createdAt': true,
    'updatedAt': true
}

function generateEntityType(entity){
    let entityArr = [], 
        inputArr = [],
        editInputArr = [],
        enums = [];

//---------------------------------------
    entityArr.push(`"""
${entity.description}
"""
type ${entity.name} @entity(plural: "${entity.plural}") {`);
//---------------------------------------
inputArr.push(`input ${entity.name}Input {`);
//---------------------------------------
editInputArr.push(`input edit${entity.name}Input {`);

    entityArr.push('  id: ID!');
    
    for(const field of entity.fields){
        if(field.name === 'id'){
            continue;
        }

/*         if(field.computed){
            continue;
        } */

        let search = '';

        let type = field.type;
        if(field.list){
            type = '['+field.type;
            if(field.listNonNull){
                type += '!]';
            }else{
                type += ']';
            }

            if(field.type in entitiesHash){
                search = `(sort: String, limit: Int, start: Int, where: JSON)`;

                //entityArr.push(`  count${capitalizeFLetter(field.name)}: Int @computed`);
            }
        }

        let compute = '';
        if(field.compute){
            computedFieldsArr = [];

            if(field.compute["length"]){
                computedFieldsArr.push('length: true');
                entityArr.push(`  ${field.name}Length: Int @computed`);
                // contentLength: Int
            }
            if(field.compute["hash"]){
                computedFieldsArr.push('hash: true');
                entityArr.push(`  ${field.name}Hash: String @computed`);
                // contentLength: Int
            }

            compute = ` @compute(${computedFieldsArr.join(', ')})`;
        }

        let nonNull = field.nonNull ? '!' : '';

        let unique = field.unique ? ' @unique' : '';

        let required = field.required ? ' @required' : '';

        if(field.enum){
            let enumtype = generateEnumType(entity.name, field.name, field.enum);
            enums.push(enumtype);
        }
        
        entityArr.push(`  ${field.name}${search}: ${type}${nonNull}${unique}${required}${compute}`);

/*         if(skipFields[field.name]){
            continue;
        } */

        if((field.type in entitiesHash) || field.type === "Morph"){
            type = type.replace(field.type, 'ID');
        }

        let def = field.default ? ` = ${field.default}` : '';

        inputArr.push(`  ${field.name}: ${type}${nonNull}${def}`);
        editInputArr.push(`  ${field.name}: ${type.replace('!', '')}`);
    }
    entityArr.push(endType);
    inputArr.push(endType);
    editInputArr.push(endType);

    let entityStr = entityArr.join(joinStr);
    let inputStr = inputArr.join(joinStr);
    let editInputStr = editInputArr.join(joinStr);

    const name = entity.name;

    let additional = `extend type Query {
  ${entity.singular}(id: ID!): ${name}
  ${entity.plural}(sort: String, limit: Int, start: Int, where: JSON): [${name}!]
}

extend type Mutation {
  create${name}(input: create${name}Input): ${name}Payload
  update${name}(input: update${name}Input): ${name}Payload
}

input create${name}Input {
  data: ${name}Input
}

input update${name}Input {
  where: InputID
  data: edit${name}Input
}

type ${name}Payload {
  ${entity.singular}: ${name}
  error: String
}`;

    let arr = [entityStr, inputStr, editInputStr];

    if(enums.length){
        arr.push(enums.join(joinStr));
    }
    
    arr.push(additional);
    arr.push(joinStr);

    return arr.join(joinStr);
}

function generateSchema(){
    let entities = JSON.parse(fs.readFileSync("./src/generated/entities.json", "utf8"));

    console.time();

    let entityArr = [];

    for(const entity of entities){
        entitiesHash[entity.name] = entity;
    }

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

generateSchema();

function capitalizeFLetter(name) { 
    return name[0].toUpperCase() + name.slice(1); 
}