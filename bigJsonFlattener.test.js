const smock = require("stream-mock");
const jsonflat = require("./bigJsonFlattener");

jest.mock('fs');
const mockedFs = require('fs');

describe("Big Json Flattener full functionality test", () => {
    it("Will write flattened Json and index, then use the index to retrieve values", async () => {
        const json = JSON.stringify({
            a: 'abcde',
            b: [{c: true}],
            ckey: 'longest in sequence',
        });
        const flatten = '"a"\t"abcde"\n"b[0].c"\ttrue\n"ckey"\t"longest in sequence"\n';
        const index = '"a"=4,7\n"b[0].c"=21,4\n"ckey"=33,21\n';
        var readstream = new smock.ReadableMock(json),
            writestream1 = new smock.WritableMock(),
            writestream2 = new smock.WritableMock();
        await jsonflat.FlattenJson(readstream, writestream1, writestream2);
        expect(writestream1.data.toString()).toEqual(flatten);
        expect(writestream2.data.toString()).toEqual(index);
        
        mockedFs.openSync = jest.fn();
        mockedFs.openSync.mockReturnValue(1);

        // simulates the read file operation
        mockedFs.readSync = jest.fn((file, buffer, offset, length, start) => {
            buffer.write(flatten.substring(start, start+length));
        });

        readstream = new smock.ReadableMock(index);
        // attempts to retrieve values for flattened path using previously created flattened json and index 
        var res = await jsonflat.FindIndexedValue('flatten file path', readstream, 'a');
        expect(res.value).toEqual('"abcde"');
        readstream = new smock.ReadableMock(index);
        res = await jsonflat.FindIndexedValue(readstream, readstream, 'b[0].c');
        expect(res.value).toEqual('true');
        readstream = new smock.ReadableMock(index);
        res = await jsonflat.FindIndexedValue(readstream, readstream, 'ckey');
        expect(res.value).toEqual('"longest in sequence"');
        readstream = new smock.ReadableMock(index);
        res = await jsonflat.FindIndexedValue(readstream, readstream, 'b');
        expect(res.value).toBeFalsy();
        readstream = new smock.ReadableMock(index);
        res = await jsonflat.FindIndexedValue(readstream, readstream, 'b[0]');
        expect(res.value).toBeFalsy();
        readstream = new smock.ReadableMock(index);
        res = await jsonflat.FindIndexedValue(readstream, readstream, 'anyFake');
        expect(res.value).toBeFalsy();
    });
});

describe("FlattenJson test", () => {
    var readstream, writestream1, writestream2;
    beforeEach(() => {
        writestream1 = new smock.WritableMock(),
        writestream2 = new smock.WritableMock();
    });
    it("Will write flattened Json and its corresponding index", async () => {
        const json = JSON.stringify({a:0, zx:12345678});
        const flatten = '"a"\t0\n"zx"\t12345678\n';
        const index = '"a"=4,1\n"zx"=11,8\n';
        readstream = new smock.ReadableMock(json);
        await jsonflat.FlattenJson(readstream, writestream1, writestream2);
        expect(writestream1.data.toString()).toEqual(flatten);
        expect(writestream2.data.toString()).toEqual(index);
    });
    it("Will write flattened Json and its corresponding index", async () => {
        const json = JSON.stringify({
            a: [{b: 'lkj'}, [5, 'x'], 'ujn'],
            b: {c: false, d: null, e: true}
        });
        const flatten = '"a[0].b"\t"lkj"\n"a[1][0]"\t5\n"a[1][1]"\t"x"\n"a[2]"\t"ujn"\n"b.c"\tfalse\n"b.d"\tnull\n"b.e"\ttrue\n';
        readstream = new smock.ReadableMock(json),
        await jsonflat.FlattenJson(readstream, writestream1, writestream2);
        expect(writestream1.data.toString()).toEqual(flatten);
    });
    it("Will trigger dataError", async () => {
        readstream = new smock.ReadableMock('{a=3{');
        await jsonflat.FlattenJson(readstream, writestream1, writestream2);
        expect(writestream1.data.toString()).toEqual('');
    });
});
