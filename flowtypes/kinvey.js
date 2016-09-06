// @flow

declare type User = {
  login: (username: string, password: string) => Promise<Object>
}

declare type File = {
  upload: (file: File, data: Object, options: Object) => Promise<Object>
}

declare type DataStore = {
  get: (table: string, id: string) => Promise<Object>,
  save: (table: string, data: Object) => Promise<Object>,
  update: (table: string, data: Object) => Promise<Object>
}

declare class Kinvey {
  static init(data: {appKey: string, appSecret: string}): Promise<Object>;
  static execute(name: 'checkauthors', data: Object): Promise<Array<Array<Object>>>;

  static User: User;
  static File: File;
  static DataStore: DataStore;
}
