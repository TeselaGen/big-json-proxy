const smock = require("stream-mock");
const jsonflat = require("./bigJsonFlattener");


function CreateNewMocks(input1, input2='') {
    return {
        read1 : new smock.ReadableMock(input1),
        read2: new smock.ReadableMock(input2),
        write1 : new smock.WritableMock(),
        write2 : new smock.WritableMock()
    }
}

const json_1_example = JSON.stringify({
    a: 'abcde',
    b: [{c: true}],
    ckey: 'longest in sequence',
});
const flatten_json_1 = '"a"\t"abcde"\n"b[0].c"\ttrue\n"ckey"\t"longest in sequence"\n';
const index_json_1 = '"a"=4,7\n"b[0].c"=21,4\n"ckey"=33,21\n';

describe("Big Json Flattener test", () => {
    const mocks = CreateNewMocks(json_1_example);
    it("Will write flattened Json and its corresponding index", () => {
        jsonflat.FlattenJson(mocks.read1, mocks.write1, mocks.write2, () => {
            mocks.write1.end(() => {
                expect(mocks.write1.data.toString()).toEqual(flatten_json_1);
            }); 
            mocks.write2.end(() => {
                expect(mocks.write2.data.toString()).toEqual(index_json_1);
            });
            // mocks = CreateNewMocks(flatten_json_1, index_json_1);
            // jsonflat.FindIndexedValue(mocks.read1, mocks.read2, 'a', (value) => {
            //     expect(value).toEqual('"abcde"');
            // });
            // mocks = CreateNewMocks(flatten_json_1, index_json_1);
            // jsonflat.FindIndexedValue(mocks.read1, mocks.read2, 'b[0].c', (value) => {
            //     expect(value).toEqual('true');
            // });
            // mocks = CreateNewMocks(flatten_json_1, index_json_1);
            // jsonflat.FindIndexedValue(mocks.read1, mocks.read2, 'ckey', (value) => {
            //     expect(value).toEqual('"longest in sequence"');
            // });
            // // a non existing key should return false
            // mocks = CreateNewMocks(flatten_json_1, index_json_1);
            // jsonflat.FindIndexedValue(mocks.read1, mocks.read2, '"b"', (value) => {
            //     expect(value).toEqual(false);
            // });
            // mocks = CreateNewMocks(flatten_json_1, index_json_1);
            // jsonflat.FindIndexedValue(mocks.read1, mocks.read2, 'b[0]', (value) => {
            //     expect(value).toEqual(false);
            // });
            // mocks = CreateNewMocks(flatten_json_1, index_json_1);
            // jsonflat.FindIndexedValue(mocks.read1, mocks.read2, '"anyFakeKey"', (value) => {
            //     expect(value).toEqual(false);
            // });
        });
    });
});

const json_3_example = JSON.stringify({
    a: [{b: 'lkj'}, [5, 'x'], 'ujn'],
    b: {c: false, d: null, e: true}
});
const flatten_json_3 = '"a[0].b"\t"lkj"\n"a[1][0]"\t5\n"a[1][1]"\t"x"\n"a[2]"\t"ujn"\n"b.c"\tfalse\n"b.d"\tnull\n"b.e"\ttrue\n';

describe("Big Json Flattener full functionality test", () => {
    var mocks = CreateNewMocks(json_3_example);
    it("Will write flattened Json and its corresponding index", () => {
        jsonflat.FlattenJson(mocks.read1, mocks.write1, mocks.write2, () => {
            mocks.write1.end(() => {
                expect(mocks.write1.data.toString()).toEqual(flatten_json_3);
            });
        });
    });
});
