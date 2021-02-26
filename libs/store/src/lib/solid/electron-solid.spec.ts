import * as fs from 'fs';
import * as path from 'path';
import { ElectronSolid } from './electron-solid';
import { APPData, BranchInfo, Profile } from '../types';

const BRANCH_MODEL = 'branches';
const PROFILE_MODEL = 'profile';

describe('Solid()', () => {
  const targetPath = path.join(__dirname, '../../__test__/mockedData.json');
  const source: APPData = {
    branches: [{ id: 1, name: 'test name', source: 'test source', target: 'test target' }],
    profile: { id: 1, remote: 'test remote', username: 'test username', password: 'test password' },
  };

  async function startup(solid: ElectronSolid) {
    // Init source data before testing
    fs.writeFileSync(targetPath, JSON.stringify(source));
    await solid.startup$();
  }

  describe('startup()', () => {
    const solid = new ElectronSolid(targetPath);
    beforeAll(async () => {
      await startup(solid);
    });
    it('should get correct data by solid.data$ after startup', (done) => {
      solid.data$.subscribe((target) => {
        expect(target).toEqual(source);
        done();
      });
    });
  });

  describe('addItem$()', () => {
    let newBranch: BranchInfo;
    const solid = new ElectronSolid(targetPath);
    beforeEach(async () => {
      await startup(solid);
      newBranch = {
        name: 'branchName',
        source: 'branchSource',
        target: 'branchTarget',
      };
      await solid.addItem$(BRANCH_MODEL, newBranch);
    });
    it('should add new item into target', async () => {
      const target = solid.data;
      expect(target.branches.length).toBe(source.branches.length + 1);
    });

    it('should create corresponding id automatically', () => {
      const target = solid.data;
      const latestBranch = target.branches[target.branches.length - 1];
      expect(latestBranch.id).toBeDefined();
      expect(typeof latestBranch.id === 'number').toBeTruthy();
      newBranch.id = latestBranch.id;
      expect(latestBranch).toEqual(newBranch);
    });
  });

  describe('editItem$()', () => {
    const solid = new ElectronSolid(targetPath);
    beforeEach(async () => {
      await startup(solid);
    });
    it('should be successful when edit by model name', async () => {
      const content: Partial<Profile> = { remote: 'new remote' };
      await solid.editItem$(PROFILE_MODEL, content);
      expect(solid.data.profile.remote).toBe(content.remote);
    });

    it('should be successful when edit array model', async () => {
      const content: Partial<BranchInfo> = { id: 1, name: 'test' };
      await solid.editItem$(BRANCH_MODEL, content);
      const sourceBranch = solid.data.branches[0];
      expect(sourceBranch.name).toBe(content.name);
    });

    it('should be successful when edit plane model', async () => {
      const content: Partial<Profile> = { remote: 'test' };
      await solid.editItem$(PROFILE_MODEL, content);
      const sourceProfile = solid.data.profile;
      expect(sourceProfile.remote).toBe(content.remote);
    });

    it('should thorw error when content is not an object', async () => {
      const content: any = 'test';
      await expect(solid.editItem$(BRANCH_MODEL, content)).rejects.toThrow();
    });

    it('should throw error when edit array but no id included', async () => {
      const content: Partial<BranchInfo> = { name: 'test' };
      await expect(solid.editItem$(BRANCH_MODEL, content)).rejects.toThrow();
    });
  });
  describe('deleteItem$()', () => {
    const solid = new ElectronSolid(targetPath);
    beforeAll(async () => {
      await startup(solid);
    });
    it('delete plane model', async () => {
      await solid.deleteItem$(PROFILE_MODEL);
      expect(PROFILE_MODEL in solid.data).toBeFalsy();
    });

    it('delete array model', async () => {
      const targetBranch = source.branches[0];
      const originalLength = source.branches.length;
      await solid.deleteItem$(BRANCH_MODEL, targetBranch.id);
      expect(solid.data.branches.length).toBe(originalLength - 1);
    });
  });
});
