import { Model } from './model';

interface FakeModel {
  foo: string;
  baz: { bar: string; };
  biz: { cim: string }[];
}
const initValue: FakeModel = { foo: 'a', baz: { bar: 'b' }, biz: [{ cim: 'c' }] };

describe('API', () => {
  let model: Model<FakeModel>;
  describe('.get()', () => {
    beforeEach(() => {
      model = new Model<FakeModel>({ name: 'fakeModel', initValue });
    });
    it(`- primitive data`, () => {
      expect(model.get('foo')).toBe(initValue.foo);
    });
    it(`- object`, () => {
      expect(model.get('baz')).toEqual(initValue.baz);
    });
    it(`- with dot prop`, () => {
      expect(model.get('baz.bar')).toBe(initValue.baz.bar);
    });
  });
  describe('.set()', () => {
    beforeEach(() => {
      model = new Model<FakeModel>({ name: 'fakeModel', initValue });
    });
    it(`- with primitive data`, () => {
      model.set('foo', 'A');
      expect(model.get('foo')).toBe('A');
    });
    it(`- with object`, () => {
      model.set('baz', { bar: 'dark' });
      expect(model.get('baz.bar')).toEqual('dark');
    });
    it(`- with callback to add new item`, () => {
      const item = { cim: 'd' };
      model.set('biz', (draft) => {
        draft.push(item);
      });
      expect(model.get('biz')[1]).toEqual(item);
    });
    it(`- with callback to edit item`, () => {
      model.set('baz', (draft) => {
        draft.bar = 'dark';
      });
      expect(model.get('baz.bar')).toEqual('dark');
    });
    it('- with callback to delete item', () => {
      model.set('biz', (draft) => {
        draft.splice(0, 1);
      });
      expect(model.get('biz').length).toBe(0);
    });
  });
  describe('Onthers', () => {
    beforeEach(() => {
      model = new Model<FakeModel>({ name: 'fakeModel', initValue });
    });
    it('.change()', (done) => {
      model.change.subscribe((data) => {
        expect(data.foo).toBe('A');
        done();
      });
      model.set('foo', 'A');
    });
    it('.subscribe()', (done) => {
      let emitCount = 0;
      model.subscribe<string>('foo', (value) => {
        emitCount++;
        if (emitCount === 1) {
          expect(value).toEqual('a');
        } else if (emitCount === 2) {
          expect(value).toBe('A');
          done();
        }
      });
      model.set('foo', 'A');
    });
  });
});