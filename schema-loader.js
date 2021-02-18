const {
    buildSchema
} = require('graphql');
const {
    readFileSync
} = require('fs');

module.exports = function (schemaString, config) {
    console.log('-------------schemaString---------------');
    console.log(schemaString);
    return buildSchema(readFileSync(schemaString, {
        encoding: 'utf-8'
    }));
};