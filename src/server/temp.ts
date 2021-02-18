function allComputeFields() {
    for (const entityName in schema.entities.hash) {
        let entity = entitiesHash[entityName];
        let collection = db.getCollection(entityName);

        for (let rec of collection) {
            db.computeFields(entity, rec);
        }
    }
}


function countPostsByTag(){
    console.log('----------- count tags ---------------');
    let tagHash = {};
    let collection = db.getCollection("Post");
    for (let post of collection) {
        for (let tagId of post.tags) {
            if(!tagId){
                console.log('-->', post);
            }else{
                if(!tagHash[tagId]){
                    tagHash[tagId] = 1;
                }else{
                    ++tagHash[tagId];
                }
            }
        }
    }
    for(const tagId in tagHash){
        let tag = db.find("Tag", "id", tagId);
        console.log(`${tag.name} : ${tagHash[tagId]}`);
    }
}

type Entity {
    name: String
    description: String
    plural: String
    singular: String
    count: Int
    fields: [FieldOptions]
  }

type FieldOptions {
    name: String
    type: String
    link: String
    required: Boolean
    nonNull: Boolean
    listNonNull: Boolean
    column: Boolean
    unique: Boolean
    list: Boolean
    compute: ComputeFieldOptions
    enum: [String]
    default: String
  }

  # The `Long` scalar type represents 52-bit integers
  scalar Long

/* function createQueryComputeField(entity) {
    let root = resolvers['Query'][entity.name];

    for (const fieldName in entity.computeFields) {
        let compute = entity.computeFields[fieldName];
        root[fieldName] = function (parent, args, context, info) {
            //  {"return": "String", "what": "hash", "field": field.name, "alg": compute};
            switch (compute.what) {
                case 'hash':
                    root[fieldName] = function (parent, args, context, info) {
                        return "hash : " + compute.field;
                    };
                case 'count':
                    root[fieldName] = function (parent, args, context, info) {
                        return "hash : " + compute.field;
                    };
                case 'length':
                    break;
                default:
                    console.log('Sorry, we are out of ' + expr + '.');
            }
        }
    }
} */

/*
------------------------------
           Ad
------------------------------
   id : ID
   name : String
   content : String
   tag : ENUM_AD_TAG
   width : String
   height : String
   description : String
------------------------------
           Chunk
------------------------------
   id : ID
   name : String
   content : String
   description : String
   chunks : [Chunk]
   related_chunks : [Chunk]
   templates : [Template]
------------------------------
           Permission
------------------------------
   id : ID
   type : String
   controller : String
   action : String
   enabled : Boolean
   policy : String
   role : Role
   description : String
------------------------------
           Post
------------------------------
   id : ID
   createdAt : DateTime
   updatedAt : DateTime
   title : String
   h1 : String
   slug : String
   route : String
   description : String
   keywords : String
   priority : Float
   changefreq : ENUM_POST_CHANGEFREQ
   noindex : Boolean
   state : ENUM_POST_STATE
   content : String
   contentLength : Int
   notes : String
   landing : Boolean
   author : User
   tags : [Tag]
   redirects : [Redirect]
------------------------------
           Redirect
------------------------------
   id : ID
   url : String
   post : Post
------------------------------
           Role
------------------------------
   id : ID
   name : String
   description : String
   type : String
   permissions : [Permission]
   users : [User]
------------------------------
           Script
------------------------------
   id : ID
   name : String
   content : String
   description : String
   templates : [Template]
------------------------------
           Style
------------------------------
   id : ID
   name : String
   content : String
   description : String
   templates : [Template]
------------------------------
           Tag
------------------------------
   id : ID
   name : String
   posts : [Post]
------------------------------
           Template
------------------------------
   id : ID
   name : String
   content : String
   description : String
   styles : [Style]
   scripts : [Script]
   ads : [Ad]
   chunks : [Chunk]
   posts : [Post]
------------------------------
           UploadFile
------------------------------
   id : ID
   createdAt : DateTime
   updatedAt : DateTime
   name : String
   hash : String
   sha256 : String
   ext : String
   mime : String
   size : String
   url : String
   provider : String
   public_id : String
   related : [Morph]
------------------------------
           User
------------------------------
   id : ID
   createdAt : DateTime
   updatedAt : DateTime
   username : String
   email : String
   provider : String
   confirmed : Boolean
   blocked : Boolean
   role : Role
   avatar : UploadFile
   posts : [Post]

*/