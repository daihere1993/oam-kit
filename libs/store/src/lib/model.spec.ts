import { Model } from './Model';
import { Solid } from './solid';
import { ElectronSolid } from './solid/electron-solid';
import { APPData, Branch, Profile } from './types';

const BRANCH_MODEL = 'branches';
const PROFILE_MODEL = 'profile';

describe('Model()', () => {
  const source: APPData = {
    branches: [{ id: 1, name: 'test name', directory: { source: 'test source', target: 'test target' } }],
    profile: { remote: 'test remote', username: 'test username', password: 'test password' },
  };

  describe('setup()', () => {
    const solid = new ElectronSolid('');
    const model = new Model<Branch>(BRANCH_MODEL);
    beforeAll(() => {
      model.setup(solid);
    });
    it('should have correct name attribute', () => {
      expect(model.name).toBe(BRANCH_MODEL);
    });
    it('should get correct data after setup', () => {
      solid.data$.next(source);
      const targetBranch = model.find(1);
      expect(targetBranch).toEqual(source.branches[0]);
    });
  });

  describe('create$()', () => {
    const model = new Model<Branch>(BRANCH_MODEL);
    it('should be successful', () => {
      const addItem$ = (ElectronSolid.prototype.addItem$ = jest.fn());
      const solid = new ElectronSolid('');
      const content: Branch = {
        name: 'new name',
        directory: {
          source: 'new source',
          target: 'new target',
        },
      };
      model.setup(solid);
      model.create$(content);
      expect(addItem$).toBeCalledWith(BRANCH_MODEL, content);
    });
  });

  describe('edit$()', () => {
    let solid: Solid;
    let editItem$: jest.Mock;

    beforeEach(() => {
      editItem$ = ElectronSolid.prototype.editItem$ = jest.fn();
      solid = new ElectronSolid('');
    });
    it('edit plane model by id', () => {
      const id = 1;
      const content = { remote: 'test' };
      const model = new Model<Profile>(PROFILE_MODEL);
      model.setup(solid);
      model.edit$(id, content);
      expect(editItem$).toHaveBeenCalledWith(PROFILE_MODEL, { remote: 'test', id: 1 });
    });
    it('edit array model by id', () => {
      const id = 1;
      const content = { name: 'test' };
      const model = new Model<Branch>(PROFILE_MODEL);
      model.setup(solid);
      model.edit$(id, content);
      expect(editItem$).toHaveBeenCalledWith(PROFILE_MODEL, { name: 'test', id: 1 });
    });
    it('edit plane model by content only', () => {
      const content = { remote: 'test' };
      const model = new Model<Profile>(PROFILE_MODEL);
      model.setup(solid);
      model.edit$(content);
      expect(editItem$).toHaveBeenCalledWith(PROFILE_MODEL, { remote: 'test' });
    });
    it('edit plane model by content only', () => {
      const content = { id: 1, name: 'test' };
      const model = new Model<Branch>(PROFILE_MODEL);
      model.setup(solid);
      model.edit$(content);
      expect(editItem$).toHaveBeenCalledWith(PROFILE_MODEL, { id: 1, name: 'test' });
    });
  });

  describe('delete$()', () => {
    let solid: Solid;
    let deleteItem$: jest.Mock;

    beforeEach(() => {
      deleteItem$ = ElectronSolid.prototype.deleteItem$ = jest.fn();
      solid = new ElectronSolid('');
    });

    it('delete plane model', () => {
      const model = new Model<Profile>(PROFILE_MODEL);
      model.setup(solid);
      model.delete$();
      expect(deleteItem$).toBeCalledWith(PROFILE_MODEL);
    });

    it('delete array model', () => {
      const id = 1;
      const model = new Model<Branch>(BRANCH_MODEL);
      model.setup(solid);
      model.delete$(id);
      expect(deleteItem$).toBeCalledWith(BRANCH_MODEL, id);
    });
  });
});
