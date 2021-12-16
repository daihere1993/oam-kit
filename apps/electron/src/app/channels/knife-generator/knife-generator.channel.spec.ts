import KnifeGeneratorChannel from './knife-generator.channel'

function createInstance(): KnifeGeneratorChannel {
  return new KnifeGeneratorChannel(null, null);
}

describe.skip('checkEnvironment()', () => {
  let channel: KnifeGeneratorChannel;
  beforeAll(() => {
    channel = createInstance();
  });
  it('should return true when commands all exist', async (done) => {
    const ret = await channel.checkEnvironment();

    expect(ret).toBeTruthy();
    done();
  });
});

describe.skip('isGitRepository()', () => {
  let channel: KnifeGeneratorChannel;
  beforeAll(() => {
    channel = createInstance();
  });
  it('should return true if under the git repository', () => {
    expect(channel.isGitRepository('C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam\\TRUNK')).toBeTruthy();
  });
  it('should return false if not under the git repository', () => {
    expect(channel.isGitRepository('C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam')).toBeFalsy();
  });
});

describe.skip('isSvnRepository()', () => {
  let channel: KnifeGeneratorChannel;
  beforeAll(() => {
    channel = createInstance();
  });
  it('should return true if under the svn repository', () => {
    expect(channel.isSvnRepository('C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam\\meta_trunk')).toBeTruthy;
  });
  it('should return false if not under the svn repository', () => {
    expect(channel.isSvnRepository('C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam')).toBeFalsy;
  });
});

describe.skip('isValidVersion()', () => {
  let channel: KnifeGeneratorChannel;
  beforeAll(() => {
    channel = createInstance();
  });
  it('should return true is version is valid', () => {
    const ret = channel.isValidVersion('C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam\\TRUNK', 'a816840f86c59626df24c4395a5cb78e90296772', true);
    expect(ret).toBeTruthy();
  });
});

describe.skip('getChangedFiles()', () => {
  let channel: KnifeGeneratorChannel;
  beforeAll(() => {
    channel = createInstance();
  });
  it('should return right change files under the git repository', () => {
    const changedFiles = channel.getChangedFiles('C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam\\TRUNK', true);
    expect(changedFiles.length).toEqual(4);
  });
  it('should return right change files under the svn repository', () => {
    const changedFiles = channel.getChangedFiles('C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam\\meta_trunk', false);
    expect(changedFiles.length).toEqual(4);
  });
});

describe.skip('createZipFile()', () => {
  let channel: KnifeGeneratorChannel;
  beforeAll(() => {
    channel = createInstance();
  });
  it('should zip file successfully', async (done) => {
    const projectPath = 'C:\\N-5CG8300N4C-Data\\zowu\\Development\\oam\\moam\\TRUNK';
    const changedFiles = channel.getChangedFiles(projectPath, true);
    await channel.createZipFile(changedFiles, projectPath);
    done();
  });
});
