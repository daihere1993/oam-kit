import * as fs from 'fs';
import * as path from 'path';
import { Store } from './store';
import { Model } from '@oam-kit/utility/model';
import { isFirstLoad } from '@electron/app/utils';

jest.mock('@electron/app/utils', () => ({
  isFirstLoad: jest.fn(),
}));

function isFirstLoad_() {
  (isFirstLoad as jest.Mock).mockImplementation(() => true);
}

function isNotFirstLoad_() {
  (isFirstLoad as jest.Mock).mockImplementation(() => false);
}

describe('Store', () => {
  const dataPath = path.join(__dirname, '__test__', 'data.json');

  it('should save data into disk successfully when reset model', (done) => {
    isFirstLoad_();
    const store = new Store(dataPath);
    store.add(
      new Model<{ content: string }>({
        name: 'test-model',
        initValue: { content: 'initial content' },
      })
    );
    const model = store.get('test-model');
    model.reset({ content: 'new content' });
    setTimeout(() => {
      const data = JSON.parse(fs.readFileSync(dataPath).toString());
      expect(data).toEqual({ 'test-model': { content: 'new content' } });
      done();
    }, 1000);
  });
  it('should use initial data if is first load', async () => {
    const existedData = {
      'test-model': { content: 'existed content' }
    };
    isFirstLoad_();
    fs.writeFileSync(dataPath, JSON.stringify(existedData));
    const store = new Store(dataPath);
    await store.startup();
    store.add(
      new Model<{ content: string }>({
        name: 'test-model',
        initValue: { content: 'initial content' },
      })
    );
    expect(store.getAllData()).toEqual({ 'test-model': { content: 'initial content' } });
  });
  it('should load data from disk if is not first load', async () => {
    const existedData = {
      'test-model': { content: 'existed content' }
    };
    isNotFirstLoad_();
    fs.writeFileSync(dataPath, JSON.stringify(existedData));
    const store = new Store(dataPath);
    await store.startup();
    store.add(
      new Model<{ content: string }>({
        name: 'test-model',
        initValue: { content: 'initial content' },
      })
    );
    expect(store.getAllData()).toEqual({ 'test-model': { content: 'existed content' } });
  });
});
