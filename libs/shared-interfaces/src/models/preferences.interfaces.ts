export interface Preferences {
  profile: Profile;
  serverList: string[];
}

export interface Profile {
  svnAccount: { password: string };
  nsbAccount: { username: string, password: string };
}
