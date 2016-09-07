// @flow

declare type User = {
  login: (username: string, password: string) => Promise<Object>
}

declare type File = {
  upload: (file: File, data: Object, options: Object) => Promise<Object>
}

declare class Query {}

declare type DataStore = {
  get: (table: string, id: string) => Promise<Object>,
  find: (table: string, query: Query) => Promise<Array<Object>>,
  save: (table: string, data: Object) => Promise<Object>,
  update: (table: string, data: Object) => Promise<Object>
}

declare type Kinvey = {
  init: (data: {appKey: string, appSecret: string}) => Promise<Object>,
  execute: (name: 'checkauthors', data: Object) => Promise<Array<Array<Object>>>,

  User: User,
  File: File,
  DataStore: DataStore,
  Query: Query
}
