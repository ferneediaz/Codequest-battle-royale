declare module 'express' {
  export * from '@types/express';
}

declare module 'cors' {
  import * as cors from '@types/cors';
  export = cors;
} 