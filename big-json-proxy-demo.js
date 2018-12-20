const {bigJSONProxy, bigJSONProxySync} = require('./big-json-proxy')


async function bigJsonExample(jsonfile) {

    var proxy = await bigJSONProxy(jsonfile);

    var value = await proxy['a.d'];
    console.log(value); // 4
    value = await proxy.a.d;
    console.log(value); // undefined because it tried to obtain 'd' from the promise proxy.a
    value = await (await proxy.a).d;
    console.log(value); // 4

    var jsonProxy = await proxy.a; // jsonProxy is a new proxy
    value = await jsonProxy.d;
    console.log(value); // 4
    
    var arrayProxy = await jsonProxy.b;  // arrayProxy is a new proxy
    
    value = await arrayProxy[1];
    console.log(value); // a.b[1] "e\n"
    // which is the same as
    value = await proxy['a.b[1]'];
    console.log(value); // "e\n"

    value = await arrayProxy[0];
    console.log(value); // 1

    await arrayProxy.forEach((v) => {
        console.log(v)  // 1 then "e\n"
    });

    var map = await arrayProxy.map((v) => 'mapped ' + v);
    console.log(map)    // [ 'mapped 1', 'mapped "e\\n"' ]

    // some misses
    var value = await proxy.p;
    console.log(value==undefined); // true

    var value = await arrayProxy[2];
    console.log('a.b[2] is', value); // a.b[2] is undefined
}

bigJsonExample('input.json');


function bigJsonSyncExample(jsonfile) {

    var proxy = bigJSONProxySync(jsonfile);

    var value = proxy['a.d'];
    console.log(value); // 4
    value = proxy.a.d;
    console.log(value); // 4

    var jsonProxy = proxy.a; // jsonProxy is a new proxy
    value = jsonProxy.d;
    console.log(value); // 4
    
    var arrayProxy = jsonProxy.b;  // arrayProxy is a new proxy
    
    value = arrayProxy[1];
    console.log(value); // a.b[1] "e\n"
    // which is the same as
    value = proxy['a.b[1]'];
    console.log(value); // "e\n"

    value = arrayProxy[0];
    console.log(value); // 1

    arrayProxy.forEach((v) => {
        console.log(v)  // 1 then "e\n"
    });

    var map = arrayProxy.map((v) => 'mapped ' + v);
    console.log(map)    // [ 'mapped 1', 'mapped "e\\n"' ]

    // some misses
    var value = proxy.p;
    console.log(value==undefined); // true

    var value = arrayProxy[2];
    console.log('a.b[2] is', value); // a.b[2] is undefined
}

bigJsonSyncExample('input.json');



const jsonCreator = require('./randomJsonCreator');

// Example for building a random big json
function CreateBigJson(jsonfile) {
    
    const opts = {
        minTotalChars : 5*10**7,  // generates a file of at least 50mb, for 5gb it would be 5*10**9

        valueLengthMin : 1000,
        valueLengthMax : 1000,
        keyLengthMin : 20,
        keyLengthMax : 20,
        keyPrefix : "K_",
        
        //how deep can jsons and arrays be nested. For example {a: 5} has 0 deepness, {a: {b: [{c: 5}]}}) has 3 deepness
        maxDeepness : 5,
    
        //chances of generating a type of value according to: [string type chance, json type chance] and array type chance is the remaining
        valueChances : [0.5, 0.35]
    }

    jsonCreator.WriteRandomJson(jsonfile, opts);
}

// CreateBigJson('demobig.json')
