{
    "Post": {
        "id": {
            "name": "id",
            "type": "ID",
            "required": true
        },
        "title": {
            "name": "title",
            "type": "String",
            "required": true,
            "column": true,
            "unique": true
        },
        "author": {
            "name": "author",
            "type": "Author",
            "required": true
        }
    },
    "Author": {
        "id": {
            "name": "id",
            "type": "ID",
            "required": true
        },
        "firstName": {
            "name": "firstName",
            "type": "String",
            "required": true,
            "column": true
        },
        "lastName": {
            "name": "lastName",
            "type": "String",
            "required": true,
            "column": true
        },
        "posts": {
            "name": "posts",
            "type": "Post",
            "list": true
        }
    }
}