import * as path from 'path';
import * as fs from 'fs';
import * as serialize from 'serialize-javascript';
import { ChangedModel, ModelChangedType, StoreService, deserialize } from './store.service';

describe('StoreService: public methods', () => {});

describe('StoreService: private methods', () => {
  const storeService = new StoreService();

  describe('createAndSyncLocalData():', () => {
    it('should create data folder if that is not exists', () => {
      const userDataDir = path.join(__dirname, 'data');
      
      expect(fs.existsSync(userDataDir)).toBeFalsy();
      // @ts-ignore
      storeService.createAndSyncLocalData(userDataDir, '');
      expect(fs.existsSync(userDataDir)).toBeTruthy();

      fs.rmSync(userDataDir, { recursive: true, force: true });
    });
    it('should create default and runtime data file if those not exist', () => {
      const userDataDir = __dirname;
      const timestamp = '2024_03_18T15_14_17_059Z';
      const DEFAULT_APP_DATA = { foo: { name: 'foo' } };
      const latestDefaultData = serialize(DEFAULT_APP_DATA);
      const expected = {
        defaultDataFile: path.join(userDataDir, `oam_kit_default_data_${timestamp}.json`),
        runtimeDataFile: path.join(userDataDir, `oam_kit_runtime_data_${timestamp}.json`),
      };

      // @ts-ignore
      storeService.createTimestamp = () => timestamp;
      // @ts-ignore
      const ret = storeService.createAndSyncLocalData(userDataDir, latestDefaultData);
      expect(ret).toBe(expected.runtimeDataFile);
      expect(fs.existsSync(expected.defaultDataFile)).toBeTruthy();
      expect(fs.existsSync(expected.runtimeDataFile)).toBeTruthy();
      expect(fs.readFileSync(expected.defaultDataFile).toString()).toBe(latestDefaultData);
      expect(fs.readFileSync(expected.runtimeDataFile).toString()).toBe(latestDefaultData);

      fs.rmSync(expected.defaultDataFile);
      fs.rmSync(expected.runtimeDataFile);
    });
    it('should do nothing if DEFAULT_APP_DATA doesn\'t change', () => {
      const userDataDir = __dirname;
      const timestamp = '2024_03_18T15_14_17_059Z';
      const defaultDataFile = path.join(userDataDir, `oam_kit_default_data_${timestamp}.json`);
      const runtimeDataFile = path.join(userDataDir, `oam_kit_runtime_data_${timestamp}.json`);
      const DEFAULT_APP_DATA = { foo: { name: 'foo' } };
      const latestDefaultData = serialize(DEFAULT_APP_DATA);
      const legacyDefaultData = serialize(DEFAULT_APP_DATA);

      fs.writeFileSync(defaultDataFile, legacyDefaultData);
      fs.writeFileSync(runtimeDataFile, legacyDefaultData);

      // @ts-ignore
      const ret = storeService.createAndSyncLocalData(userDataDir, latestDefaultData);
      expect(ret).toBe(runtimeDataFile);
      expect(fs.existsSync(defaultDataFile)).toBeTruthy();
      expect(fs.existsSync(runtimeDataFile)).toBeTruthy();
      expect(fs.readFileSync(defaultDataFile).toString()).toBe(legacyDefaultData);
      expect(fs.readFileSync(runtimeDataFile).toString()).toBe(legacyDefaultData);

      fs.rmSync(defaultDataFile);
      fs.rmSync(runtimeDataFile);
    });
    it('should apply changes and update timestamp for default and runtime data file if DEFAULT_APP_DATA changed', () => {
      const userDataDir = __dirname;
      const oldTimestamp = '2024_03_18T15_14_17_059Z';
      const newTimestamp = '2025_03_18T15_14_17_059Z';
      const defaultDataFile = path.join(userDataDir, `oam_kit_default_data_${oldTimestamp}.json`);
      const runtimeDataFile = path.join(userDataDir, `oam_kit_runtime_data_${oldTimestamp}.json`);
      const DEFAULT_APP_DATA = { foo: { name: 'foo' }, baz: { name: 'baz' }, faz: [1, 2] };
      const legacyDefaultDataObj = { foo: { name: 'FOO' }, bar: { name: 'bar' }, faz: [1, 2] };
      const runtimeDataObj = { foo: { name: 'FOO' }, bar: { name: 'bar' }, faz: [1, 2, 3] };
      const latestDefaultData = serialize(DEFAULT_APP_DATA);
      const legacyDefaultData = serialize(legacyDefaultDataObj);
      const runtimeData = serialize(runtimeDataObj);
      const expected = {
        defaultData: { foo: { name: 'foo' }, baz: { name: 'baz' }, faz: [1, 2] },
        runtimeData: { foo: { name: 'foo' }, baz: { name: 'baz' }, faz: [1, 2, 3] },
        defaultDataFile: path.join(userDataDir, `oam_kit_default_data_${newTimestamp}.json`),
        runtimeDataFile: path.join(userDataDir, `oam_kit_runtime_data_${newTimestamp}.json`),
      };

      fs.writeFileSync(defaultDataFile, legacyDefaultData);
      fs.writeFileSync(runtimeDataFile, runtimeData);

      // @ts-ignore
      storeService.createTimestamp = () => newTimestamp;
      // @ts-ignore
      const ret = storeService.createAndSyncLocalData(userDataDir, latestDefaultData);
      expect(ret).toBe(expected.runtimeDataFile);
      expect(fs.existsSync(defaultDataFile)).toBeFalsy();
      expect(fs.existsSync(runtimeDataFile)).toBeFalsy();
      expect(fs.existsSync(expected.defaultDataFile)).toBeTruthy();
      expect(fs.existsSync(expected.runtimeDataFile)).toBeTruthy();
      expect(deserialize(fs.readFileSync(expected.defaultDataFile).toString())).toEqual(expected.defaultData);
      expect(deserialize(fs.readFileSync(expected.runtimeDataFile).toString())).toEqual(expected.runtimeData);

      fs.rmSync(expected.defaultDataFile);
      fs.rmSync(expected.runtimeDataFile);
    });
  });

  describe('compareLatestAndLegacyDefaultData():', () => {
    it('should do nothing if nothing changed', () => {
      const latestData = { foo: { name: 'foo' } };
      const legacyData = { foo: { name: 'foo' } };

      // @ts-ignore
      const changedModels = storeService.compareLatestAndLegacyDefaultData(serialize(latestData), serialize(legacyData));
      expect(changedModels.length).toBe(0);
    });
    it('should create a changedModel which type is "structureChanged"', () => {
      const latestData = { foo: { name: 'foo' } };
      const legacyData = { foo: { name: 'FOO' } };

      // @ts-ignore
      const changedModels = storeService.compareLatestAndLegacyDefaultData(serialize(latestData), serialize(legacyData));
      expect(changedModels.length).toBe(1);
      expect(changedModels[0].type).toBe(ModelChangedType.structureChanged);
    });
    it('should create a changedModel which type is "removed"', () => {
      const latestData = { foo: { name: 'foo' } };
      const legacyData = { foo: { name: 'foo' }, bar: { name: 'bar' } };

      // @ts-ignore
      const changedModels = storeService.compareLatestAndLegacyDefaultData(serialize(latestData), serialize(legacyData));
      expect(changedModels.length).toBe(1);
      expect(changedModels[0].type).toBe(ModelChangedType.removed);
    });
  });

  describe('updateLocalData():', () => {
    it('should update file data and update timestamp for default data', () => {
      const timestamp = '2024_03_18T15_14_17_059Z';
      const legacyFilePath = path.join(__dirname, 'oam_kit_default_data_2023_03_18T15_14_17_059Z.json');
      const expectedFilePath = path.join(__dirname, `oam_kit_default_data_${timestamp}.json`);
      const legacyData = { foo: { name: 'FOO', bar: 'bar' } };
      const expectedData = { foo: { name: 'foo' } };
      const changedModels: ChangedModel[] = [
        { name: 'bar', type: ModelChangedType.removed },
        { name: 'foo', type: ModelChangedType.structureChanged, value: serialize(expectedData.foo) },
      ];

      fs.writeFileSync(legacyFilePath, serialize(legacyData));
      // @ts-ignore
      storeService.updateLocalData(legacyFilePath, changedModels, timestamp);
      expect(fs.existsSync(legacyFilePath)).toBeFalsy();
      expect(fs.existsSync(expectedFilePath)).toBeTruthy();
      expect(fs.readFileSync(expectedFilePath).toString()).toBe(serialize(expectedData));
      fs.rmSync(expectedFilePath);
    });
    it('should update file data and update timestamp for runtime data', () => {
      const timestamp = '2024_03_18T15_14_17_059Z';
      const legacyFilePath = path.join(__dirname, 'oam_kit_runtime_data_2023_03_18T15_14_17_059Z.json');
      const expectedFilePath = path.join(__dirname, `oam_kit_runtime_data_${timestamp}.json`);
      const legacyData = { foo: { name: 'FOO', bar: 'bar' } };
      const expectedData = { foo: { name: 'foo' } };
      const changedModels: ChangedModel[] = [
        { name: 'bar', type: ModelChangedType.removed },
        { name: 'foo', type: ModelChangedType.structureChanged, value: serialize(expectedData.foo) },
      ];

      fs.writeFileSync(legacyFilePath, serialize(legacyData));
      // @ts-ignore
      storeService.updateLocalData(legacyFilePath, changedModels, timestamp);
      expect(fs.existsSync(legacyFilePath)).toBeFalsy();
      expect(fs.existsSync(expectedFilePath)).toBeTruthy();
      expect(fs.readFileSync(expectedFilePath).toString()).toBe(serialize(expectedData));
      fs.rmSync(expectedFilePath);
    });
  });

  describe('replaceFileTimestamp():', () => {
    it('should replace timestamp successfully for default data file', () => {
      const timestamp = '2024_03_18T15_14_17_059Z';
      const filePath = path.join(__dirname, 'oam_kit_default_data_2023_03_18T15_14_17_059Z.json');
      const expected = path.join(__dirname, `oam_kit_default_data_${timestamp}.json`);
      // @ts-ignore
      const ret = storeService.replaceFileTimestamp(filePath, timestamp);
      expect(ret).toBe(expected);
    });
    it('should replace timestamp successfully for runtime data file', () => {
      const timestamp = '2024_03_18T15_14_17_059Z';
      const filePath = path.join(__dirname, 'oam_kit_runtime_data_2023_03_18T15_14_17_059Z.json');
      const expected = path.join(__dirname, `oam_kit_runtime_data_${timestamp}.json`);
      // @ts-ignore
      const ret = storeService.replaceFileTimestamp(filePath, timestamp);
      expect(ret).toBe(expected);
    });
  });
});
