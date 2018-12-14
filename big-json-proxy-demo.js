const bigJSONProxy = require('./big-json-proxy')


async function bigJsonExample(jsonfile) {

    var proxy = await new bigJSONProxy(jsonfile);

    var value = await proxy['a.d'];
    console.log('a.d:', value);
    // <- 4

    var jsonProxy = await proxy.a;
    // jsonProxy is a new proxy

    value = await jsonProxy.d;
    console.log('a.d:', value);
    // <- 4

    var arrayProxy = await jsonProxy.b;
    // arrayProxy is a new proxy

    value = await arrayProxy[1];
    console.log('a.b[1]', value);
    // <- 1 which is equivalent to
    value = await proxy['a.b[1]'];
    console.log('a.b[1]', value);
    // <- 1

    // some misses
    var value = await proxy.p;
    console.log(value==undefined);
    // <- true

    var value = await arrayProxy[2];
    console.log('a.b[2] is', value);
    // <- a.b[2] is undefined
}

bigJsonExample('input.json');
