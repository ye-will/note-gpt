export {};

// this is workaround for node-fetch FormData & File type errors
// ref: https://github.com/node-fetch/node-fetch/issues/1617
declare global {
  type FormData = unknown;
  type File = unknown;
  var File: File;
}
