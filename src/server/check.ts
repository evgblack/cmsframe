async function start() {
    try {
        let conf = await import('../entities/Post/config');
        console.log(conf.default.indexes);
    } catch (error) {

    }

}

start();