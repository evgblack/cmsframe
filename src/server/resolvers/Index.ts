import { GraphQLScalarType } from 'graphql';
import { GraphQLError } from 'graphql/error';
import { Kind } from 'graphql/language';

export let Index = new GraphQLScalarType({
    name: 'DateTime',

    description: 'Index in MongoDB',

    serialize(value) {
        console.log('~ serialize index :', value);
        return value;
    },

    parseValue(value) {
        console.log('~ parseValue index :', value);
        return value;
    },
    parseLiteral(ast) {
        console.log('~ parseLiteral index :', ast);
        return ast["value"];
    }
});