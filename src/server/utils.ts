export function logArgs(parent, args, context, info) {
    console.log('-------------parent--------------');
    console.log(parent);
    console.log('-----------------args--------------------');
    console.log(args);
    console.log('------------------context-------------------');
    console.log(context);
    console.log('------------------info-------------------');
    console.log(info);
    console.log('-------------------------------------');
}

export function logl(label, obj) {
    console.log('------------------  '+label+'  -------------------');
    console.log(obj);
}

export function capitalizeFLetter(name) {
    return name[0].toUpperCase() + name.slice(1);
}