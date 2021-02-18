import * as fs from 'fs';
import * as glob from 'glob';
import {
  TypeNode, Kind, printSchema, parse, visit, print, buildASTSchema,
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  DocumentNode
} from 'graphql';
import { addErrorLoggingToSchema } from 'graphql-tools';
import { logl } from './utils';
const util = require("util");
const path = require('path');

const { printSchemaWithDirectives } = require('graphql-toolkit');

function log(arg) {
  console.log('-----------------------------');
  console.log(arg);
  console.log('-----------------------------');
}

function checkEntity(directives) {
  for (let d of directives) {
    if (d.name.value === 'entity') {
      return d;
    }
  }
  return false;
}

export async function getSchemaAST(): Promise<any> {
  return new Promise(async (resolve, reject) => {
    let schemaString: string = await getSchemaString();

    let astNode = parse(schemaString); // Transforms the string into ASTNode
    //console.log(util.inspect(astNode, true, 5));
    resolve(astNode);
  });
}

async function getSchemaString(): Promise<string> {
  return new Promise((resolve, reject) => {
    glob("./src/entities/**/*.graphql", async (er, files) => {
      files = ["./src/graphql/schema.graphql"].concat(files);

      let union = [];

      let graphql = files.map((f) => {
        let entity = path.basename(f, ".graphql")
        if ("schema" !== entity) {
          union.push(entity);
        }
        return fs.readFileSync(f).toString();
      }).join('\r\n\r\n\r\n');

      graphql += `union Morph = ${union.join('|')}`;

      resolve(graphql);
    });
  });
}

function parseIndexes(node) {
/*   console.log('---------------------------');
  console.log('> indexes >', JSON.stringify(node.value.values, null, 4));
  console.log('---------------------------'); */

  const visitor = {
    ObjectValue: node => {
      let hash = {};
      for(const objectField of node.fields){
        for(const key in objectField){
          let val = objectField[key];
          if(val === "asc"){
            val = 1;
          }
          if(val === "desc"){
            val = -1;
          }
          hash[key] = val;
        }
      }
      return hash;
    },
    ObjectField: node => {
      return {[node.name.value]: node.value};
    },
    EnumValue: node => {
      return node.value;
    },
    BooleanValue: node => {
      return node.value;
    },
    IntValue: node => {
/*       options : { weights:
        { title: '10', keywords: '1', content: '8', description: '7' } } */
      return parseInt(node.value);
    },
    ListValue: node => {
      return node.values;
    }
  };

  const result = visit(node.value.values, { 'leave': visitor });
  //console.log('> indexes >', JSON.stringify(result, null, 4));

  return result;
}

export function parseEntitiesFromAST(astNode, schema) {
  let entities = [];
  let types = {};
  const visitor = {
    FieldDefinition: node => {
      let type = node.type;
      let field = { 'name': node.name.value };

      if (node.description) {
        field['description'] = node.description;
      }

      if (type.kind === Kind.NON_NULL_TYPE) {
        field['nonNull'] = true;
        type = type.type;
      }

      if (type.kind === Kind.LIST_TYPE) {
        field['list'] = true;
        type = type.type;
      }

      if (type.kind === Kind.NON_NULL_TYPE) {
        field['listNonNull'] = true;
        type = type.type;
      }

      if (type.kind === Kind.NAMED_TYPE) {
        field['type'] = type.name.value;
      }

      // field['minLength'] = 128;
      // field['maxLength'] = 512;

      node.directives.forEach(directive => {
        //field.directives[directive.name.value] = true;
        /*                 if (directive.name.value === 'column') {
                            field['column'] = true;
                        } */
        if (directive.name.value === 'required') {
          field['required'] = true;
        }

        if (directive.name.value === 'virtual') {
          field['virtual'] = true;
        }

        if (directive.name.value === 'embedded') {
          field['embedded'] = true;
        }

        if (directive.name.value === 'default') {
          directive.arguments.forEach(argument => {
            if (argument.name.value === "value") {
              field['default'] = argument.value.value;
              if (field['type'] === "Float") {
                field['default'] = parseFloat(field['default']);
              }
              if (field['type'] === "Int") {
                field['default'] = parseInt(field['default'], 10);
              }
            }
          });
        }

        if (directive.name.value === 'computed') {
          field['computed'] = directive.arguments.reduce((acc, arg) => {
            acc[arg.name.value] = arg.value.value;
            return acc;
          }, {});
        }

        if (directive.name.value === 'format') {
          directive.arguments.forEach(argument => {
            if (argument.name.value === "value") {
              field['format'] = argument.value.value;
            }
          });
        }
      });
      //from: String, alg: String
      /*       if(field.name === 'tags'){
              logl(' tags ** ', util.inspect(node, true, 5));
              console.log('------------------------------------');
              console.log(field);
            } */
      return field;
    },
    ObjectTypeDefinition: node => {
      // This function triggered per each type
      let directive;

      for (let d of node.directives) {
        if (d.name.value === 'entity') {
          directive = d;
          break;
        }
      }

      let type = { "name": node.name.value, "fields": [] };

      if (node.description) {
        type["description"] = node.description.value;
      }

      type.fields = node.fields;

      type["singular"] = type.name.toLowerCase();

      let cnt = 0;

      let computedFields = type.fields.reduce((acc, field) => {
        if (field.computed) {
          ++cnt;
          acc[field.name] = field;
        }
        return acc;
      }, {});

      if(cnt){
        type['computedFields'] = computedFields;
      }

      if (directive) {
        for (let arg of directive.arguments) {
          if (arg.name.value === "plural") {
            type["plural"] = arg.value.value;
          }
          if (arg.name.value === "indexes") {
            type["indexes"] = parseIndexes(arg);
          }
        }

        entities.push(type);
      }else{
        types[type.name] = type;
      }

      //return false;
    },
  };

  visit(astNode, { 'leave': visitor });

  schema.entities.array = entities;
  schema.types = types;

  //console.log(JSON.stringify(entities, null, 4));
}

export function parseEnumsFromAST(astNode, schema) {
  let enums = [];

  let visitorEnum = {
    EnumTypeDefinition: node => {
      let enumtype = { "name": node.name.value, "values": [] };

      enumtype.values = node.values.map(value => value.name.value);

      enums.push(enumtype);
    },
    EnumValueDefinition: node => {
      //node.directives  - тут можно дефолтовое значение сделать
      return node.name.value;
    },
    EnumValue: node => {
      return node.value;
    }
  };

  visit(astNode, visitorEnum);

  schema.enums.array = enums;
}

export function parseSchemaFromAST(astNode) {
  /*         let hashKind = schemaManager.hashKind(astNode);
        logl(' all kinds ', hashKind); */

  let schema = { "entities": { "array": [], "hash": {} }, "enums": { "array": [], "hash": {} } };

  parseEntitiesFromAST(astNode, schema);
  parseEnumsFromAST(astNode, schema);

  prepareSchema(schema);

  return schema;
}

export function prepareSchema(schema){
  for (const enumtype of schema.enums.array) {
    schema.enums.hash[enumtype.name] = enumtype.values;
  }

  for (const entity of schema.entities.array) {
    schema.entities.hash[entity.name] = entity;
    let hashByName = entity.fieldsHashByName = {};
    let hashByType = entity.fieldsHashByType = {};
    let computeSize = entity.computeSize = {};
    entity["nonNullFields"] = [];
    for (const field of entity.fields) {
      hashByName[field.name] = field;
      if (!hashByType[field.type]) {
        hashByType[field.type] = [field];
      } else {
        hashByType[field.type].push(field);
      }

      if (field.type in schema.enums.hash) {
        field.enum = schema.enums.hash[field.type];
      }

      if (field.computed && field.computed.from && field.computed.alg === "size") {
        computeSize[field.computed.from] = field;
      }

      if (field.nonNull) {
        entity.nonNullFields.push(field.name);
      }

      if(field.embedded){
        field.embedded = schema.types[field.type];
        console.log(field);
      }
    }
  }

  for (const entity of schema.entities.array) {
    for (const field of entity.fields) {
      if (field.type === "Morph" || (field.type in schema.entities.hash)) {
        field["isEntityType"] = true;
        if (field.list) {
          field["listNonNull"] = true;
        }
      }
    }
  }

  findRelatedEntities(schema);
}

function findRelatedEntities(schema) {
  if(!schema.relations){
    schema.relations = {};
  }
  for (let entity of schema.entities.array) {
    entity.relations = {};

    for (const field of entity.fields) {
      let type = field.type;
      if (!(type in schema.entities.hash)) {
        continue;
      }
      // ---------------------
      if(!(type in schema.relations)){
        schema.relations[type] = [];
      }

      let back = schema.relations[type];

      back.push({entity, field});

      // ---------------------

      let relEntity = schema.entities.hash[type];
      // TODO: Полей с этим типом может быть несколько
      let relFields = relEntity.fieldsHashByType[entity.name];

      let rec = { 'to': field };

      if(!relFields || !relFields.length){
        // Нету обратной ссылки 
        //console.log(`>>> ${entity.name} >>> ${field.name}(${field.type}) `);
        /*
            >>> Template >>> ads(Ad)
            >>> User >>> avatar(UploadFile)
        */
       continue;
      }

      for (const rel of relFields) {
        if (rel.name === field.name) {
          continue;
        }
        rec["back"] = rel;
        entity.relations[field.name] = rec;
      }
    }
  }
}

export function parseInputsFromAST(astNode, entitiesHash) {
  let inputs = [];

  let visitor = {
    InputObjectTypeDefinition: node => {
      let name = node.name.value.slice(0, -5);
      if (!(name in entitiesHash)) {
        return false;
      }

      let count = 0;

      let defaults = node.fields.reduce((acc, field) => {
        if (field.defaultValue) {
          ++count;
          acc[field.name.value] = field.defaultValue.value;
        }
        return acc;
      }, {});

      if (!count) {
        return;
      }

      inputs.push({ name, defaults });
    }
  };

  visit(astNode, visitor);

  return inputs;

  /*         let inputs = schemaManager.parseInputsFromAST(astNode, entitiesHash);

        for (const input of inputs) {
            let entity = entitiesHash[input.name];
            for (const field of entity.fields) {
                if (field.name in input.defaults) {
                    field.default = input.defaults[field.name];
                }
            }
        } */
}


export function hashKind(astNode) {
  let hashKind = {};
  let visitor = {
    enter(node) {
      if (!hashKind[node.kind]) {
        hashKind[node.kind] = 1;
      } else {
        ++hashKind[node.kind];
      }

      /*       if("EnumTypeDefinition" === node.kind){
              console.log('================EnumTypeDefinition=================');
              console.log(node)
            }
            if("EnumValueDefinition" === node.kind){
              console.log('================EnumValueDefinition=================');
              console.log(node)
            }
            if("EnumValue" === node.kind){
              console.log('================EnumValue=================');
              console.log(node)
            } */
    },
    leave(node) { }
  };

  visit(astNode, visitor);
  return hashKind;
}

function capitalizeFLetter(name) {
  return name[0].toUpperCase() + name.slice(1);
}