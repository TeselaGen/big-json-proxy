const fs = require('fs');

const params = {
    minTotalChars : 100000,  // least amount of characters to generate
    
    //list of chars to be used uniformly to generate random keys and values
    possibleChars : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    valueLengthMin : 1000,
    valueLengthMax : 1000,
    valuePrefix: "",
    keyLengthMin : 20,
    keyLengthMax : 20,
    keyPrefix : "k",

    //ratio*(least amount of characters to generate) : least amount of chars to generate in the nested structure (json or array)
    nestedStructSizeRatio : 0.4,    
    
    //how deep can jsons and arrays be nested. For example {a: 5} has 0 deepness, {a: {b: [{c: 5}]}}) has 3 deepness
    maxDeepness : 5,

    //chances of generating a type of value according to: [string type chance, json type chance] and array type chance = 1.0 - (string chance) - (json chance) where 1.0 is 100% chance.
    //string type chance shouldn't be too small or generation will never end nesting jsons and arrays (causing stack overflow)
    valueChances : [0.5, 0.35]
}

function RandomNumberBetween(lowNum, highNum) {
    const diff = highNum - lowNum + 1;
    if (diff<0) return 0;
    const res = lowNum + diff*Math.random();
    return res;
}

function StringGenerator(len) {
    const possible = params.possibleChars;
    var res = "";
    for (var i = 0; i < len; i++)
        res += possible.charAt(Math.floor(Math.random() * possible.length));
    return res
}

function KeyGenerator(suffix) {
    const prefix = params.keyPrefix
    const len = RandomNumberBetween(params.keyLengthMin - prefix.length, params.keyLengthMax - prefix.length);
    const key = prefix + StringGenerator(len) + '_' + suffix;
    return key
}

function StringValueGenerator() {
    const prefix = params.valuePrefix;
    const len = RandomNumberBetween(params.valueLengthMin - prefix.length, params.valueLengthMax - prefix.length);
    const value = StringGenerator(len);
    return prefix + value;
}

function RandomValueType() {
    const r = Math.random();
    const chance = params.valueChances;
    var valueType = 0;
    if (r<chance[0]) valueType = 1;
    else if (r<chance[0]+chance[1]) valueType = 2;
    else valueType = 3;
    return valueType;
}

function AppendRandomValue(fileW, targetCharQuantity, deep) {
    var valueType;
    var chars = 0;
    // if(deep>5) console.log('Deepess reached: ' + deep);
    if(deep==params.maxDeepness) valueType = 1;
    else valueType = RandomValueType();
    if(valueType==1) {
        value = StringValueGenerator();
        fileW.write(JSON.stringify(value));
        chars = value.length;
    } else if(valueType==2) {
        chars = CreateRandomJson(fileW, targetCharQuantity, deep+1);
    } else {
        chars = CreateRandomArray(fileW, targetCharQuantity, deep+1);
    }
    return chars
}

function CreateRandomArray(fileW, targetCharQuantity, deep) {
    var charactersSoFar = 0;
    fileW.write('[');
    while(charactersSoFar<targetCharQuantity) {
        charactersSoFar += AppendRandomValue(fileW, targetCharQuantity*params.nestedStructSizeRatio, deep);
        if (charactersSoFar<targetCharQuantity) fileW.write(',');
    }
    fileW.write(']');
    return charactersSoFar;
}

function CreateRandomJson(fileW, targetCharQuantity, deep) {
    var charactersSoFar = 0;
    var key;
    var count = 0
    fileW.write('{');
    while(charactersSoFar<targetCharQuantity) {
        key = KeyGenerator(count);
        fileW.write(JSON.stringify(key)+':');
        count++;
        charactersSoFar += key.length;
        charactersSoFar += AppendRandomValue(fileW, targetCharQuantity*params.nestedStructSizeRatio, deep);
        if (charactersSoFar<targetCharQuantity) fileW.write(',');
    }
    fileW.write('}');
    return charactersSoFar;
}

/**
 * @param  {string|WritableStream} fileWriter file path or WritableStream
 * @param  {Object} options={}
 */
exports.WriteRandomJson = function (writer, opts={}) {
    if(typeof(writer)=='string') writer = fs.createWriteStream(writer);
    Object.assign(params, opts);
    const cw = CreateRandomJson(writer, params.minTotalChars, 0);
}

exports.params = params;
