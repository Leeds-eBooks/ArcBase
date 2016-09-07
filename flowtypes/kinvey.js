// @flow

declare type User = {
  login: (username: string, password: string) => Promise<Object>
}

declare type File = {
  upload: (file: File, data: Object, options: Object) => Promise<Object>,
  download: (id: string) => Promise<{_data: Blob}>
}

declare class Query {
  contains(prop: string, arr: Array<any>): Query;
  equalTo(prop: string, val: mixed): Query;
  descending(): Query;
  skip(num: number): Query;
  limit(num: number): Query;
}

declare type DataStore = {
  get: (table: string, id: string) => Promise<Object>,
  find: (table: string, query: Query) => Promise<Array<Object>>,
  save: (table: string, data: Object) => Promise<Object>,
  update: (table: string, data: Object) => Promise<Object>,
  destroy: (table: string, id: string) => Promise<void>
}

declare class Kinvey {
  static init: (data: {appKey: string, appSecret: string}) => Promise<Object>,
  static execute: (name: 'checkauthors', data: Object) => Promise<Array<Array<Object>>>,

  static User: User,
  static File: File,
  static DataStore: DataStore,
  static Query: typeof Query
}
