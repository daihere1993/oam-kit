export interface Preferences {
  profile: Profile;
  ssh: {
    username: string;
    servers: string[];
    privateKeyPath: string;
  }
}

export interface Profile {
  svnAccount: { password: string };
  nsbAccount: { username: string, password: string };
}
