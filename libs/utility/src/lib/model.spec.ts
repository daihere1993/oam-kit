import { Model } from './model';
import { Project, SyncCodeModel } from ''@oam-kit/utility/types'';

const initValue = {
  type: 'A',
  preferences: { theme: 'white', list: [] },
  projects: [{ name: 'TRUNK', localPath: '/locak', remotePath: '/remote', serverAddr: '/server' }],
};

describe('API', () => {
  describe('.get()', () => {
    let model: Model<SyncCodeModel & { type: string; }>;
    beforeEach(() => {
      model = new Model<SyncCodeModel & { type: string; }>({
        name: 'sync-code',
        initValue,
      });
    })
    it(`- primitive data`, () => {
      expect(model.get('type')).toBe(initValue.type);
    });
    it(`- object`, () => {
      expect(model.get('preferences')).toEqual(initValue.preferences);
    });
    it(`- with dot prop`, () => {
      expect(model.get('preferences.theme')).toBe(initValue.preferences.theme);
    });
  });
  describe('.set()', () => {
    let model: Model<SyncCodeModel & { type: string; }>;
    beforeEach(() => {
      model = new Model<SyncCodeModel & { type: string; }>({
        name: 'sync-code',
        initValue,
      });
    })
    it(`- with primitive data`, () => {
      model.set('type', 'B');
      expect(model.get('type')).toBe('B');
    });
    it(`- with object`, () => {
      model.set('preferences', { theme: 'dark' });
      expect(model.get('preferences')).toEqual({ theme: 'dark' });
    });
    it(`- with callback to add new item`, () => {
      const newProject: Project = { name: 'SBTS21A', localPath: '/locak', remotePath: '/remote', serverAddr: '/server' };
      model.set('projects', (draft) => {
        draft.push(newProject);
      });
      expect(model.get('projects')[1]).toEqual(newProject);
    });
    it(`- with callback to edit item`, () => {
      model.set('projects', (draft) => {
        draft.find((item) => item.name === 'TRUNK').name = '5G21A';
      });
      expect(model.get('projects')[0].name).toBe('5G21A');
    });
    it('- with callback to delete item', () => {
      model.set('projects', (draft) => {
        const index = draft.findIndex(item => item.name === 'TRUNK');
        draft.splice(index, 1);
      });
      expect(model.get('projects').length).toBe(0);
    });
  });
  describe('Onthers', () => {
    let model: Model<SyncCodeModel & { type: string; }>;
    beforeEach(() => {
      model = new Model<SyncCodeModel & { type: string; }>({
        name: 'sync-code',
        initValue,
      });
    })
    it('.change()', (done) => {
      model.change.subscribe((data) => {
        expect(data.type).toBe('B');
        done();
      });
      model.set('type', 'B');
    });
    it('.subscribe()', (done) => {
      let emitCount = 0;
      model.subscribe<string>('preferences.theme', (value) => {
        emitCount++;
        if (emitCount === 1) {
          expect(value).toEqual('white');
        } else if (emitCount === 2) {
          expect(value).toBe('dark');
          done();
        }
      });
      model.set('preferences.theme', 'dark');
    });
  });
});
