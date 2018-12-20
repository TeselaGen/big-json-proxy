const { FindIndexedValue } = require('./bigJsonFlattener');

const out = process.stdout

async function FindValue() {
    flattenFile = process.argv[2];
    indexFile = process.argv[3];
    key = process.argv[4];
    res = await FindIndexedValue(flattenFile, indexFile, key);
    out.write(JSON.stringify(res));
}

FindValue();
