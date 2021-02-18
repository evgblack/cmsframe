import test from 'ava';
const {
    GraphQLClient
} = require('graphql-request');

const endpoint = "http://localhost:4000/graphql";

test.before(async t => {
    let gql = new GraphQLClient(endpoint, {
/*         headers: {
            authorization: 'Bearer ' + jwt,
        } */
	});

	let query = '{ hello }';
	let variables = {};
	
	let result = await gql.request(query, variables);
	t.log(result);

	t.context = 'unicorn';
});

test('context is unicorn', t => {
	t.is(t.context, 'unicorn');
});

test.todo('updatePost');