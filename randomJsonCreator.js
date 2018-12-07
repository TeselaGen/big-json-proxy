
const params = {
    minTotalChars : 100000,  // least amount of characters to generate
    
    //list of chars to be used uniformly to generate random keys and values
    possibleChars : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    valueLengthMin : 10000,
    valueLengthMax : 10000,
    valuePrefix: "",
    keyLengthMin : 20,
    keyLengthMax : 20,
    keyPrefix : "k",

    //ratio*(least amount of characters to generate) : least amount of chars to generate in the nested structure (json or array)
    nestedStructSizeRatio : 0.4,    
    
    //chances of generating a type of value according to: [string type chance, json type chance] and array type chance = 1.0 - (string chance) - (json chance) where 1.0 is 100% chance.
    //string type chance shouldn't be too small or generation will never end nesting jsons and arrays (causing stack overflow)
    valueChances : [0.4, 0.4]
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

function KeyGenerator() {
    const prefix = params.keyPrefix
    const len = RandomNumberBetween(params.keyLengthMin - prefix.length, params.keyLengthMax - prefix.length);
    const key = prefix + StringGenerator(len);
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

function AppendRandomValue(fileW, targetCharQuantity) {
    const valueType = RandomValueType();
    var chars = 0;
    if(valueType==1) {
        value = StringValueGenerator();
        fileW.write('"'+value+'"');
        chars = value.length;
    } else if(valueType==2) {
        chars = CreateRandomJson(fileW, targetCharQuantity);
    } else {
        chars = CreateRandomArray(fileW, targetCharQuantity);
    }
    return chars
}

function CreateRandomArray(fileW, targetCharQuantity) {
    var charactersSoFar = 0;
    fileW.write('[');
    while(charactersSoFar<targetCharQuantity) {
        charactersSoFar += AppendRandomValue(fileW, targetCharQuantity*params.nestedStructSizeRatio);
        if (charactersSoFar<targetCharQuantity) fileW.write(',');
    }
    fileW.write(']');
    return charactersSoFar;
}

function CreateRandomJson(fileW, targetCharQuantity) {
    var charactersSoFar = 0;
    var key;
    fileW.write('{');
    while(charactersSoFar<targetCharQuantity) {
        key = KeyGenerator();
        fileW.write('"'+key+'":');
        charactersSoFar += key.length;
        charactersSoFar += AppendRandomValue(fileW, targetCharQuantity*params.nestedStructSizeRatio);
        if (charactersSoFar<targetCharQuantity) fileW.write(',');
    }
    fileW.write('}');
    return charactersSoFar;
}

exports.WriteRandomJson = function (fileWriter, options={}) {
    Object.assign(params, options);
    CreateRandomJson(fileWriter, params.minTotalChars);
}

exports.params = params;