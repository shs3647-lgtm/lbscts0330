
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model APQPProject
 * 
 */
export type APQPProject = $Result.DefaultSelection<Prisma.$APQPProjectPayload>
/**
 * Model L1Structure
 * 
 */
export type L1Structure = $Result.DefaultSelection<Prisma.$L1StructurePayload>
/**
 * Model L2Structure
 * 
 */
export type L2Structure = $Result.DefaultSelection<Prisma.$L2StructurePayload>
/**
 * Model L3Structure
 * 
 */
export type L3Structure = $Result.DefaultSelection<Prisma.$L3StructurePayload>
/**
 * Model L1Function
 * 
 */
export type L1Function = $Result.DefaultSelection<Prisma.$L1FunctionPayload>
/**
 * Model L2Function
 * 
 */
export type L2Function = $Result.DefaultSelection<Prisma.$L2FunctionPayload>
/**
 * Model L3Function
 * 
 */
export type L3Function = $Result.DefaultSelection<Prisma.$L3FunctionPayload>
/**
 * Model FailureEffect
 * 
 */
export type FailureEffect = $Result.DefaultSelection<Prisma.$FailureEffectPayload>
/**
 * Model FailureMode
 * 
 */
export type FailureMode = $Result.DefaultSelection<Prisma.$FailureModePayload>
/**
 * Model FailureCause
 * 
 */
export type FailureCause = $Result.DefaultSelection<Prisma.$FailureCausePayload>
/**
 * Model FailureLink
 * 
 */
export type FailureLink = $Result.DefaultSelection<Prisma.$FailureLinkPayload>
/**
 * Model RiskAnalysis
 * 
 */
export type RiskAnalysis = $Result.DefaultSelection<Prisma.$RiskAnalysisPayload>
/**
 * Model Optimization
 * 
 */
export type Optimization = $Result.DefaultSelection<Prisma.$OptimizationPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more APQPProjects
 * const aPQPProjects = await prisma.aPQPProject.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more APQPProjects
   * const aPQPProjects = await prisma.aPQPProject.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.aPQPProject`: Exposes CRUD operations for the **APQPProject** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more APQPProjects
    * const aPQPProjects = await prisma.aPQPProject.findMany()
    * ```
    */
  get aPQPProject(): Prisma.APQPProjectDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.l1Structure`: Exposes CRUD operations for the **L1Structure** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more L1Structures
    * const l1Structures = await prisma.l1Structure.findMany()
    * ```
    */
  get l1Structure(): Prisma.L1StructureDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.l2Structure`: Exposes CRUD operations for the **L2Structure** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more L2Structures
    * const l2Structures = await prisma.l2Structure.findMany()
    * ```
    */
  get l2Structure(): Prisma.L2StructureDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.l3Structure`: Exposes CRUD operations for the **L3Structure** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more L3Structures
    * const l3Structures = await prisma.l3Structure.findMany()
    * ```
    */
  get l3Structure(): Prisma.L3StructureDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.l1Function`: Exposes CRUD operations for the **L1Function** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more L1Functions
    * const l1Functions = await prisma.l1Function.findMany()
    * ```
    */
  get l1Function(): Prisma.L1FunctionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.l2Function`: Exposes CRUD operations for the **L2Function** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more L2Functions
    * const l2Functions = await prisma.l2Function.findMany()
    * ```
    */
  get l2Function(): Prisma.L2FunctionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.l3Function`: Exposes CRUD operations for the **L3Function** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more L3Functions
    * const l3Functions = await prisma.l3Function.findMany()
    * ```
    */
  get l3Function(): Prisma.L3FunctionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.failureEffect`: Exposes CRUD operations for the **FailureEffect** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FailureEffects
    * const failureEffects = await prisma.failureEffect.findMany()
    * ```
    */
  get failureEffect(): Prisma.FailureEffectDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.failureMode`: Exposes CRUD operations for the **FailureMode** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FailureModes
    * const failureModes = await prisma.failureMode.findMany()
    * ```
    */
  get failureMode(): Prisma.FailureModeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.failureCause`: Exposes CRUD operations for the **FailureCause** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FailureCauses
    * const failureCauses = await prisma.failureCause.findMany()
    * ```
    */
  get failureCause(): Prisma.FailureCauseDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.failureLink`: Exposes CRUD operations for the **FailureLink** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FailureLinks
    * const failureLinks = await prisma.failureLink.findMany()
    * ```
    */
  get failureLink(): Prisma.FailureLinkDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.riskAnalysis`: Exposes CRUD operations for the **RiskAnalysis** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RiskAnalyses
    * const riskAnalyses = await prisma.riskAnalysis.findMany()
    * ```
    */
  get riskAnalysis(): Prisma.RiskAnalysisDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.optimization`: Exposes CRUD operations for the **Optimization** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Optimizations
    * const optimizations = await prisma.optimization.findMany()
    * ```
    */
  get optimization(): Prisma.OptimizationDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.2.0
   * Query Engine version: 0c8ef2ce45c83248ab3df073180d5eda9e8be7a3
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    APQPProject: 'APQPProject',
    L1Structure: 'L1Structure',
    L2Structure: 'L2Structure',
    L3Structure: 'L3Structure',
    L1Function: 'L1Function',
    L2Function: 'L2Function',
    L3Function: 'L3Function',
    FailureEffect: 'FailureEffect',
    FailureMode: 'FailureMode',
    FailureCause: 'FailureCause',
    FailureLink: 'FailureLink',
    RiskAnalysis: 'RiskAnalysis',
    Optimization: 'Optimization'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "aPQPProject" | "l1Structure" | "l2Structure" | "l3Structure" | "l1Function" | "l2Function" | "l3Function" | "failureEffect" | "failureMode" | "failureCause" | "failureLink" | "riskAnalysis" | "optimization"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      APQPProject: {
        payload: Prisma.$APQPProjectPayload<ExtArgs>
        fields: Prisma.APQPProjectFieldRefs
        operations: {
          findUnique: {
            args: Prisma.APQPProjectFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.APQPProjectFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>
          }
          findFirst: {
            args: Prisma.APQPProjectFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.APQPProjectFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>
          }
          findMany: {
            args: Prisma.APQPProjectFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>[]
          }
          create: {
            args: Prisma.APQPProjectCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>
          }
          createMany: {
            args: Prisma.APQPProjectCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.APQPProjectCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>[]
          }
          delete: {
            args: Prisma.APQPProjectDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>
          }
          update: {
            args: Prisma.APQPProjectUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>
          }
          deleteMany: {
            args: Prisma.APQPProjectDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.APQPProjectUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.APQPProjectUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>[]
          }
          upsert: {
            args: Prisma.APQPProjectUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$APQPProjectPayload>
          }
          aggregate: {
            args: Prisma.APQPProjectAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAPQPProject>
          }
          groupBy: {
            args: Prisma.APQPProjectGroupByArgs<ExtArgs>
            result: $Utils.Optional<APQPProjectGroupByOutputType>[]
          }
          count: {
            args: Prisma.APQPProjectCountArgs<ExtArgs>
            result: $Utils.Optional<APQPProjectCountAggregateOutputType> | number
          }
        }
      }
      L1Structure: {
        payload: Prisma.$L1StructurePayload<ExtArgs>
        fields: Prisma.L1StructureFieldRefs
        operations: {
          findUnique: {
            args: Prisma.L1StructureFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.L1StructureFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>
          }
          findFirst: {
            args: Prisma.L1StructureFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.L1StructureFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>
          }
          findMany: {
            args: Prisma.L1StructureFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>[]
          }
          create: {
            args: Prisma.L1StructureCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>
          }
          createMany: {
            args: Prisma.L1StructureCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.L1StructureCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>[]
          }
          delete: {
            args: Prisma.L1StructureDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>
          }
          update: {
            args: Prisma.L1StructureUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>
          }
          deleteMany: {
            args: Prisma.L1StructureDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.L1StructureUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.L1StructureUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>[]
          }
          upsert: {
            args: Prisma.L1StructureUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1StructurePayload>
          }
          aggregate: {
            args: Prisma.L1StructureAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateL1Structure>
          }
          groupBy: {
            args: Prisma.L1StructureGroupByArgs<ExtArgs>
            result: $Utils.Optional<L1StructureGroupByOutputType>[]
          }
          count: {
            args: Prisma.L1StructureCountArgs<ExtArgs>
            result: $Utils.Optional<L1StructureCountAggregateOutputType> | number
          }
        }
      }
      L2Structure: {
        payload: Prisma.$L2StructurePayload<ExtArgs>
        fields: Prisma.L2StructureFieldRefs
        operations: {
          findUnique: {
            args: Prisma.L2StructureFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.L2StructureFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>
          }
          findFirst: {
            args: Prisma.L2StructureFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.L2StructureFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>
          }
          findMany: {
            args: Prisma.L2StructureFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>[]
          }
          create: {
            args: Prisma.L2StructureCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>
          }
          createMany: {
            args: Prisma.L2StructureCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.L2StructureCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>[]
          }
          delete: {
            args: Prisma.L2StructureDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>
          }
          update: {
            args: Prisma.L2StructureUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>
          }
          deleteMany: {
            args: Prisma.L2StructureDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.L2StructureUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.L2StructureUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>[]
          }
          upsert: {
            args: Prisma.L2StructureUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2StructurePayload>
          }
          aggregate: {
            args: Prisma.L2StructureAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateL2Structure>
          }
          groupBy: {
            args: Prisma.L2StructureGroupByArgs<ExtArgs>
            result: $Utils.Optional<L2StructureGroupByOutputType>[]
          }
          count: {
            args: Prisma.L2StructureCountArgs<ExtArgs>
            result: $Utils.Optional<L2StructureCountAggregateOutputType> | number
          }
        }
      }
      L3Structure: {
        payload: Prisma.$L3StructurePayload<ExtArgs>
        fields: Prisma.L3StructureFieldRefs
        operations: {
          findUnique: {
            args: Prisma.L3StructureFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.L3StructureFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>
          }
          findFirst: {
            args: Prisma.L3StructureFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.L3StructureFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>
          }
          findMany: {
            args: Prisma.L3StructureFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>[]
          }
          create: {
            args: Prisma.L3StructureCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>
          }
          createMany: {
            args: Prisma.L3StructureCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.L3StructureCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>[]
          }
          delete: {
            args: Prisma.L3StructureDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>
          }
          update: {
            args: Prisma.L3StructureUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>
          }
          deleteMany: {
            args: Prisma.L3StructureDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.L3StructureUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.L3StructureUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>[]
          }
          upsert: {
            args: Prisma.L3StructureUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3StructurePayload>
          }
          aggregate: {
            args: Prisma.L3StructureAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateL3Structure>
          }
          groupBy: {
            args: Prisma.L3StructureGroupByArgs<ExtArgs>
            result: $Utils.Optional<L3StructureGroupByOutputType>[]
          }
          count: {
            args: Prisma.L3StructureCountArgs<ExtArgs>
            result: $Utils.Optional<L3StructureCountAggregateOutputType> | number
          }
        }
      }
      L1Function: {
        payload: Prisma.$L1FunctionPayload<ExtArgs>
        fields: Prisma.L1FunctionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.L1FunctionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.L1FunctionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>
          }
          findFirst: {
            args: Prisma.L1FunctionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.L1FunctionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>
          }
          findMany: {
            args: Prisma.L1FunctionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>[]
          }
          create: {
            args: Prisma.L1FunctionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>
          }
          createMany: {
            args: Prisma.L1FunctionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.L1FunctionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>[]
          }
          delete: {
            args: Prisma.L1FunctionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>
          }
          update: {
            args: Prisma.L1FunctionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>
          }
          deleteMany: {
            args: Prisma.L1FunctionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.L1FunctionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.L1FunctionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>[]
          }
          upsert: {
            args: Prisma.L1FunctionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L1FunctionPayload>
          }
          aggregate: {
            args: Prisma.L1FunctionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateL1Function>
          }
          groupBy: {
            args: Prisma.L1FunctionGroupByArgs<ExtArgs>
            result: $Utils.Optional<L1FunctionGroupByOutputType>[]
          }
          count: {
            args: Prisma.L1FunctionCountArgs<ExtArgs>
            result: $Utils.Optional<L1FunctionCountAggregateOutputType> | number
          }
        }
      }
      L2Function: {
        payload: Prisma.$L2FunctionPayload<ExtArgs>
        fields: Prisma.L2FunctionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.L2FunctionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.L2FunctionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>
          }
          findFirst: {
            args: Prisma.L2FunctionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.L2FunctionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>
          }
          findMany: {
            args: Prisma.L2FunctionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>[]
          }
          create: {
            args: Prisma.L2FunctionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>
          }
          createMany: {
            args: Prisma.L2FunctionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.L2FunctionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>[]
          }
          delete: {
            args: Prisma.L2FunctionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>
          }
          update: {
            args: Prisma.L2FunctionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>
          }
          deleteMany: {
            args: Prisma.L2FunctionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.L2FunctionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.L2FunctionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>[]
          }
          upsert: {
            args: Prisma.L2FunctionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L2FunctionPayload>
          }
          aggregate: {
            args: Prisma.L2FunctionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateL2Function>
          }
          groupBy: {
            args: Prisma.L2FunctionGroupByArgs<ExtArgs>
            result: $Utils.Optional<L2FunctionGroupByOutputType>[]
          }
          count: {
            args: Prisma.L2FunctionCountArgs<ExtArgs>
            result: $Utils.Optional<L2FunctionCountAggregateOutputType> | number
          }
        }
      }
      L3Function: {
        payload: Prisma.$L3FunctionPayload<ExtArgs>
        fields: Prisma.L3FunctionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.L3FunctionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.L3FunctionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>
          }
          findFirst: {
            args: Prisma.L3FunctionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.L3FunctionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>
          }
          findMany: {
            args: Prisma.L3FunctionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>[]
          }
          create: {
            args: Prisma.L3FunctionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>
          }
          createMany: {
            args: Prisma.L3FunctionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.L3FunctionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>[]
          }
          delete: {
            args: Prisma.L3FunctionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>
          }
          update: {
            args: Prisma.L3FunctionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>
          }
          deleteMany: {
            args: Prisma.L3FunctionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.L3FunctionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.L3FunctionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>[]
          }
          upsert: {
            args: Prisma.L3FunctionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$L3FunctionPayload>
          }
          aggregate: {
            args: Prisma.L3FunctionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateL3Function>
          }
          groupBy: {
            args: Prisma.L3FunctionGroupByArgs<ExtArgs>
            result: $Utils.Optional<L3FunctionGroupByOutputType>[]
          }
          count: {
            args: Prisma.L3FunctionCountArgs<ExtArgs>
            result: $Utils.Optional<L3FunctionCountAggregateOutputType> | number
          }
        }
      }
      FailureEffect: {
        payload: Prisma.$FailureEffectPayload<ExtArgs>
        fields: Prisma.FailureEffectFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FailureEffectFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FailureEffectFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>
          }
          findFirst: {
            args: Prisma.FailureEffectFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FailureEffectFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>
          }
          findMany: {
            args: Prisma.FailureEffectFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>[]
          }
          create: {
            args: Prisma.FailureEffectCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>
          }
          createMany: {
            args: Prisma.FailureEffectCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FailureEffectCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>[]
          }
          delete: {
            args: Prisma.FailureEffectDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>
          }
          update: {
            args: Prisma.FailureEffectUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>
          }
          deleteMany: {
            args: Prisma.FailureEffectDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FailureEffectUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FailureEffectUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>[]
          }
          upsert: {
            args: Prisma.FailureEffectUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureEffectPayload>
          }
          aggregate: {
            args: Prisma.FailureEffectAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFailureEffect>
          }
          groupBy: {
            args: Prisma.FailureEffectGroupByArgs<ExtArgs>
            result: $Utils.Optional<FailureEffectGroupByOutputType>[]
          }
          count: {
            args: Prisma.FailureEffectCountArgs<ExtArgs>
            result: $Utils.Optional<FailureEffectCountAggregateOutputType> | number
          }
        }
      }
      FailureMode: {
        payload: Prisma.$FailureModePayload<ExtArgs>
        fields: Prisma.FailureModeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FailureModeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FailureModeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>
          }
          findFirst: {
            args: Prisma.FailureModeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FailureModeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>
          }
          findMany: {
            args: Prisma.FailureModeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>[]
          }
          create: {
            args: Prisma.FailureModeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>
          }
          createMany: {
            args: Prisma.FailureModeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FailureModeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>[]
          }
          delete: {
            args: Prisma.FailureModeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>
          }
          update: {
            args: Prisma.FailureModeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>
          }
          deleteMany: {
            args: Prisma.FailureModeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FailureModeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FailureModeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>[]
          }
          upsert: {
            args: Prisma.FailureModeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureModePayload>
          }
          aggregate: {
            args: Prisma.FailureModeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFailureMode>
          }
          groupBy: {
            args: Prisma.FailureModeGroupByArgs<ExtArgs>
            result: $Utils.Optional<FailureModeGroupByOutputType>[]
          }
          count: {
            args: Prisma.FailureModeCountArgs<ExtArgs>
            result: $Utils.Optional<FailureModeCountAggregateOutputType> | number
          }
        }
      }
      FailureCause: {
        payload: Prisma.$FailureCausePayload<ExtArgs>
        fields: Prisma.FailureCauseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FailureCauseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FailureCauseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>
          }
          findFirst: {
            args: Prisma.FailureCauseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FailureCauseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>
          }
          findMany: {
            args: Prisma.FailureCauseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>[]
          }
          create: {
            args: Prisma.FailureCauseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>
          }
          createMany: {
            args: Prisma.FailureCauseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FailureCauseCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>[]
          }
          delete: {
            args: Prisma.FailureCauseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>
          }
          update: {
            args: Prisma.FailureCauseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>
          }
          deleteMany: {
            args: Prisma.FailureCauseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FailureCauseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FailureCauseUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>[]
          }
          upsert: {
            args: Prisma.FailureCauseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureCausePayload>
          }
          aggregate: {
            args: Prisma.FailureCauseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFailureCause>
          }
          groupBy: {
            args: Prisma.FailureCauseGroupByArgs<ExtArgs>
            result: $Utils.Optional<FailureCauseGroupByOutputType>[]
          }
          count: {
            args: Prisma.FailureCauseCountArgs<ExtArgs>
            result: $Utils.Optional<FailureCauseCountAggregateOutputType> | number
          }
        }
      }
      FailureLink: {
        payload: Prisma.$FailureLinkPayload<ExtArgs>
        fields: Prisma.FailureLinkFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FailureLinkFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FailureLinkFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>
          }
          findFirst: {
            args: Prisma.FailureLinkFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FailureLinkFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>
          }
          findMany: {
            args: Prisma.FailureLinkFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>[]
          }
          create: {
            args: Prisma.FailureLinkCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>
          }
          createMany: {
            args: Prisma.FailureLinkCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FailureLinkCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>[]
          }
          delete: {
            args: Prisma.FailureLinkDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>
          }
          update: {
            args: Prisma.FailureLinkUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>
          }
          deleteMany: {
            args: Prisma.FailureLinkDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FailureLinkUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FailureLinkUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>[]
          }
          upsert: {
            args: Prisma.FailureLinkUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FailureLinkPayload>
          }
          aggregate: {
            args: Prisma.FailureLinkAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFailureLink>
          }
          groupBy: {
            args: Prisma.FailureLinkGroupByArgs<ExtArgs>
            result: $Utils.Optional<FailureLinkGroupByOutputType>[]
          }
          count: {
            args: Prisma.FailureLinkCountArgs<ExtArgs>
            result: $Utils.Optional<FailureLinkCountAggregateOutputType> | number
          }
        }
      }
      RiskAnalysis: {
        payload: Prisma.$RiskAnalysisPayload<ExtArgs>
        fields: Prisma.RiskAnalysisFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RiskAnalysisFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RiskAnalysisFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>
          }
          findFirst: {
            args: Prisma.RiskAnalysisFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RiskAnalysisFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>
          }
          findMany: {
            args: Prisma.RiskAnalysisFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>[]
          }
          create: {
            args: Prisma.RiskAnalysisCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>
          }
          createMany: {
            args: Prisma.RiskAnalysisCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RiskAnalysisCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>[]
          }
          delete: {
            args: Prisma.RiskAnalysisDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>
          }
          update: {
            args: Prisma.RiskAnalysisUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>
          }
          deleteMany: {
            args: Prisma.RiskAnalysisDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RiskAnalysisUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RiskAnalysisUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>[]
          }
          upsert: {
            args: Prisma.RiskAnalysisUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RiskAnalysisPayload>
          }
          aggregate: {
            args: Prisma.RiskAnalysisAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRiskAnalysis>
          }
          groupBy: {
            args: Prisma.RiskAnalysisGroupByArgs<ExtArgs>
            result: $Utils.Optional<RiskAnalysisGroupByOutputType>[]
          }
          count: {
            args: Prisma.RiskAnalysisCountArgs<ExtArgs>
            result: $Utils.Optional<RiskAnalysisCountAggregateOutputType> | number
          }
        }
      }
      Optimization: {
        payload: Prisma.$OptimizationPayload<ExtArgs>
        fields: Prisma.OptimizationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OptimizationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OptimizationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>
          }
          findFirst: {
            args: Prisma.OptimizationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OptimizationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>
          }
          findMany: {
            args: Prisma.OptimizationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>[]
          }
          create: {
            args: Prisma.OptimizationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>
          }
          createMany: {
            args: Prisma.OptimizationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OptimizationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>[]
          }
          delete: {
            args: Prisma.OptimizationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>
          }
          update: {
            args: Prisma.OptimizationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>
          }
          deleteMany: {
            args: Prisma.OptimizationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OptimizationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.OptimizationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>[]
          }
          upsert: {
            args: Prisma.OptimizationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OptimizationPayload>
          }
          aggregate: {
            args: Prisma.OptimizationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOptimization>
          }
          groupBy: {
            args: Prisma.OptimizationGroupByArgs<ExtArgs>
            result: $Utils.Optional<OptimizationGroupByOutputType>[]
          }
          count: {
            args: Prisma.OptimizationCountArgs<ExtArgs>
            result: $Utils.Optional<OptimizationCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    aPQPProject?: APQPProjectOmit
    l1Structure?: L1StructureOmit
    l2Structure?: L2StructureOmit
    l3Structure?: L3StructureOmit
    l1Function?: L1FunctionOmit
    l2Function?: L2FunctionOmit
    l3Function?: L3FunctionOmit
    failureEffect?: FailureEffectOmit
    failureMode?: FailureModeOmit
    failureCause?: FailureCauseOmit
    failureLink?: FailureLinkOmit
    riskAnalysis?: RiskAnalysisOmit
    optimization?: OptimizationOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type L1StructureCountOutputType
   */

  export type L1StructureCountOutputType = {
    l2Structures: number
    l1Functions: number
  }

  export type L1StructureCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structures?: boolean | L1StructureCountOutputTypeCountL2StructuresArgs
    l1Functions?: boolean | L1StructureCountOutputTypeCountL1FunctionsArgs
  }

  // Custom InputTypes
  /**
   * L1StructureCountOutputType without action
   */
  export type L1StructureCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1StructureCountOutputType
     */
    select?: L1StructureCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * L1StructureCountOutputType without action
   */
  export type L1StructureCountOutputTypeCountL2StructuresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L2StructureWhereInput
  }

  /**
   * L1StructureCountOutputType without action
   */
  export type L1StructureCountOutputTypeCountL1FunctionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L1FunctionWhereInput
  }


  /**
   * Count Type L2StructureCountOutputType
   */

  export type L2StructureCountOutputType = {
    l3Structures: number
    l2Functions: number
    failureModes: number
  }

  export type L2StructureCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Structures?: boolean | L2StructureCountOutputTypeCountL3StructuresArgs
    l2Functions?: boolean | L2StructureCountOutputTypeCountL2FunctionsArgs
    failureModes?: boolean | L2StructureCountOutputTypeCountFailureModesArgs
  }

  // Custom InputTypes
  /**
   * L2StructureCountOutputType without action
   */
  export type L2StructureCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2StructureCountOutputType
     */
    select?: L2StructureCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * L2StructureCountOutputType without action
   */
  export type L2StructureCountOutputTypeCountL3StructuresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L3StructureWhereInput
  }

  /**
   * L2StructureCountOutputType without action
   */
  export type L2StructureCountOutputTypeCountL2FunctionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L2FunctionWhereInput
  }

  /**
   * L2StructureCountOutputType without action
   */
  export type L2StructureCountOutputTypeCountFailureModesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureModeWhereInput
  }


  /**
   * Count Type L3StructureCountOutputType
   */

  export type L3StructureCountOutputType = {
    l3Functions: number
    failureCauses: number
  }

  export type L3StructureCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Functions?: boolean | L3StructureCountOutputTypeCountL3FunctionsArgs
    failureCauses?: boolean | L3StructureCountOutputTypeCountFailureCausesArgs
  }

  // Custom InputTypes
  /**
   * L3StructureCountOutputType without action
   */
  export type L3StructureCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3StructureCountOutputType
     */
    select?: L3StructureCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * L3StructureCountOutputType without action
   */
  export type L3StructureCountOutputTypeCountL3FunctionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L3FunctionWhereInput
  }

  /**
   * L3StructureCountOutputType without action
   */
  export type L3StructureCountOutputTypeCountFailureCausesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureCauseWhereInput
  }


  /**
   * Count Type L1FunctionCountOutputType
   */

  export type L1FunctionCountOutputType = {
    failureEffects: number
  }

  export type L1FunctionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureEffects?: boolean | L1FunctionCountOutputTypeCountFailureEffectsArgs
  }

  // Custom InputTypes
  /**
   * L1FunctionCountOutputType without action
   */
  export type L1FunctionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1FunctionCountOutputType
     */
    select?: L1FunctionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * L1FunctionCountOutputType without action
   */
  export type L1FunctionCountOutputTypeCountFailureEffectsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureEffectWhereInput
  }


  /**
   * Count Type L2FunctionCountOutputType
   */

  export type L2FunctionCountOutputType = {
    failureModes: number
  }

  export type L2FunctionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureModes?: boolean | L2FunctionCountOutputTypeCountFailureModesArgs
  }

  // Custom InputTypes
  /**
   * L2FunctionCountOutputType without action
   */
  export type L2FunctionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2FunctionCountOutputType
     */
    select?: L2FunctionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * L2FunctionCountOutputType without action
   */
  export type L2FunctionCountOutputTypeCountFailureModesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureModeWhereInput
  }


  /**
   * Count Type L3FunctionCountOutputType
   */

  export type L3FunctionCountOutputType = {
    failureCauses: number
  }

  export type L3FunctionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureCauses?: boolean | L3FunctionCountOutputTypeCountFailureCausesArgs
  }

  // Custom InputTypes
  /**
   * L3FunctionCountOutputType without action
   */
  export type L3FunctionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3FunctionCountOutputType
     */
    select?: L3FunctionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * L3FunctionCountOutputType without action
   */
  export type L3FunctionCountOutputTypeCountFailureCausesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureCauseWhereInput
  }


  /**
   * Count Type FailureEffectCountOutputType
   */

  export type FailureEffectCountOutputType = {
    failureLinks: number
  }

  export type FailureEffectCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureLinks?: boolean | FailureEffectCountOutputTypeCountFailureLinksArgs
  }

  // Custom InputTypes
  /**
   * FailureEffectCountOutputType without action
   */
  export type FailureEffectCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffectCountOutputType
     */
    select?: FailureEffectCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FailureEffectCountOutputType without action
   */
  export type FailureEffectCountOutputTypeCountFailureLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureLinkWhereInput
  }


  /**
   * Count Type FailureModeCountOutputType
   */

  export type FailureModeCountOutputType = {
    failureLinks: number
  }

  export type FailureModeCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureLinks?: boolean | FailureModeCountOutputTypeCountFailureLinksArgs
  }

  // Custom InputTypes
  /**
   * FailureModeCountOutputType without action
   */
  export type FailureModeCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureModeCountOutputType
     */
    select?: FailureModeCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FailureModeCountOutputType without action
   */
  export type FailureModeCountOutputTypeCountFailureLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureLinkWhereInput
  }


  /**
   * Count Type FailureCauseCountOutputType
   */

  export type FailureCauseCountOutputType = {
    failureLinks: number
  }

  export type FailureCauseCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureLinks?: boolean | FailureCauseCountOutputTypeCountFailureLinksArgs
  }

  // Custom InputTypes
  /**
   * FailureCauseCountOutputType without action
   */
  export type FailureCauseCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCauseCountOutputType
     */
    select?: FailureCauseCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FailureCauseCountOutputType without action
   */
  export type FailureCauseCountOutputTypeCountFailureLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureLinkWhereInput
  }


  /**
   * Count Type FailureLinkCountOutputType
   */

  export type FailureLinkCountOutputType = {
    riskAnalyses: number
  }

  export type FailureLinkCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    riskAnalyses?: boolean | FailureLinkCountOutputTypeCountRiskAnalysesArgs
  }

  // Custom InputTypes
  /**
   * FailureLinkCountOutputType without action
   */
  export type FailureLinkCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLinkCountOutputType
     */
    select?: FailureLinkCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FailureLinkCountOutputType without action
   */
  export type FailureLinkCountOutputTypeCountRiskAnalysesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RiskAnalysisWhereInput
  }


  /**
   * Count Type RiskAnalysisCountOutputType
   */

  export type RiskAnalysisCountOutputType = {
    optimizations: number
  }

  export type RiskAnalysisCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    optimizations?: boolean | RiskAnalysisCountOutputTypeCountOptimizationsArgs
  }

  // Custom InputTypes
  /**
   * RiskAnalysisCountOutputType without action
   */
  export type RiskAnalysisCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysisCountOutputType
     */
    select?: RiskAnalysisCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RiskAnalysisCountOutputType without action
   */
  export type RiskAnalysisCountOutputTypeCountOptimizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OptimizationWhereInput
  }


  /**
   * Models
   */

  /**
   * Model APQPProject
   */

  export type AggregateAPQPProject = {
    _count: APQPProjectCountAggregateOutputType | null
    _min: APQPProjectMinAggregateOutputType | null
    _max: APQPProjectMaxAggregateOutputType | null
  }

  export type APQPProjectMinAggregateOutputType = {
    id: string | null
    name: string | null
    productName: string | null
    customerName: string | null
    status: string | null
    startDate: string | null
    targetDate: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type APQPProjectMaxAggregateOutputType = {
    id: string | null
    name: string | null
    productName: string | null
    customerName: string | null
    status: string | null
    startDate: string | null
    targetDate: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type APQPProjectCountAggregateOutputType = {
    id: number
    name: number
    productName: number
    customerName: number
    status: number
    startDate: number
    targetDate: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type APQPProjectMinAggregateInputType = {
    id?: true
    name?: true
    productName?: true
    customerName?: true
    status?: true
    startDate?: true
    targetDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type APQPProjectMaxAggregateInputType = {
    id?: true
    name?: true
    productName?: true
    customerName?: true
    status?: true
    startDate?: true
    targetDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type APQPProjectCountAggregateInputType = {
    id?: true
    name?: true
    productName?: true
    customerName?: true
    status?: true
    startDate?: true
    targetDate?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type APQPProjectAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which APQPProject to aggregate.
     */
    where?: APQPProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of APQPProjects to fetch.
     */
    orderBy?: APQPProjectOrderByWithRelationInput | APQPProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: APQPProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` APQPProjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` APQPProjects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned APQPProjects
    **/
    _count?: true | APQPProjectCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: APQPProjectMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: APQPProjectMaxAggregateInputType
  }

  export type GetAPQPProjectAggregateType<T extends APQPProjectAggregateArgs> = {
        [P in keyof T & keyof AggregateAPQPProject]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAPQPProject[P]>
      : GetScalarType<T[P], AggregateAPQPProject[P]>
  }




  export type APQPProjectGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: APQPProjectWhereInput
    orderBy?: APQPProjectOrderByWithAggregationInput | APQPProjectOrderByWithAggregationInput[]
    by: APQPProjectScalarFieldEnum[] | APQPProjectScalarFieldEnum
    having?: APQPProjectScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: APQPProjectCountAggregateInputType | true
    _min?: APQPProjectMinAggregateInputType
    _max?: APQPProjectMaxAggregateInputType
  }

  export type APQPProjectGroupByOutputType = {
    id: string
    name: string
    productName: string
    customerName: string
    status: string
    startDate: string | null
    targetDate: string | null
    createdAt: Date
    updatedAt: Date
    _count: APQPProjectCountAggregateOutputType | null
    _min: APQPProjectMinAggregateOutputType | null
    _max: APQPProjectMaxAggregateOutputType | null
  }

  type GetAPQPProjectGroupByPayload<T extends APQPProjectGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<APQPProjectGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof APQPProjectGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], APQPProjectGroupByOutputType[P]>
            : GetScalarType<T[P], APQPProjectGroupByOutputType[P]>
        }
      >
    >


  export type APQPProjectSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    productName?: boolean
    customerName?: boolean
    status?: boolean
    startDate?: boolean
    targetDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["aPQPProject"]>

  export type APQPProjectSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    productName?: boolean
    customerName?: boolean
    status?: boolean
    startDate?: boolean
    targetDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["aPQPProject"]>

  export type APQPProjectSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    productName?: boolean
    customerName?: boolean
    status?: boolean
    startDate?: boolean
    targetDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["aPQPProject"]>

  export type APQPProjectSelectScalar = {
    id?: boolean
    name?: boolean
    productName?: boolean
    customerName?: boolean
    status?: boolean
    startDate?: boolean
    targetDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type APQPProjectOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "productName" | "customerName" | "status" | "startDate" | "targetDate" | "createdAt" | "updatedAt", ExtArgs["result"]["aPQPProject"]>

  export type $APQPProjectPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "APQPProject"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      productName: string
      customerName: string
      status: string
      startDate: string | null
      targetDate: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["aPQPProject"]>
    composites: {}
  }

  type APQPProjectGetPayload<S extends boolean | null | undefined | APQPProjectDefaultArgs> = $Result.GetResult<Prisma.$APQPProjectPayload, S>

  type APQPProjectCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<APQPProjectFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: APQPProjectCountAggregateInputType | true
    }

  export interface APQPProjectDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['APQPProject'], meta: { name: 'APQPProject' } }
    /**
     * Find zero or one APQPProject that matches the filter.
     * @param {APQPProjectFindUniqueArgs} args - Arguments to find a APQPProject
     * @example
     * // Get one APQPProject
     * const aPQPProject = await prisma.aPQPProject.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends APQPProjectFindUniqueArgs>(args: SelectSubset<T, APQPProjectFindUniqueArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one APQPProject that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {APQPProjectFindUniqueOrThrowArgs} args - Arguments to find a APQPProject
     * @example
     * // Get one APQPProject
     * const aPQPProject = await prisma.aPQPProject.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends APQPProjectFindUniqueOrThrowArgs>(args: SelectSubset<T, APQPProjectFindUniqueOrThrowArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first APQPProject that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {APQPProjectFindFirstArgs} args - Arguments to find a APQPProject
     * @example
     * // Get one APQPProject
     * const aPQPProject = await prisma.aPQPProject.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends APQPProjectFindFirstArgs>(args?: SelectSubset<T, APQPProjectFindFirstArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first APQPProject that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {APQPProjectFindFirstOrThrowArgs} args - Arguments to find a APQPProject
     * @example
     * // Get one APQPProject
     * const aPQPProject = await prisma.aPQPProject.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends APQPProjectFindFirstOrThrowArgs>(args?: SelectSubset<T, APQPProjectFindFirstOrThrowArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more APQPProjects that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {APQPProjectFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all APQPProjects
     * const aPQPProjects = await prisma.aPQPProject.findMany()
     * 
     * // Get first 10 APQPProjects
     * const aPQPProjects = await prisma.aPQPProject.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aPQPProjectWithIdOnly = await prisma.aPQPProject.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends APQPProjectFindManyArgs>(args?: SelectSubset<T, APQPProjectFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a APQPProject.
     * @param {APQPProjectCreateArgs} args - Arguments to create a APQPProject.
     * @example
     * // Create one APQPProject
     * const APQPProject = await prisma.aPQPProject.create({
     *   data: {
     *     // ... data to create a APQPProject
     *   }
     * })
     * 
     */
    create<T extends APQPProjectCreateArgs>(args: SelectSubset<T, APQPProjectCreateArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many APQPProjects.
     * @param {APQPProjectCreateManyArgs} args - Arguments to create many APQPProjects.
     * @example
     * // Create many APQPProjects
     * const aPQPProject = await prisma.aPQPProject.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends APQPProjectCreateManyArgs>(args?: SelectSubset<T, APQPProjectCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many APQPProjects and returns the data saved in the database.
     * @param {APQPProjectCreateManyAndReturnArgs} args - Arguments to create many APQPProjects.
     * @example
     * // Create many APQPProjects
     * const aPQPProject = await prisma.aPQPProject.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many APQPProjects and only return the `id`
     * const aPQPProjectWithIdOnly = await prisma.aPQPProject.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends APQPProjectCreateManyAndReturnArgs>(args?: SelectSubset<T, APQPProjectCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a APQPProject.
     * @param {APQPProjectDeleteArgs} args - Arguments to delete one APQPProject.
     * @example
     * // Delete one APQPProject
     * const APQPProject = await prisma.aPQPProject.delete({
     *   where: {
     *     // ... filter to delete one APQPProject
     *   }
     * })
     * 
     */
    delete<T extends APQPProjectDeleteArgs>(args: SelectSubset<T, APQPProjectDeleteArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one APQPProject.
     * @param {APQPProjectUpdateArgs} args - Arguments to update one APQPProject.
     * @example
     * // Update one APQPProject
     * const aPQPProject = await prisma.aPQPProject.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends APQPProjectUpdateArgs>(args: SelectSubset<T, APQPProjectUpdateArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more APQPProjects.
     * @param {APQPProjectDeleteManyArgs} args - Arguments to filter APQPProjects to delete.
     * @example
     * // Delete a few APQPProjects
     * const { count } = await prisma.aPQPProject.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends APQPProjectDeleteManyArgs>(args?: SelectSubset<T, APQPProjectDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more APQPProjects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {APQPProjectUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many APQPProjects
     * const aPQPProject = await prisma.aPQPProject.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends APQPProjectUpdateManyArgs>(args: SelectSubset<T, APQPProjectUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more APQPProjects and returns the data updated in the database.
     * @param {APQPProjectUpdateManyAndReturnArgs} args - Arguments to update many APQPProjects.
     * @example
     * // Update many APQPProjects
     * const aPQPProject = await prisma.aPQPProject.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more APQPProjects and only return the `id`
     * const aPQPProjectWithIdOnly = await prisma.aPQPProject.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends APQPProjectUpdateManyAndReturnArgs>(args: SelectSubset<T, APQPProjectUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one APQPProject.
     * @param {APQPProjectUpsertArgs} args - Arguments to update or create a APQPProject.
     * @example
     * // Update or create a APQPProject
     * const aPQPProject = await prisma.aPQPProject.upsert({
     *   create: {
     *     // ... data to create a APQPProject
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the APQPProject we want to update
     *   }
     * })
     */
    upsert<T extends APQPProjectUpsertArgs>(args: SelectSubset<T, APQPProjectUpsertArgs<ExtArgs>>): Prisma__APQPProjectClient<$Result.GetResult<Prisma.$APQPProjectPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of APQPProjects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {APQPProjectCountArgs} args - Arguments to filter APQPProjects to count.
     * @example
     * // Count the number of APQPProjects
     * const count = await prisma.aPQPProject.count({
     *   where: {
     *     // ... the filter for the APQPProjects we want to count
     *   }
     * })
    **/
    count<T extends APQPProjectCountArgs>(
      args?: Subset<T, APQPProjectCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], APQPProjectCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a APQPProject.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {APQPProjectAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends APQPProjectAggregateArgs>(args: Subset<T, APQPProjectAggregateArgs>): Prisma.PrismaPromise<GetAPQPProjectAggregateType<T>>

    /**
     * Group by APQPProject.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {APQPProjectGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends APQPProjectGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: APQPProjectGroupByArgs['orderBy'] }
        : { orderBy?: APQPProjectGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, APQPProjectGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAPQPProjectGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the APQPProject model
   */
  readonly fields: APQPProjectFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for APQPProject.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__APQPProjectClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the APQPProject model
   */
  interface APQPProjectFieldRefs {
    readonly id: FieldRef<"APQPProject", 'String'>
    readonly name: FieldRef<"APQPProject", 'String'>
    readonly productName: FieldRef<"APQPProject", 'String'>
    readonly customerName: FieldRef<"APQPProject", 'String'>
    readonly status: FieldRef<"APQPProject", 'String'>
    readonly startDate: FieldRef<"APQPProject", 'String'>
    readonly targetDate: FieldRef<"APQPProject", 'String'>
    readonly createdAt: FieldRef<"APQPProject", 'DateTime'>
    readonly updatedAt: FieldRef<"APQPProject", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * APQPProject findUnique
   */
  export type APQPProjectFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * Filter, which APQPProject to fetch.
     */
    where: APQPProjectWhereUniqueInput
  }

  /**
   * APQPProject findUniqueOrThrow
   */
  export type APQPProjectFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * Filter, which APQPProject to fetch.
     */
    where: APQPProjectWhereUniqueInput
  }

  /**
   * APQPProject findFirst
   */
  export type APQPProjectFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * Filter, which APQPProject to fetch.
     */
    where?: APQPProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of APQPProjects to fetch.
     */
    orderBy?: APQPProjectOrderByWithRelationInput | APQPProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for APQPProjects.
     */
    cursor?: APQPProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` APQPProjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` APQPProjects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of APQPProjects.
     */
    distinct?: APQPProjectScalarFieldEnum | APQPProjectScalarFieldEnum[]
  }

  /**
   * APQPProject findFirstOrThrow
   */
  export type APQPProjectFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * Filter, which APQPProject to fetch.
     */
    where?: APQPProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of APQPProjects to fetch.
     */
    orderBy?: APQPProjectOrderByWithRelationInput | APQPProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for APQPProjects.
     */
    cursor?: APQPProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` APQPProjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` APQPProjects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of APQPProjects.
     */
    distinct?: APQPProjectScalarFieldEnum | APQPProjectScalarFieldEnum[]
  }

  /**
   * APQPProject findMany
   */
  export type APQPProjectFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * Filter, which APQPProjects to fetch.
     */
    where?: APQPProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of APQPProjects to fetch.
     */
    orderBy?: APQPProjectOrderByWithRelationInput | APQPProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing APQPProjects.
     */
    cursor?: APQPProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` APQPProjects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` APQPProjects.
     */
    skip?: number
    distinct?: APQPProjectScalarFieldEnum | APQPProjectScalarFieldEnum[]
  }

  /**
   * APQPProject create
   */
  export type APQPProjectCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * The data needed to create a APQPProject.
     */
    data: XOR<APQPProjectCreateInput, APQPProjectUncheckedCreateInput>
  }

  /**
   * APQPProject createMany
   */
  export type APQPProjectCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many APQPProjects.
     */
    data: APQPProjectCreateManyInput | APQPProjectCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * APQPProject createManyAndReturn
   */
  export type APQPProjectCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * The data used to create many APQPProjects.
     */
    data: APQPProjectCreateManyInput | APQPProjectCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * APQPProject update
   */
  export type APQPProjectUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * The data needed to update a APQPProject.
     */
    data: XOR<APQPProjectUpdateInput, APQPProjectUncheckedUpdateInput>
    /**
     * Choose, which APQPProject to update.
     */
    where: APQPProjectWhereUniqueInput
  }

  /**
   * APQPProject updateMany
   */
  export type APQPProjectUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update APQPProjects.
     */
    data: XOR<APQPProjectUpdateManyMutationInput, APQPProjectUncheckedUpdateManyInput>
    /**
     * Filter which APQPProjects to update
     */
    where?: APQPProjectWhereInput
    /**
     * Limit how many APQPProjects to update.
     */
    limit?: number
  }

  /**
   * APQPProject updateManyAndReturn
   */
  export type APQPProjectUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * The data used to update APQPProjects.
     */
    data: XOR<APQPProjectUpdateManyMutationInput, APQPProjectUncheckedUpdateManyInput>
    /**
     * Filter which APQPProjects to update
     */
    where?: APQPProjectWhereInput
    /**
     * Limit how many APQPProjects to update.
     */
    limit?: number
  }

  /**
   * APQPProject upsert
   */
  export type APQPProjectUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * The filter to search for the APQPProject to update in case it exists.
     */
    where: APQPProjectWhereUniqueInput
    /**
     * In case the APQPProject found by the `where` argument doesn't exist, create a new APQPProject with this data.
     */
    create: XOR<APQPProjectCreateInput, APQPProjectUncheckedCreateInput>
    /**
     * In case the APQPProject was found with the provided `where` argument, update it with this data.
     */
    update: XOR<APQPProjectUpdateInput, APQPProjectUncheckedUpdateInput>
  }

  /**
   * APQPProject delete
   */
  export type APQPProjectDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
    /**
     * Filter which APQPProject to delete.
     */
    where: APQPProjectWhereUniqueInput
  }

  /**
   * APQPProject deleteMany
   */
  export type APQPProjectDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which APQPProjects to delete
     */
    where?: APQPProjectWhereInput
    /**
     * Limit how many APQPProjects to delete.
     */
    limit?: number
  }

  /**
   * APQPProject without action
   */
  export type APQPProjectDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the APQPProject
     */
    select?: APQPProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the APQPProject
     */
    omit?: APQPProjectOmit<ExtArgs> | null
  }


  /**
   * Model L1Structure
   */

  export type AggregateL1Structure = {
    _count: L1StructureCountAggregateOutputType | null
    _min: L1StructureMinAggregateOutputType | null
    _max: L1StructureMaxAggregateOutputType | null
  }

  export type L1StructureMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    name: string | null
    confirmed: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L1StructureMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    name: string | null
    confirmed: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L1StructureCountAggregateOutputType = {
    id: number
    fmeaId: number
    name: number
    confirmed: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type L1StructureMinAggregateInputType = {
    id?: true
    fmeaId?: true
    name?: true
    confirmed?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L1StructureMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    name?: true
    confirmed?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L1StructureCountAggregateInputType = {
    id?: true
    fmeaId?: true
    name?: true
    confirmed?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type L1StructureAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L1Structure to aggregate.
     */
    where?: L1StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Structures to fetch.
     */
    orderBy?: L1StructureOrderByWithRelationInput | L1StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: L1StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned L1Structures
    **/
    _count?: true | L1StructureCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: L1StructureMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: L1StructureMaxAggregateInputType
  }

  export type GetL1StructureAggregateType<T extends L1StructureAggregateArgs> = {
        [P in keyof T & keyof AggregateL1Structure]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateL1Structure[P]>
      : GetScalarType<T[P], AggregateL1Structure[P]>
  }




  export type L1StructureGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L1StructureWhereInput
    orderBy?: L1StructureOrderByWithAggregationInput | L1StructureOrderByWithAggregationInput[]
    by: L1StructureScalarFieldEnum[] | L1StructureScalarFieldEnum
    having?: L1StructureScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: L1StructureCountAggregateInputType | true
    _min?: L1StructureMinAggregateInputType
    _max?: L1StructureMaxAggregateInputType
  }

  export type L1StructureGroupByOutputType = {
    id: string
    fmeaId: string
    name: string
    confirmed: boolean | null
    createdAt: Date
    updatedAt: Date
    _count: L1StructureCountAggregateOutputType | null
    _min: L1StructureMinAggregateOutputType | null
    _max: L1StructureMaxAggregateOutputType | null
  }

  type GetL1StructureGroupByPayload<T extends L1StructureGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<L1StructureGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof L1StructureGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], L1StructureGroupByOutputType[P]>
            : GetScalarType<T[P], L1StructureGroupByOutputType[P]>
        }
      >
    >


  export type L1StructureSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    name?: boolean
    confirmed?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Structures?: boolean | L1Structure$l2StructuresArgs<ExtArgs>
    l1Functions?: boolean | L1Structure$l1FunctionsArgs<ExtArgs>
    _count?: boolean | L1StructureCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l1Structure"]>

  export type L1StructureSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    name?: boolean
    confirmed?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["l1Structure"]>

  export type L1StructureSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    name?: boolean
    confirmed?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["l1Structure"]>

  export type L1StructureSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    name?: boolean
    confirmed?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type L1StructureOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "name" | "confirmed" | "createdAt" | "updatedAt", ExtArgs["result"]["l1Structure"]>
  export type L1StructureInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structures?: boolean | L1Structure$l2StructuresArgs<ExtArgs>
    l1Functions?: boolean | L1Structure$l1FunctionsArgs<ExtArgs>
    _count?: boolean | L1StructureCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type L1StructureIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type L1StructureIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $L1StructurePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "L1Structure"
    objects: {
      l2Structures: Prisma.$L2StructurePayload<ExtArgs>[]
      l1Functions: Prisma.$L1FunctionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      name: string
      confirmed: boolean | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["l1Structure"]>
    composites: {}
  }

  type L1StructureGetPayload<S extends boolean | null | undefined | L1StructureDefaultArgs> = $Result.GetResult<Prisma.$L1StructurePayload, S>

  type L1StructureCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<L1StructureFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: L1StructureCountAggregateInputType | true
    }

  export interface L1StructureDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['L1Structure'], meta: { name: 'L1Structure' } }
    /**
     * Find zero or one L1Structure that matches the filter.
     * @param {L1StructureFindUniqueArgs} args - Arguments to find a L1Structure
     * @example
     * // Get one L1Structure
     * const l1Structure = await prisma.l1Structure.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends L1StructureFindUniqueArgs>(args: SelectSubset<T, L1StructureFindUniqueArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one L1Structure that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {L1StructureFindUniqueOrThrowArgs} args - Arguments to find a L1Structure
     * @example
     * // Get one L1Structure
     * const l1Structure = await prisma.l1Structure.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends L1StructureFindUniqueOrThrowArgs>(args: SelectSubset<T, L1StructureFindUniqueOrThrowArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L1Structure that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1StructureFindFirstArgs} args - Arguments to find a L1Structure
     * @example
     * // Get one L1Structure
     * const l1Structure = await prisma.l1Structure.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends L1StructureFindFirstArgs>(args?: SelectSubset<T, L1StructureFindFirstArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L1Structure that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1StructureFindFirstOrThrowArgs} args - Arguments to find a L1Structure
     * @example
     * // Get one L1Structure
     * const l1Structure = await prisma.l1Structure.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends L1StructureFindFirstOrThrowArgs>(args?: SelectSubset<T, L1StructureFindFirstOrThrowArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more L1Structures that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1StructureFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all L1Structures
     * const l1Structures = await prisma.l1Structure.findMany()
     * 
     * // Get first 10 L1Structures
     * const l1Structures = await prisma.l1Structure.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const l1StructureWithIdOnly = await prisma.l1Structure.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends L1StructureFindManyArgs>(args?: SelectSubset<T, L1StructureFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a L1Structure.
     * @param {L1StructureCreateArgs} args - Arguments to create a L1Structure.
     * @example
     * // Create one L1Structure
     * const L1Structure = await prisma.l1Structure.create({
     *   data: {
     *     // ... data to create a L1Structure
     *   }
     * })
     * 
     */
    create<T extends L1StructureCreateArgs>(args: SelectSubset<T, L1StructureCreateArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many L1Structures.
     * @param {L1StructureCreateManyArgs} args - Arguments to create many L1Structures.
     * @example
     * // Create many L1Structures
     * const l1Structure = await prisma.l1Structure.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends L1StructureCreateManyArgs>(args?: SelectSubset<T, L1StructureCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many L1Structures and returns the data saved in the database.
     * @param {L1StructureCreateManyAndReturnArgs} args - Arguments to create many L1Structures.
     * @example
     * // Create many L1Structures
     * const l1Structure = await prisma.l1Structure.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many L1Structures and only return the `id`
     * const l1StructureWithIdOnly = await prisma.l1Structure.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends L1StructureCreateManyAndReturnArgs>(args?: SelectSubset<T, L1StructureCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a L1Structure.
     * @param {L1StructureDeleteArgs} args - Arguments to delete one L1Structure.
     * @example
     * // Delete one L1Structure
     * const L1Structure = await prisma.l1Structure.delete({
     *   where: {
     *     // ... filter to delete one L1Structure
     *   }
     * })
     * 
     */
    delete<T extends L1StructureDeleteArgs>(args: SelectSubset<T, L1StructureDeleteArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one L1Structure.
     * @param {L1StructureUpdateArgs} args - Arguments to update one L1Structure.
     * @example
     * // Update one L1Structure
     * const l1Structure = await prisma.l1Structure.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends L1StructureUpdateArgs>(args: SelectSubset<T, L1StructureUpdateArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more L1Structures.
     * @param {L1StructureDeleteManyArgs} args - Arguments to filter L1Structures to delete.
     * @example
     * // Delete a few L1Structures
     * const { count } = await prisma.l1Structure.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends L1StructureDeleteManyArgs>(args?: SelectSubset<T, L1StructureDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L1Structures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1StructureUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many L1Structures
     * const l1Structure = await prisma.l1Structure.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends L1StructureUpdateManyArgs>(args: SelectSubset<T, L1StructureUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L1Structures and returns the data updated in the database.
     * @param {L1StructureUpdateManyAndReturnArgs} args - Arguments to update many L1Structures.
     * @example
     * // Update many L1Structures
     * const l1Structure = await prisma.l1Structure.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more L1Structures and only return the `id`
     * const l1StructureWithIdOnly = await prisma.l1Structure.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends L1StructureUpdateManyAndReturnArgs>(args: SelectSubset<T, L1StructureUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one L1Structure.
     * @param {L1StructureUpsertArgs} args - Arguments to update or create a L1Structure.
     * @example
     * // Update or create a L1Structure
     * const l1Structure = await prisma.l1Structure.upsert({
     *   create: {
     *     // ... data to create a L1Structure
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the L1Structure we want to update
     *   }
     * })
     */
    upsert<T extends L1StructureUpsertArgs>(args: SelectSubset<T, L1StructureUpsertArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of L1Structures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1StructureCountArgs} args - Arguments to filter L1Structures to count.
     * @example
     * // Count the number of L1Structures
     * const count = await prisma.l1Structure.count({
     *   where: {
     *     // ... the filter for the L1Structures we want to count
     *   }
     * })
    **/
    count<T extends L1StructureCountArgs>(
      args?: Subset<T, L1StructureCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], L1StructureCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a L1Structure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1StructureAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends L1StructureAggregateArgs>(args: Subset<T, L1StructureAggregateArgs>): Prisma.PrismaPromise<GetL1StructureAggregateType<T>>

    /**
     * Group by L1Structure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1StructureGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends L1StructureGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: L1StructureGroupByArgs['orderBy'] }
        : { orderBy?: L1StructureGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, L1StructureGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetL1StructureGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the L1Structure model
   */
  readonly fields: L1StructureFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for L1Structure.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__L1StructureClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l2Structures<T extends L1Structure$l2StructuresArgs<ExtArgs> = {}>(args?: Subset<T, L1Structure$l2StructuresArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    l1Functions<T extends L1Structure$l1FunctionsArgs<ExtArgs> = {}>(args?: Subset<T, L1Structure$l1FunctionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the L1Structure model
   */
  interface L1StructureFieldRefs {
    readonly id: FieldRef<"L1Structure", 'String'>
    readonly fmeaId: FieldRef<"L1Structure", 'String'>
    readonly name: FieldRef<"L1Structure", 'String'>
    readonly confirmed: FieldRef<"L1Structure", 'Boolean'>
    readonly createdAt: FieldRef<"L1Structure", 'DateTime'>
    readonly updatedAt: FieldRef<"L1Structure", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * L1Structure findUnique
   */
  export type L1StructureFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * Filter, which L1Structure to fetch.
     */
    where: L1StructureWhereUniqueInput
  }

  /**
   * L1Structure findUniqueOrThrow
   */
  export type L1StructureFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * Filter, which L1Structure to fetch.
     */
    where: L1StructureWhereUniqueInput
  }

  /**
   * L1Structure findFirst
   */
  export type L1StructureFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * Filter, which L1Structure to fetch.
     */
    where?: L1StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Structures to fetch.
     */
    orderBy?: L1StructureOrderByWithRelationInput | L1StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L1Structures.
     */
    cursor?: L1StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L1Structures.
     */
    distinct?: L1StructureScalarFieldEnum | L1StructureScalarFieldEnum[]
  }

  /**
   * L1Structure findFirstOrThrow
   */
  export type L1StructureFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * Filter, which L1Structure to fetch.
     */
    where?: L1StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Structures to fetch.
     */
    orderBy?: L1StructureOrderByWithRelationInput | L1StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L1Structures.
     */
    cursor?: L1StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L1Structures.
     */
    distinct?: L1StructureScalarFieldEnum | L1StructureScalarFieldEnum[]
  }

  /**
   * L1Structure findMany
   */
  export type L1StructureFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * Filter, which L1Structures to fetch.
     */
    where?: L1StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Structures to fetch.
     */
    orderBy?: L1StructureOrderByWithRelationInput | L1StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing L1Structures.
     */
    cursor?: L1StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Structures.
     */
    skip?: number
    distinct?: L1StructureScalarFieldEnum | L1StructureScalarFieldEnum[]
  }

  /**
   * L1Structure create
   */
  export type L1StructureCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * The data needed to create a L1Structure.
     */
    data: XOR<L1StructureCreateInput, L1StructureUncheckedCreateInput>
  }

  /**
   * L1Structure createMany
   */
  export type L1StructureCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many L1Structures.
     */
    data: L1StructureCreateManyInput | L1StructureCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * L1Structure createManyAndReturn
   */
  export type L1StructureCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * The data used to create many L1Structures.
     */
    data: L1StructureCreateManyInput | L1StructureCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * L1Structure update
   */
  export type L1StructureUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * The data needed to update a L1Structure.
     */
    data: XOR<L1StructureUpdateInput, L1StructureUncheckedUpdateInput>
    /**
     * Choose, which L1Structure to update.
     */
    where: L1StructureWhereUniqueInput
  }

  /**
   * L1Structure updateMany
   */
  export type L1StructureUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update L1Structures.
     */
    data: XOR<L1StructureUpdateManyMutationInput, L1StructureUncheckedUpdateManyInput>
    /**
     * Filter which L1Structures to update
     */
    where?: L1StructureWhereInput
    /**
     * Limit how many L1Structures to update.
     */
    limit?: number
  }

  /**
   * L1Structure updateManyAndReturn
   */
  export type L1StructureUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * The data used to update L1Structures.
     */
    data: XOR<L1StructureUpdateManyMutationInput, L1StructureUncheckedUpdateManyInput>
    /**
     * Filter which L1Structures to update
     */
    where?: L1StructureWhereInput
    /**
     * Limit how many L1Structures to update.
     */
    limit?: number
  }

  /**
   * L1Structure upsert
   */
  export type L1StructureUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * The filter to search for the L1Structure to update in case it exists.
     */
    where: L1StructureWhereUniqueInput
    /**
     * In case the L1Structure found by the `where` argument doesn't exist, create a new L1Structure with this data.
     */
    create: XOR<L1StructureCreateInput, L1StructureUncheckedCreateInput>
    /**
     * In case the L1Structure was found with the provided `where` argument, update it with this data.
     */
    update: XOR<L1StructureUpdateInput, L1StructureUncheckedUpdateInput>
  }

  /**
   * L1Structure delete
   */
  export type L1StructureDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
    /**
     * Filter which L1Structure to delete.
     */
    where: L1StructureWhereUniqueInput
  }

  /**
   * L1Structure deleteMany
   */
  export type L1StructureDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L1Structures to delete
     */
    where?: L1StructureWhereInput
    /**
     * Limit how many L1Structures to delete.
     */
    limit?: number
  }

  /**
   * L1Structure.l2Structures
   */
  export type L1Structure$l2StructuresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    where?: L2StructureWhereInput
    orderBy?: L2StructureOrderByWithRelationInput | L2StructureOrderByWithRelationInput[]
    cursor?: L2StructureWhereUniqueInput
    take?: number
    skip?: number
    distinct?: L2StructureScalarFieldEnum | L2StructureScalarFieldEnum[]
  }

  /**
   * L1Structure.l1Functions
   */
  export type L1Structure$l1FunctionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    where?: L1FunctionWhereInput
    orderBy?: L1FunctionOrderByWithRelationInput | L1FunctionOrderByWithRelationInput[]
    cursor?: L1FunctionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: L1FunctionScalarFieldEnum | L1FunctionScalarFieldEnum[]
  }

  /**
   * L1Structure without action
   */
  export type L1StructureDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Structure
     */
    select?: L1StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Structure
     */
    omit?: L1StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1StructureInclude<ExtArgs> | null
  }


  /**
   * Model L2Structure
   */

  export type AggregateL2Structure = {
    _count: L2StructureCountAggregateOutputType | null
    _avg: L2StructureAvgAggregateOutputType | null
    _sum: L2StructureSumAggregateOutputType | null
    _min: L2StructureMinAggregateOutputType | null
    _max: L2StructureMaxAggregateOutputType | null
  }

  export type L2StructureAvgAggregateOutputType = {
    order: number | null
  }

  export type L2StructureSumAggregateOutputType = {
    order: number | null
  }

  export type L2StructureMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1Id: string | null
    no: string | null
    name: string | null
    order: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L2StructureMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1Id: string | null
    no: string | null
    name: string | null
    order: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L2StructureCountAggregateOutputType = {
    id: number
    fmeaId: number
    l1Id: number
    no: number
    name: number
    order: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type L2StructureAvgAggregateInputType = {
    order?: true
  }

  export type L2StructureSumAggregateInputType = {
    order?: true
  }

  export type L2StructureMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l1Id?: true
    no?: true
    name?: true
    order?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L2StructureMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l1Id?: true
    no?: true
    name?: true
    order?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L2StructureCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l1Id?: true
    no?: true
    name?: true
    order?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type L2StructureAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L2Structure to aggregate.
     */
    where?: L2StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Structures to fetch.
     */
    orderBy?: L2StructureOrderByWithRelationInput | L2StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: L2StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned L2Structures
    **/
    _count?: true | L2StructureCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: L2StructureAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: L2StructureSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: L2StructureMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: L2StructureMaxAggregateInputType
  }

  export type GetL2StructureAggregateType<T extends L2StructureAggregateArgs> = {
        [P in keyof T & keyof AggregateL2Structure]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateL2Structure[P]>
      : GetScalarType<T[P], AggregateL2Structure[P]>
  }




  export type L2StructureGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L2StructureWhereInput
    orderBy?: L2StructureOrderByWithAggregationInput | L2StructureOrderByWithAggregationInput[]
    by: L2StructureScalarFieldEnum[] | L2StructureScalarFieldEnum
    having?: L2StructureScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: L2StructureCountAggregateInputType | true
    _avg?: L2StructureAvgAggregateInputType
    _sum?: L2StructureSumAggregateInputType
    _min?: L2StructureMinAggregateInputType
    _max?: L2StructureMaxAggregateInputType
  }

  export type L2StructureGroupByOutputType = {
    id: string
    fmeaId: string
    l1Id: string
    no: string
    name: string
    order: number
    createdAt: Date
    updatedAt: Date
    _count: L2StructureCountAggregateOutputType | null
    _avg: L2StructureAvgAggregateOutputType | null
    _sum: L2StructureSumAggregateOutputType | null
    _min: L2StructureMinAggregateOutputType | null
    _max: L2StructureMaxAggregateOutputType | null
  }

  type GetL2StructureGroupByPayload<T extends L2StructureGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<L2StructureGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof L2StructureGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], L2StructureGroupByOutputType[P]>
            : GetScalarType<T[P], L2StructureGroupByOutputType[P]>
        }
      >
    >


  export type L2StructureSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    no?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
    l3Structures?: boolean | L2Structure$l3StructuresArgs<ExtArgs>
    l2Functions?: boolean | L2Structure$l2FunctionsArgs<ExtArgs>
    failureModes?: boolean | L2Structure$failureModesArgs<ExtArgs>
    _count?: boolean | L2StructureCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l2Structure"]>

  export type L2StructureSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    no?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l2Structure"]>

  export type L2StructureSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    no?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l2Structure"]>

  export type L2StructureSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    no?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type L2StructureOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l1Id" | "no" | "name" | "order" | "createdAt" | "updatedAt", ExtArgs["result"]["l2Structure"]>
  export type L2StructureInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
    l3Structures?: boolean | L2Structure$l3StructuresArgs<ExtArgs>
    l2Functions?: boolean | L2Structure$l2FunctionsArgs<ExtArgs>
    failureModes?: boolean | L2Structure$failureModesArgs<ExtArgs>
    _count?: boolean | L2StructureCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type L2StructureIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }
  export type L2StructureIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }

  export type $L2StructurePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "L2Structure"
    objects: {
      l1Structure: Prisma.$L1StructurePayload<ExtArgs>
      l3Structures: Prisma.$L3StructurePayload<ExtArgs>[]
      l2Functions: Prisma.$L2FunctionPayload<ExtArgs>[]
      failureModes: Prisma.$FailureModePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l1Id: string
      no: string
      name: string
      order: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["l2Structure"]>
    composites: {}
  }

  type L2StructureGetPayload<S extends boolean | null | undefined | L2StructureDefaultArgs> = $Result.GetResult<Prisma.$L2StructurePayload, S>

  type L2StructureCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<L2StructureFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: L2StructureCountAggregateInputType | true
    }

  export interface L2StructureDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['L2Structure'], meta: { name: 'L2Structure' } }
    /**
     * Find zero or one L2Structure that matches the filter.
     * @param {L2StructureFindUniqueArgs} args - Arguments to find a L2Structure
     * @example
     * // Get one L2Structure
     * const l2Structure = await prisma.l2Structure.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends L2StructureFindUniqueArgs>(args: SelectSubset<T, L2StructureFindUniqueArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one L2Structure that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {L2StructureFindUniqueOrThrowArgs} args - Arguments to find a L2Structure
     * @example
     * // Get one L2Structure
     * const l2Structure = await prisma.l2Structure.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends L2StructureFindUniqueOrThrowArgs>(args: SelectSubset<T, L2StructureFindUniqueOrThrowArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L2Structure that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2StructureFindFirstArgs} args - Arguments to find a L2Structure
     * @example
     * // Get one L2Structure
     * const l2Structure = await prisma.l2Structure.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends L2StructureFindFirstArgs>(args?: SelectSubset<T, L2StructureFindFirstArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L2Structure that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2StructureFindFirstOrThrowArgs} args - Arguments to find a L2Structure
     * @example
     * // Get one L2Structure
     * const l2Structure = await prisma.l2Structure.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends L2StructureFindFirstOrThrowArgs>(args?: SelectSubset<T, L2StructureFindFirstOrThrowArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more L2Structures that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2StructureFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all L2Structures
     * const l2Structures = await prisma.l2Structure.findMany()
     * 
     * // Get first 10 L2Structures
     * const l2Structures = await prisma.l2Structure.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const l2StructureWithIdOnly = await prisma.l2Structure.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends L2StructureFindManyArgs>(args?: SelectSubset<T, L2StructureFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a L2Structure.
     * @param {L2StructureCreateArgs} args - Arguments to create a L2Structure.
     * @example
     * // Create one L2Structure
     * const L2Structure = await prisma.l2Structure.create({
     *   data: {
     *     // ... data to create a L2Structure
     *   }
     * })
     * 
     */
    create<T extends L2StructureCreateArgs>(args: SelectSubset<T, L2StructureCreateArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many L2Structures.
     * @param {L2StructureCreateManyArgs} args - Arguments to create many L2Structures.
     * @example
     * // Create many L2Structures
     * const l2Structure = await prisma.l2Structure.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends L2StructureCreateManyArgs>(args?: SelectSubset<T, L2StructureCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many L2Structures and returns the data saved in the database.
     * @param {L2StructureCreateManyAndReturnArgs} args - Arguments to create many L2Structures.
     * @example
     * // Create many L2Structures
     * const l2Structure = await prisma.l2Structure.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many L2Structures and only return the `id`
     * const l2StructureWithIdOnly = await prisma.l2Structure.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends L2StructureCreateManyAndReturnArgs>(args?: SelectSubset<T, L2StructureCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a L2Structure.
     * @param {L2StructureDeleteArgs} args - Arguments to delete one L2Structure.
     * @example
     * // Delete one L2Structure
     * const L2Structure = await prisma.l2Structure.delete({
     *   where: {
     *     // ... filter to delete one L2Structure
     *   }
     * })
     * 
     */
    delete<T extends L2StructureDeleteArgs>(args: SelectSubset<T, L2StructureDeleteArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one L2Structure.
     * @param {L2StructureUpdateArgs} args - Arguments to update one L2Structure.
     * @example
     * // Update one L2Structure
     * const l2Structure = await prisma.l2Structure.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends L2StructureUpdateArgs>(args: SelectSubset<T, L2StructureUpdateArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more L2Structures.
     * @param {L2StructureDeleteManyArgs} args - Arguments to filter L2Structures to delete.
     * @example
     * // Delete a few L2Structures
     * const { count } = await prisma.l2Structure.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends L2StructureDeleteManyArgs>(args?: SelectSubset<T, L2StructureDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L2Structures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2StructureUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many L2Structures
     * const l2Structure = await prisma.l2Structure.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends L2StructureUpdateManyArgs>(args: SelectSubset<T, L2StructureUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L2Structures and returns the data updated in the database.
     * @param {L2StructureUpdateManyAndReturnArgs} args - Arguments to update many L2Structures.
     * @example
     * // Update many L2Structures
     * const l2Structure = await prisma.l2Structure.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more L2Structures and only return the `id`
     * const l2StructureWithIdOnly = await prisma.l2Structure.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends L2StructureUpdateManyAndReturnArgs>(args: SelectSubset<T, L2StructureUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one L2Structure.
     * @param {L2StructureUpsertArgs} args - Arguments to update or create a L2Structure.
     * @example
     * // Update or create a L2Structure
     * const l2Structure = await prisma.l2Structure.upsert({
     *   create: {
     *     // ... data to create a L2Structure
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the L2Structure we want to update
     *   }
     * })
     */
    upsert<T extends L2StructureUpsertArgs>(args: SelectSubset<T, L2StructureUpsertArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of L2Structures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2StructureCountArgs} args - Arguments to filter L2Structures to count.
     * @example
     * // Count the number of L2Structures
     * const count = await prisma.l2Structure.count({
     *   where: {
     *     // ... the filter for the L2Structures we want to count
     *   }
     * })
    **/
    count<T extends L2StructureCountArgs>(
      args?: Subset<T, L2StructureCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], L2StructureCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a L2Structure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2StructureAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends L2StructureAggregateArgs>(args: Subset<T, L2StructureAggregateArgs>): Prisma.PrismaPromise<GetL2StructureAggregateType<T>>

    /**
     * Group by L2Structure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2StructureGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends L2StructureGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: L2StructureGroupByArgs['orderBy'] }
        : { orderBy?: L2StructureGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, L2StructureGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetL2StructureGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the L2Structure model
   */
  readonly fields: L2StructureFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for L2Structure.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__L2StructureClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l1Structure<T extends L1StructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L1StructureDefaultArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    l3Structures<T extends L2Structure$l3StructuresArgs<ExtArgs> = {}>(args?: Subset<T, L2Structure$l3StructuresArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    l2Functions<T extends L2Structure$l2FunctionsArgs<ExtArgs> = {}>(args?: Subset<T, L2Structure$l2FunctionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    failureModes<T extends L2Structure$failureModesArgs<ExtArgs> = {}>(args?: Subset<T, L2Structure$failureModesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the L2Structure model
   */
  interface L2StructureFieldRefs {
    readonly id: FieldRef<"L2Structure", 'String'>
    readonly fmeaId: FieldRef<"L2Structure", 'String'>
    readonly l1Id: FieldRef<"L2Structure", 'String'>
    readonly no: FieldRef<"L2Structure", 'String'>
    readonly name: FieldRef<"L2Structure", 'String'>
    readonly order: FieldRef<"L2Structure", 'Int'>
    readonly createdAt: FieldRef<"L2Structure", 'DateTime'>
    readonly updatedAt: FieldRef<"L2Structure", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * L2Structure findUnique
   */
  export type L2StructureFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * Filter, which L2Structure to fetch.
     */
    where: L2StructureWhereUniqueInput
  }

  /**
   * L2Structure findUniqueOrThrow
   */
  export type L2StructureFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * Filter, which L2Structure to fetch.
     */
    where: L2StructureWhereUniqueInput
  }

  /**
   * L2Structure findFirst
   */
  export type L2StructureFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * Filter, which L2Structure to fetch.
     */
    where?: L2StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Structures to fetch.
     */
    orderBy?: L2StructureOrderByWithRelationInput | L2StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L2Structures.
     */
    cursor?: L2StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L2Structures.
     */
    distinct?: L2StructureScalarFieldEnum | L2StructureScalarFieldEnum[]
  }

  /**
   * L2Structure findFirstOrThrow
   */
  export type L2StructureFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * Filter, which L2Structure to fetch.
     */
    where?: L2StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Structures to fetch.
     */
    orderBy?: L2StructureOrderByWithRelationInput | L2StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L2Structures.
     */
    cursor?: L2StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L2Structures.
     */
    distinct?: L2StructureScalarFieldEnum | L2StructureScalarFieldEnum[]
  }

  /**
   * L2Structure findMany
   */
  export type L2StructureFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * Filter, which L2Structures to fetch.
     */
    where?: L2StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Structures to fetch.
     */
    orderBy?: L2StructureOrderByWithRelationInput | L2StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing L2Structures.
     */
    cursor?: L2StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Structures.
     */
    skip?: number
    distinct?: L2StructureScalarFieldEnum | L2StructureScalarFieldEnum[]
  }

  /**
   * L2Structure create
   */
  export type L2StructureCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * The data needed to create a L2Structure.
     */
    data: XOR<L2StructureCreateInput, L2StructureUncheckedCreateInput>
  }

  /**
   * L2Structure createMany
   */
  export type L2StructureCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many L2Structures.
     */
    data: L2StructureCreateManyInput | L2StructureCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * L2Structure createManyAndReturn
   */
  export type L2StructureCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * The data used to create many L2Structures.
     */
    data: L2StructureCreateManyInput | L2StructureCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * L2Structure update
   */
  export type L2StructureUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * The data needed to update a L2Structure.
     */
    data: XOR<L2StructureUpdateInput, L2StructureUncheckedUpdateInput>
    /**
     * Choose, which L2Structure to update.
     */
    where: L2StructureWhereUniqueInput
  }

  /**
   * L2Structure updateMany
   */
  export type L2StructureUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update L2Structures.
     */
    data: XOR<L2StructureUpdateManyMutationInput, L2StructureUncheckedUpdateManyInput>
    /**
     * Filter which L2Structures to update
     */
    where?: L2StructureWhereInput
    /**
     * Limit how many L2Structures to update.
     */
    limit?: number
  }

  /**
   * L2Structure updateManyAndReturn
   */
  export type L2StructureUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * The data used to update L2Structures.
     */
    data: XOR<L2StructureUpdateManyMutationInput, L2StructureUncheckedUpdateManyInput>
    /**
     * Filter which L2Structures to update
     */
    where?: L2StructureWhereInput
    /**
     * Limit how many L2Structures to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * L2Structure upsert
   */
  export type L2StructureUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * The filter to search for the L2Structure to update in case it exists.
     */
    where: L2StructureWhereUniqueInput
    /**
     * In case the L2Structure found by the `where` argument doesn't exist, create a new L2Structure with this data.
     */
    create: XOR<L2StructureCreateInput, L2StructureUncheckedCreateInput>
    /**
     * In case the L2Structure was found with the provided `where` argument, update it with this data.
     */
    update: XOR<L2StructureUpdateInput, L2StructureUncheckedUpdateInput>
  }

  /**
   * L2Structure delete
   */
  export type L2StructureDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
    /**
     * Filter which L2Structure to delete.
     */
    where: L2StructureWhereUniqueInput
  }

  /**
   * L2Structure deleteMany
   */
  export type L2StructureDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L2Structures to delete
     */
    where?: L2StructureWhereInput
    /**
     * Limit how many L2Structures to delete.
     */
    limit?: number
  }

  /**
   * L2Structure.l3Structures
   */
  export type L2Structure$l3StructuresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    where?: L3StructureWhereInput
    orderBy?: L3StructureOrderByWithRelationInput | L3StructureOrderByWithRelationInput[]
    cursor?: L3StructureWhereUniqueInput
    take?: number
    skip?: number
    distinct?: L3StructureScalarFieldEnum | L3StructureScalarFieldEnum[]
  }

  /**
   * L2Structure.l2Functions
   */
  export type L2Structure$l2FunctionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    where?: L2FunctionWhereInput
    orderBy?: L2FunctionOrderByWithRelationInput | L2FunctionOrderByWithRelationInput[]
    cursor?: L2FunctionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: L2FunctionScalarFieldEnum | L2FunctionScalarFieldEnum[]
  }

  /**
   * L2Structure.failureModes
   */
  export type L2Structure$failureModesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    where?: FailureModeWhereInput
    orderBy?: FailureModeOrderByWithRelationInput | FailureModeOrderByWithRelationInput[]
    cursor?: FailureModeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureModeScalarFieldEnum | FailureModeScalarFieldEnum[]
  }

  /**
   * L2Structure without action
   */
  export type L2StructureDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Structure
     */
    select?: L2StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Structure
     */
    omit?: L2StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2StructureInclude<ExtArgs> | null
  }


  /**
   * Model L3Structure
   */

  export type AggregateL3Structure = {
    _count: L3StructureCountAggregateOutputType | null
    _avg: L3StructureAvgAggregateOutputType | null
    _sum: L3StructureSumAggregateOutputType | null
    _min: L3StructureMinAggregateOutputType | null
    _max: L3StructureMaxAggregateOutputType | null
  }

  export type L3StructureAvgAggregateOutputType = {
    order: number | null
  }

  export type L3StructureSumAggregateOutputType = {
    order: number | null
  }

  export type L3StructureMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1Id: string | null
    l2Id: string | null
    m4: string | null
    name: string | null
    order: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L3StructureMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1Id: string | null
    l2Id: string | null
    m4: string | null
    name: string | null
    order: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L3StructureCountAggregateOutputType = {
    id: number
    fmeaId: number
    l1Id: number
    l2Id: number
    m4: number
    name: number
    order: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type L3StructureAvgAggregateInputType = {
    order?: true
  }

  export type L3StructureSumAggregateInputType = {
    order?: true
  }

  export type L3StructureMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l1Id?: true
    l2Id?: true
    m4?: true
    name?: true
    order?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L3StructureMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l1Id?: true
    l2Id?: true
    m4?: true
    name?: true
    order?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L3StructureCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l1Id?: true
    l2Id?: true
    m4?: true
    name?: true
    order?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type L3StructureAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L3Structure to aggregate.
     */
    where?: L3StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Structures to fetch.
     */
    orderBy?: L3StructureOrderByWithRelationInput | L3StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: L3StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned L3Structures
    **/
    _count?: true | L3StructureCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: L3StructureAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: L3StructureSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: L3StructureMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: L3StructureMaxAggregateInputType
  }

  export type GetL3StructureAggregateType<T extends L3StructureAggregateArgs> = {
        [P in keyof T & keyof AggregateL3Structure]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateL3Structure[P]>
      : GetScalarType<T[P], AggregateL3Structure[P]>
  }




  export type L3StructureGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L3StructureWhereInput
    orderBy?: L3StructureOrderByWithAggregationInput | L3StructureOrderByWithAggregationInput[]
    by: L3StructureScalarFieldEnum[] | L3StructureScalarFieldEnum
    having?: L3StructureScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: L3StructureCountAggregateInputType | true
    _avg?: L3StructureAvgAggregateInputType
    _sum?: L3StructureSumAggregateInputType
    _min?: L3StructureMinAggregateInputType
    _max?: L3StructureMaxAggregateInputType
  }

  export type L3StructureGroupByOutputType = {
    id: string
    fmeaId: string
    l1Id: string
    l2Id: string
    m4: string | null
    name: string
    order: number
    createdAt: Date
    updatedAt: Date
    _count: L3StructureCountAggregateOutputType | null
    _avg: L3StructureAvgAggregateOutputType | null
    _sum: L3StructureSumAggregateOutputType | null
    _min: L3StructureMinAggregateOutputType | null
    _max: L3StructureMaxAggregateOutputType | null
  }

  type GetL3StructureGroupByPayload<T extends L3StructureGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<L3StructureGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof L3StructureGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], L3StructureGroupByOutputType[P]>
            : GetScalarType<T[P], L3StructureGroupByOutputType[P]>
        }
      >
    >


  export type L3StructureSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    l2Id?: boolean
    m4?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
    l3Functions?: boolean | L3Structure$l3FunctionsArgs<ExtArgs>
    failureCauses?: boolean | L3Structure$failureCausesArgs<ExtArgs>
    _count?: boolean | L3StructureCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l3Structure"]>

  export type L3StructureSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    l2Id?: boolean
    m4?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l3Structure"]>

  export type L3StructureSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    l2Id?: boolean
    m4?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l3Structure"]>

  export type L3StructureSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l1Id?: boolean
    l2Id?: boolean
    m4?: boolean
    name?: boolean
    order?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type L3StructureOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l1Id" | "l2Id" | "m4" | "name" | "order" | "createdAt" | "updatedAt", ExtArgs["result"]["l3Structure"]>
  export type L3StructureInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
    l3Functions?: boolean | L3Structure$l3FunctionsArgs<ExtArgs>
    failureCauses?: boolean | L3Structure$failureCausesArgs<ExtArgs>
    _count?: boolean | L3StructureCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type L3StructureIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }
  export type L3StructureIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }

  export type $L3StructurePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "L3Structure"
    objects: {
      l2Structure: Prisma.$L2StructurePayload<ExtArgs>
      l3Functions: Prisma.$L3FunctionPayload<ExtArgs>[]
      failureCauses: Prisma.$FailureCausePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l1Id: string
      l2Id: string
      m4: string | null
      name: string
      order: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["l3Structure"]>
    composites: {}
  }

  type L3StructureGetPayload<S extends boolean | null | undefined | L3StructureDefaultArgs> = $Result.GetResult<Prisma.$L3StructurePayload, S>

  type L3StructureCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<L3StructureFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: L3StructureCountAggregateInputType | true
    }

  export interface L3StructureDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['L3Structure'], meta: { name: 'L3Structure' } }
    /**
     * Find zero or one L3Structure that matches the filter.
     * @param {L3StructureFindUniqueArgs} args - Arguments to find a L3Structure
     * @example
     * // Get one L3Structure
     * const l3Structure = await prisma.l3Structure.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends L3StructureFindUniqueArgs>(args: SelectSubset<T, L3StructureFindUniqueArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one L3Structure that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {L3StructureFindUniqueOrThrowArgs} args - Arguments to find a L3Structure
     * @example
     * // Get one L3Structure
     * const l3Structure = await prisma.l3Structure.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends L3StructureFindUniqueOrThrowArgs>(args: SelectSubset<T, L3StructureFindUniqueOrThrowArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L3Structure that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3StructureFindFirstArgs} args - Arguments to find a L3Structure
     * @example
     * // Get one L3Structure
     * const l3Structure = await prisma.l3Structure.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends L3StructureFindFirstArgs>(args?: SelectSubset<T, L3StructureFindFirstArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L3Structure that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3StructureFindFirstOrThrowArgs} args - Arguments to find a L3Structure
     * @example
     * // Get one L3Structure
     * const l3Structure = await prisma.l3Structure.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends L3StructureFindFirstOrThrowArgs>(args?: SelectSubset<T, L3StructureFindFirstOrThrowArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more L3Structures that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3StructureFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all L3Structures
     * const l3Structures = await prisma.l3Structure.findMany()
     * 
     * // Get first 10 L3Structures
     * const l3Structures = await prisma.l3Structure.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const l3StructureWithIdOnly = await prisma.l3Structure.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends L3StructureFindManyArgs>(args?: SelectSubset<T, L3StructureFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a L3Structure.
     * @param {L3StructureCreateArgs} args - Arguments to create a L3Structure.
     * @example
     * // Create one L3Structure
     * const L3Structure = await prisma.l3Structure.create({
     *   data: {
     *     // ... data to create a L3Structure
     *   }
     * })
     * 
     */
    create<T extends L3StructureCreateArgs>(args: SelectSubset<T, L3StructureCreateArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many L3Structures.
     * @param {L3StructureCreateManyArgs} args - Arguments to create many L3Structures.
     * @example
     * // Create many L3Structures
     * const l3Structure = await prisma.l3Structure.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends L3StructureCreateManyArgs>(args?: SelectSubset<T, L3StructureCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many L3Structures and returns the data saved in the database.
     * @param {L3StructureCreateManyAndReturnArgs} args - Arguments to create many L3Structures.
     * @example
     * // Create many L3Structures
     * const l3Structure = await prisma.l3Structure.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many L3Structures and only return the `id`
     * const l3StructureWithIdOnly = await prisma.l3Structure.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends L3StructureCreateManyAndReturnArgs>(args?: SelectSubset<T, L3StructureCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a L3Structure.
     * @param {L3StructureDeleteArgs} args - Arguments to delete one L3Structure.
     * @example
     * // Delete one L3Structure
     * const L3Structure = await prisma.l3Structure.delete({
     *   where: {
     *     // ... filter to delete one L3Structure
     *   }
     * })
     * 
     */
    delete<T extends L3StructureDeleteArgs>(args: SelectSubset<T, L3StructureDeleteArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one L3Structure.
     * @param {L3StructureUpdateArgs} args - Arguments to update one L3Structure.
     * @example
     * // Update one L3Structure
     * const l3Structure = await prisma.l3Structure.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends L3StructureUpdateArgs>(args: SelectSubset<T, L3StructureUpdateArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more L3Structures.
     * @param {L3StructureDeleteManyArgs} args - Arguments to filter L3Structures to delete.
     * @example
     * // Delete a few L3Structures
     * const { count } = await prisma.l3Structure.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends L3StructureDeleteManyArgs>(args?: SelectSubset<T, L3StructureDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L3Structures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3StructureUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many L3Structures
     * const l3Structure = await prisma.l3Structure.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends L3StructureUpdateManyArgs>(args: SelectSubset<T, L3StructureUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L3Structures and returns the data updated in the database.
     * @param {L3StructureUpdateManyAndReturnArgs} args - Arguments to update many L3Structures.
     * @example
     * // Update many L3Structures
     * const l3Structure = await prisma.l3Structure.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more L3Structures and only return the `id`
     * const l3StructureWithIdOnly = await prisma.l3Structure.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends L3StructureUpdateManyAndReturnArgs>(args: SelectSubset<T, L3StructureUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one L3Structure.
     * @param {L3StructureUpsertArgs} args - Arguments to update or create a L3Structure.
     * @example
     * // Update or create a L3Structure
     * const l3Structure = await prisma.l3Structure.upsert({
     *   create: {
     *     // ... data to create a L3Structure
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the L3Structure we want to update
     *   }
     * })
     */
    upsert<T extends L3StructureUpsertArgs>(args: SelectSubset<T, L3StructureUpsertArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of L3Structures.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3StructureCountArgs} args - Arguments to filter L3Structures to count.
     * @example
     * // Count the number of L3Structures
     * const count = await prisma.l3Structure.count({
     *   where: {
     *     // ... the filter for the L3Structures we want to count
     *   }
     * })
    **/
    count<T extends L3StructureCountArgs>(
      args?: Subset<T, L3StructureCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], L3StructureCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a L3Structure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3StructureAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends L3StructureAggregateArgs>(args: Subset<T, L3StructureAggregateArgs>): Prisma.PrismaPromise<GetL3StructureAggregateType<T>>

    /**
     * Group by L3Structure.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3StructureGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends L3StructureGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: L3StructureGroupByArgs['orderBy'] }
        : { orderBy?: L3StructureGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, L3StructureGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetL3StructureGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the L3Structure model
   */
  readonly fields: L3StructureFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for L3Structure.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__L3StructureClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l2Structure<T extends L2StructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L2StructureDefaultArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    l3Functions<T extends L3Structure$l3FunctionsArgs<ExtArgs> = {}>(args?: Subset<T, L3Structure$l3FunctionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    failureCauses<T extends L3Structure$failureCausesArgs<ExtArgs> = {}>(args?: Subset<T, L3Structure$failureCausesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the L3Structure model
   */
  interface L3StructureFieldRefs {
    readonly id: FieldRef<"L3Structure", 'String'>
    readonly fmeaId: FieldRef<"L3Structure", 'String'>
    readonly l1Id: FieldRef<"L3Structure", 'String'>
    readonly l2Id: FieldRef<"L3Structure", 'String'>
    readonly m4: FieldRef<"L3Structure", 'String'>
    readonly name: FieldRef<"L3Structure", 'String'>
    readonly order: FieldRef<"L3Structure", 'Int'>
    readonly createdAt: FieldRef<"L3Structure", 'DateTime'>
    readonly updatedAt: FieldRef<"L3Structure", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * L3Structure findUnique
   */
  export type L3StructureFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * Filter, which L3Structure to fetch.
     */
    where: L3StructureWhereUniqueInput
  }

  /**
   * L3Structure findUniqueOrThrow
   */
  export type L3StructureFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * Filter, which L3Structure to fetch.
     */
    where: L3StructureWhereUniqueInput
  }

  /**
   * L3Structure findFirst
   */
  export type L3StructureFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * Filter, which L3Structure to fetch.
     */
    where?: L3StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Structures to fetch.
     */
    orderBy?: L3StructureOrderByWithRelationInput | L3StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L3Structures.
     */
    cursor?: L3StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L3Structures.
     */
    distinct?: L3StructureScalarFieldEnum | L3StructureScalarFieldEnum[]
  }

  /**
   * L3Structure findFirstOrThrow
   */
  export type L3StructureFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * Filter, which L3Structure to fetch.
     */
    where?: L3StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Structures to fetch.
     */
    orderBy?: L3StructureOrderByWithRelationInput | L3StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L3Structures.
     */
    cursor?: L3StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Structures.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L3Structures.
     */
    distinct?: L3StructureScalarFieldEnum | L3StructureScalarFieldEnum[]
  }

  /**
   * L3Structure findMany
   */
  export type L3StructureFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * Filter, which L3Structures to fetch.
     */
    where?: L3StructureWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Structures to fetch.
     */
    orderBy?: L3StructureOrderByWithRelationInput | L3StructureOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing L3Structures.
     */
    cursor?: L3StructureWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Structures from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Structures.
     */
    skip?: number
    distinct?: L3StructureScalarFieldEnum | L3StructureScalarFieldEnum[]
  }

  /**
   * L3Structure create
   */
  export type L3StructureCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * The data needed to create a L3Structure.
     */
    data: XOR<L3StructureCreateInput, L3StructureUncheckedCreateInput>
  }

  /**
   * L3Structure createMany
   */
  export type L3StructureCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many L3Structures.
     */
    data: L3StructureCreateManyInput | L3StructureCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * L3Structure createManyAndReturn
   */
  export type L3StructureCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * The data used to create many L3Structures.
     */
    data: L3StructureCreateManyInput | L3StructureCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * L3Structure update
   */
  export type L3StructureUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * The data needed to update a L3Structure.
     */
    data: XOR<L3StructureUpdateInput, L3StructureUncheckedUpdateInput>
    /**
     * Choose, which L3Structure to update.
     */
    where: L3StructureWhereUniqueInput
  }

  /**
   * L3Structure updateMany
   */
  export type L3StructureUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update L3Structures.
     */
    data: XOR<L3StructureUpdateManyMutationInput, L3StructureUncheckedUpdateManyInput>
    /**
     * Filter which L3Structures to update
     */
    where?: L3StructureWhereInput
    /**
     * Limit how many L3Structures to update.
     */
    limit?: number
  }

  /**
   * L3Structure updateManyAndReturn
   */
  export type L3StructureUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * The data used to update L3Structures.
     */
    data: XOR<L3StructureUpdateManyMutationInput, L3StructureUncheckedUpdateManyInput>
    /**
     * Filter which L3Structures to update
     */
    where?: L3StructureWhereInput
    /**
     * Limit how many L3Structures to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * L3Structure upsert
   */
  export type L3StructureUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * The filter to search for the L3Structure to update in case it exists.
     */
    where: L3StructureWhereUniqueInput
    /**
     * In case the L3Structure found by the `where` argument doesn't exist, create a new L3Structure with this data.
     */
    create: XOR<L3StructureCreateInput, L3StructureUncheckedCreateInput>
    /**
     * In case the L3Structure was found with the provided `where` argument, update it with this data.
     */
    update: XOR<L3StructureUpdateInput, L3StructureUncheckedUpdateInput>
  }

  /**
   * L3Structure delete
   */
  export type L3StructureDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
    /**
     * Filter which L3Structure to delete.
     */
    where: L3StructureWhereUniqueInput
  }

  /**
   * L3Structure deleteMany
   */
  export type L3StructureDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L3Structures to delete
     */
    where?: L3StructureWhereInput
    /**
     * Limit how many L3Structures to delete.
     */
    limit?: number
  }

  /**
   * L3Structure.l3Functions
   */
  export type L3Structure$l3FunctionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    where?: L3FunctionWhereInput
    orderBy?: L3FunctionOrderByWithRelationInput | L3FunctionOrderByWithRelationInput[]
    cursor?: L3FunctionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: L3FunctionScalarFieldEnum | L3FunctionScalarFieldEnum[]
  }

  /**
   * L3Structure.failureCauses
   */
  export type L3Structure$failureCausesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    where?: FailureCauseWhereInput
    orderBy?: FailureCauseOrderByWithRelationInput | FailureCauseOrderByWithRelationInput[]
    cursor?: FailureCauseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureCauseScalarFieldEnum | FailureCauseScalarFieldEnum[]
  }

  /**
   * L3Structure without action
   */
  export type L3StructureDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Structure
     */
    select?: L3StructureSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Structure
     */
    omit?: L3StructureOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3StructureInclude<ExtArgs> | null
  }


  /**
   * Model L1Function
   */

  export type AggregateL1Function = {
    _count: L1FunctionCountAggregateOutputType | null
    _min: L1FunctionMinAggregateOutputType | null
    _max: L1FunctionMaxAggregateOutputType | null
  }

  export type L1FunctionMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1StructId: string | null
    category: string | null
    functionName: string | null
    requirement: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L1FunctionMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1StructId: string | null
    category: string | null
    functionName: string | null
    requirement: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L1FunctionCountAggregateOutputType = {
    id: number
    fmeaId: number
    l1StructId: number
    category: number
    functionName: number
    requirement: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type L1FunctionMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l1StructId?: true
    category?: true
    functionName?: true
    requirement?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L1FunctionMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l1StructId?: true
    category?: true
    functionName?: true
    requirement?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L1FunctionCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l1StructId?: true
    category?: true
    functionName?: true
    requirement?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type L1FunctionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L1Function to aggregate.
     */
    where?: L1FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Functions to fetch.
     */
    orderBy?: L1FunctionOrderByWithRelationInput | L1FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: L1FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned L1Functions
    **/
    _count?: true | L1FunctionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: L1FunctionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: L1FunctionMaxAggregateInputType
  }

  export type GetL1FunctionAggregateType<T extends L1FunctionAggregateArgs> = {
        [P in keyof T & keyof AggregateL1Function]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateL1Function[P]>
      : GetScalarType<T[P], AggregateL1Function[P]>
  }




  export type L1FunctionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L1FunctionWhereInput
    orderBy?: L1FunctionOrderByWithAggregationInput | L1FunctionOrderByWithAggregationInput[]
    by: L1FunctionScalarFieldEnum[] | L1FunctionScalarFieldEnum
    having?: L1FunctionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: L1FunctionCountAggregateInputType | true
    _min?: L1FunctionMinAggregateInputType
    _max?: L1FunctionMaxAggregateInputType
  }

  export type L1FunctionGroupByOutputType = {
    id: string
    fmeaId: string
    l1StructId: string
    category: string
    functionName: string
    requirement: string
    createdAt: Date
    updatedAt: Date
    _count: L1FunctionCountAggregateOutputType | null
    _min: L1FunctionMinAggregateOutputType | null
    _max: L1FunctionMaxAggregateOutputType | null
  }

  type GetL1FunctionGroupByPayload<T extends L1FunctionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<L1FunctionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof L1FunctionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], L1FunctionGroupByOutputType[P]>
            : GetScalarType<T[P], L1FunctionGroupByOutputType[P]>
        }
      >
    >


  export type L1FunctionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1StructId?: boolean
    category?: boolean
    functionName?: boolean
    requirement?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
    failureEffects?: boolean | L1Function$failureEffectsArgs<ExtArgs>
    _count?: boolean | L1FunctionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l1Function"]>

  export type L1FunctionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1StructId?: boolean
    category?: boolean
    functionName?: boolean
    requirement?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l1Function"]>

  export type L1FunctionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1StructId?: boolean
    category?: boolean
    functionName?: boolean
    requirement?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l1Function"]>

  export type L1FunctionSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l1StructId?: boolean
    category?: boolean
    functionName?: boolean
    requirement?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type L1FunctionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l1StructId" | "category" | "functionName" | "requirement" | "createdAt" | "updatedAt", ExtArgs["result"]["l1Function"]>
  export type L1FunctionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
    failureEffects?: boolean | L1Function$failureEffectsArgs<ExtArgs>
    _count?: boolean | L1FunctionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type L1FunctionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }
  export type L1FunctionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Structure?: boolean | L1StructureDefaultArgs<ExtArgs>
  }

  export type $L1FunctionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "L1Function"
    objects: {
      l1Structure: Prisma.$L1StructurePayload<ExtArgs>
      failureEffects: Prisma.$FailureEffectPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l1StructId: string
      category: string
      functionName: string
      requirement: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["l1Function"]>
    composites: {}
  }

  type L1FunctionGetPayload<S extends boolean | null | undefined | L1FunctionDefaultArgs> = $Result.GetResult<Prisma.$L1FunctionPayload, S>

  type L1FunctionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<L1FunctionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: L1FunctionCountAggregateInputType | true
    }

  export interface L1FunctionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['L1Function'], meta: { name: 'L1Function' } }
    /**
     * Find zero or one L1Function that matches the filter.
     * @param {L1FunctionFindUniqueArgs} args - Arguments to find a L1Function
     * @example
     * // Get one L1Function
     * const l1Function = await prisma.l1Function.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends L1FunctionFindUniqueArgs>(args: SelectSubset<T, L1FunctionFindUniqueArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one L1Function that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {L1FunctionFindUniqueOrThrowArgs} args - Arguments to find a L1Function
     * @example
     * // Get one L1Function
     * const l1Function = await prisma.l1Function.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends L1FunctionFindUniqueOrThrowArgs>(args: SelectSubset<T, L1FunctionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L1Function that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1FunctionFindFirstArgs} args - Arguments to find a L1Function
     * @example
     * // Get one L1Function
     * const l1Function = await prisma.l1Function.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends L1FunctionFindFirstArgs>(args?: SelectSubset<T, L1FunctionFindFirstArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L1Function that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1FunctionFindFirstOrThrowArgs} args - Arguments to find a L1Function
     * @example
     * // Get one L1Function
     * const l1Function = await prisma.l1Function.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends L1FunctionFindFirstOrThrowArgs>(args?: SelectSubset<T, L1FunctionFindFirstOrThrowArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more L1Functions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1FunctionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all L1Functions
     * const l1Functions = await prisma.l1Function.findMany()
     * 
     * // Get first 10 L1Functions
     * const l1Functions = await prisma.l1Function.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const l1FunctionWithIdOnly = await prisma.l1Function.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends L1FunctionFindManyArgs>(args?: SelectSubset<T, L1FunctionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a L1Function.
     * @param {L1FunctionCreateArgs} args - Arguments to create a L1Function.
     * @example
     * // Create one L1Function
     * const L1Function = await prisma.l1Function.create({
     *   data: {
     *     // ... data to create a L1Function
     *   }
     * })
     * 
     */
    create<T extends L1FunctionCreateArgs>(args: SelectSubset<T, L1FunctionCreateArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many L1Functions.
     * @param {L1FunctionCreateManyArgs} args - Arguments to create many L1Functions.
     * @example
     * // Create many L1Functions
     * const l1Function = await prisma.l1Function.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends L1FunctionCreateManyArgs>(args?: SelectSubset<T, L1FunctionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many L1Functions and returns the data saved in the database.
     * @param {L1FunctionCreateManyAndReturnArgs} args - Arguments to create many L1Functions.
     * @example
     * // Create many L1Functions
     * const l1Function = await prisma.l1Function.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many L1Functions and only return the `id`
     * const l1FunctionWithIdOnly = await prisma.l1Function.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends L1FunctionCreateManyAndReturnArgs>(args?: SelectSubset<T, L1FunctionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a L1Function.
     * @param {L1FunctionDeleteArgs} args - Arguments to delete one L1Function.
     * @example
     * // Delete one L1Function
     * const L1Function = await prisma.l1Function.delete({
     *   where: {
     *     // ... filter to delete one L1Function
     *   }
     * })
     * 
     */
    delete<T extends L1FunctionDeleteArgs>(args: SelectSubset<T, L1FunctionDeleteArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one L1Function.
     * @param {L1FunctionUpdateArgs} args - Arguments to update one L1Function.
     * @example
     * // Update one L1Function
     * const l1Function = await prisma.l1Function.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends L1FunctionUpdateArgs>(args: SelectSubset<T, L1FunctionUpdateArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more L1Functions.
     * @param {L1FunctionDeleteManyArgs} args - Arguments to filter L1Functions to delete.
     * @example
     * // Delete a few L1Functions
     * const { count } = await prisma.l1Function.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends L1FunctionDeleteManyArgs>(args?: SelectSubset<T, L1FunctionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L1Functions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1FunctionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many L1Functions
     * const l1Function = await prisma.l1Function.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends L1FunctionUpdateManyArgs>(args: SelectSubset<T, L1FunctionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L1Functions and returns the data updated in the database.
     * @param {L1FunctionUpdateManyAndReturnArgs} args - Arguments to update many L1Functions.
     * @example
     * // Update many L1Functions
     * const l1Function = await prisma.l1Function.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more L1Functions and only return the `id`
     * const l1FunctionWithIdOnly = await prisma.l1Function.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends L1FunctionUpdateManyAndReturnArgs>(args: SelectSubset<T, L1FunctionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one L1Function.
     * @param {L1FunctionUpsertArgs} args - Arguments to update or create a L1Function.
     * @example
     * // Update or create a L1Function
     * const l1Function = await prisma.l1Function.upsert({
     *   create: {
     *     // ... data to create a L1Function
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the L1Function we want to update
     *   }
     * })
     */
    upsert<T extends L1FunctionUpsertArgs>(args: SelectSubset<T, L1FunctionUpsertArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of L1Functions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1FunctionCountArgs} args - Arguments to filter L1Functions to count.
     * @example
     * // Count the number of L1Functions
     * const count = await prisma.l1Function.count({
     *   where: {
     *     // ... the filter for the L1Functions we want to count
     *   }
     * })
    **/
    count<T extends L1FunctionCountArgs>(
      args?: Subset<T, L1FunctionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], L1FunctionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a L1Function.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1FunctionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends L1FunctionAggregateArgs>(args: Subset<T, L1FunctionAggregateArgs>): Prisma.PrismaPromise<GetL1FunctionAggregateType<T>>

    /**
     * Group by L1Function.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L1FunctionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends L1FunctionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: L1FunctionGroupByArgs['orderBy'] }
        : { orderBy?: L1FunctionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, L1FunctionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetL1FunctionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the L1Function model
   */
  readonly fields: L1FunctionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for L1Function.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__L1FunctionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l1Structure<T extends L1StructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L1StructureDefaultArgs<ExtArgs>>): Prisma__L1StructureClient<$Result.GetResult<Prisma.$L1StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureEffects<T extends L1Function$failureEffectsArgs<ExtArgs> = {}>(args?: Subset<T, L1Function$failureEffectsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the L1Function model
   */
  interface L1FunctionFieldRefs {
    readonly id: FieldRef<"L1Function", 'String'>
    readonly fmeaId: FieldRef<"L1Function", 'String'>
    readonly l1StructId: FieldRef<"L1Function", 'String'>
    readonly category: FieldRef<"L1Function", 'String'>
    readonly functionName: FieldRef<"L1Function", 'String'>
    readonly requirement: FieldRef<"L1Function", 'String'>
    readonly createdAt: FieldRef<"L1Function", 'DateTime'>
    readonly updatedAt: FieldRef<"L1Function", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * L1Function findUnique
   */
  export type L1FunctionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L1Function to fetch.
     */
    where: L1FunctionWhereUniqueInput
  }

  /**
   * L1Function findUniqueOrThrow
   */
  export type L1FunctionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L1Function to fetch.
     */
    where: L1FunctionWhereUniqueInput
  }

  /**
   * L1Function findFirst
   */
  export type L1FunctionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L1Function to fetch.
     */
    where?: L1FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Functions to fetch.
     */
    orderBy?: L1FunctionOrderByWithRelationInput | L1FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L1Functions.
     */
    cursor?: L1FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L1Functions.
     */
    distinct?: L1FunctionScalarFieldEnum | L1FunctionScalarFieldEnum[]
  }

  /**
   * L1Function findFirstOrThrow
   */
  export type L1FunctionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L1Function to fetch.
     */
    where?: L1FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Functions to fetch.
     */
    orderBy?: L1FunctionOrderByWithRelationInput | L1FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L1Functions.
     */
    cursor?: L1FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L1Functions.
     */
    distinct?: L1FunctionScalarFieldEnum | L1FunctionScalarFieldEnum[]
  }

  /**
   * L1Function findMany
   */
  export type L1FunctionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L1Functions to fetch.
     */
    where?: L1FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L1Functions to fetch.
     */
    orderBy?: L1FunctionOrderByWithRelationInput | L1FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing L1Functions.
     */
    cursor?: L1FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L1Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L1Functions.
     */
    skip?: number
    distinct?: L1FunctionScalarFieldEnum | L1FunctionScalarFieldEnum[]
  }

  /**
   * L1Function create
   */
  export type L1FunctionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * The data needed to create a L1Function.
     */
    data: XOR<L1FunctionCreateInput, L1FunctionUncheckedCreateInput>
  }

  /**
   * L1Function createMany
   */
  export type L1FunctionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many L1Functions.
     */
    data: L1FunctionCreateManyInput | L1FunctionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * L1Function createManyAndReturn
   */
  export type L1FunctionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * The data used to create many L1Functions.
     */
    data: L1FunctionCreateManyInput | L1FunctionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * L1Function update
   */
  export type L1FunctionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * The data needed to update a L1Function.
     */
    data: XOR<L1FunctionUpdateInput, L1FunctionUncheckedUpdateInput>
    /**
     * Choose, which L1Function to update.
     */
    where: L1FunctionWhereUniqueInput
  }

  /**
   * L1Function updateMany
   */
  export type L1FunctionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update L1Functions.
     */
    data: XOR<L1FunctionUpdateManyMutationInput, L1FunctionUncheckedUpdateManyInput>
    /**
     * Filter which L1Functions to update
     */
    where?: L1FunctionWhereInput
    /**
     * Limit how many L1Functions to update.
     */
    limit?: number
  }

  /**
   * L1Function updateManyAndReturn
   */
  export type L1FunctionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * The data used to update L1Functions.
     */
    data: XOR<L1FunctionUpdateManyMutationInput, L1FunctionUncheckedUpdateManyInput>
    /**
     * Filter which L1Functions to update
     */
    where?: L1FunctionWhereInput
    /**
     * Limit how many L1Functions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * L1Function upsert
   */
  export type L1FunctionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * The filter to search for the L1Function to update in case it exists.
     */
    where: L1FunctionWhereUniqueInput
    /**
     * In case the L1Function found by the `where` argument doesn't exist, create a new L1Function with this data.
     */
    create: XOR<L1FunctionCreateInput, L1FunctionUncheckedCreateInput>
    /**
     * In case the L1Function was found with the provided `where` argument, update it with this data.
     */
    update: XOR<L1FunctionUpdateInput, L1FunctionUncheckedUpdateInput>
  }

  /**
   * L1Function delete
   */
  export type L1FunctionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
    /**
     * Filter which L1Function to delete.
     */
    where: L1FunctionWhereUniqueInput
  }

  /**
   * L1Function deleteMany
   */
  export type L1FunctionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L1Functions to delete
     */
    where?: L1FunctionWhereInput
    /**
     * Limit how many L1Functions to delete.
     */
    limit?: number
  }

  /**
   * L1Function.failureEffects
   */
  export type L1Function$failureEffectsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    where?: FailureEffectWhereInput
    orderBy?: FailureEffectOrderByWithRelationInput | FailureEffectOrderByWithRelationInput[]
    cursor?: FailureEffectWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureEffectScalarFieldEnum | FailureEffectScalarFieldEnum[]
  }

  /**
   * L1Function without action
   */
  export type L1FunctionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L1Function
     */
    select?: L1FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L1Function
     */
    omit?: L1FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L1FunctionInclude<ExtArgs> | null
  }


  /**
   * Model L2Function
   */

  export type AggregateL2Function = {
    _count: L2FunctionCountAggregateOutputType | null
    _min: L2FunctionMinAggregateOutputType | null
    _max: L2FunctionMaxAggregateOutputType | null
  }

  export type L2FunctionMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l2StructId: string | null
    functionName: string | null
    productChar: string | null
    specialChar: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L2FunctionMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l2StructId: string | null
    functionName: string | null
    productChar: string | null
    specialChar: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L2FunctionCountAggregateOutputType = {
    id: number
    fmeaId: number
    l2StructId: number
    functionName: number
    productChar: number
    specialChar: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type L2FunctionMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l2StructId?: true
    functionName?: true
    productChar?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L2FunctionMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l2StructId?: true
    functionName?: true
    productChar?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L2FunctionCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l2StructId?: true
    functionName?: true
    productChar?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type L2FunctionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L2Function to aggregate.
     */
    where?: L2FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Functions to fetch.
     */
    orderBy?: L2FunctionOrderByWithRelationInput | L2FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: L2FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned L2Functions
    **/
    _count?: true | L2FunctionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: L2FunctionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: L2FunctionMaxAggregateInputType
  }

  export type GetL2FunctionAggregateType<T extends L2FunctionAggregateArgs> = {
        [P in keyof T & keyof AggregateL2Function]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateL2Function[P]>
      : GetScalarType<T[P], AggregateL2Function[P]>
  }




  export type L2FunctionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L2FunctionWhereInput
    orderBy?: L2FunctionOrderByWithAggregationInput | L2FunctionOrderByWithAggregationInput[]
    by: L2FunctionScalarFieldEnum[] | L2FunctionScalarFieldEnum
    having?: L2FunctionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: L2FunctionCountAggregateInputType | true
    _min?: L2FunctionMinAggregateInputType
    _max?: L2FunctionMaxAggregateInputType
  }

  export type L2FunctionGroupByOutputType = {
    id: string
    fmeaId: string
    l2StructId: string
    functionName: string
    productChar: string
    specialChar: string | null
    createdAt: Date
    updatedAt: Date
    _count: L2FunctionCountAggregateOutputType | null
    _min: L2FunctionMinAggregateOutputType | null
    _max: L2FunctionMaxAggregateOutputType | null
  }

  type GetL2FunctionGroupByPayload<T extends L2FunctionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<L2FunctionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof L2FunctionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], L2FunctionGroupByOutputType[P]>
            : GetScalarType<T[P], L2FunctionGroupByOutputType[P]>
        }
      >
    >


  export type L2FunctionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    productChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
    failureModes?: boolean | L2Function$failureModesArgs<ExtArgs>
    _count?: boolean | L2FunctionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l2Function"]>

  export type L2FunctionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    productChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l2Function"]>

  export type L2FunctionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    productChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l2Function"]>

  export type L2FunctionSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    productChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type L2FunctionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l2StructId" | "functionName" | "productChar" | "specialChar" | "createdAt" | "updatedAt", ExtArgs["result"]["l2Function"]>
  export type L2FunctionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
    failureModes?: boolean | L2Function$failureModesArgs<ExtArgs>
    _count?: boolean | L2FunctionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type L2FunctionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }
  export type L2FunctionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }

  export type $L2FunctionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "L2Function"
    objects: {
      l2Structure: Prisma.$L2StructurePayload<ExtArgs>
      failureModes: Prisma.$FailureModePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l2StructId: string
      functionName: string
      productChar: string
      specialChar: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["l2Function"]>
    composites: {}
  }

  type L2FunctionGetPayload<S extends boolean | null | undefined | L2FunctionDefaultArgs> = $Result.GetResult<Prisma.$L2FunctionPayload, S>

  type L2FunctionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<L2FunctionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: L2FunctionCountAggregateInputType | true
    }

  export interface L2FunctionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['L2Function'], meta: { name: 'L2Function' } }
    /**
     * Find zero or one L2Function that matches the filter.
     * @param {L2FunctionFindUniqueArgs} args - Arguments to find a L2Function
     * @example
     * // Get one L2Function
     * const l2Function = await prisma.l2Function.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends L2FunctionFindUniqueArgs>(args: SelectSubset<T, L2FunctionFindUniqueArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one L2Function that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {L2FunctionFindUniqueOrThrowArgs} args - Arguments to find a L2Function
     * @example
     * // Get one L2Function
     * const l2Function = await prisma.l2Function.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends L2FunctionFindUniqueOrThrowArgs>(args: SelectSubset<T, L2FunctionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L2Function that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2FunctionFindFirstArgs} args - Arguments to find a L2Function
     * @example
     * // Get one L2Function
     * const l2Function = await prisma.l2Function.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends L2FunctionFindFirstArgs>(args?: SelectSubset<T, L2FunctionFindFirstArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L2Function that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2FunctionFindFirstOrThrowArgs} args - Arguments to find a L2Function
     * @example
     * // Get one L2Function
     * const l2Function = await prisma.l2Function.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends L2FunctionFindFirstOrThrowArgs>(args?: SelectSubset<T, L2FunctionFindFirstOrThrowArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more L2Functions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2FunctionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all L2Functions
     * const l2Functions = await prisma.l2Function.findMany()
     * 
     * // Get first 10 L2Functions
     * const l2Functions = await prisma.l2Function.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const l2FunctionWithIdOnly = await prisma.l2Function.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends L2FunctionFindManyArgs>(args?: SelectSubset<T, L2FunctionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a L2Function.
     * @param {L2FunctionCreateArgs} args - Arguments to create a L2Function.
     * @example
     * // Create one L2Function
     * const L2Function = await prisma.l2Function.create({
     *   data: {
     *     // ... data to create a L2Function
     *   }
     * })
     * 
     */
    create<T extends L2FunctionCreateArgs>(args: SelectSubset<T, L2FunctionCreateArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many L2Functions.
     * @param {L2FunctionCreateManyArgs} args - Arguments to create many L2Functions.
     * @example
     * // Create many L2Functions
     * const l2Function = await prisma.l2Function.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends L2FunctionCreateManyArgs>(args?: SelectSubset<T, L2FunctionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many L2Functions and returns the data saved in the database.
     * @param {L2FunctionCreateManyAndReturnArgs} args - Arguments to create many L2Functions.
     * @example
     * // Create many L2Functions
     * const l2Function = await prisma.l2Function.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many L2Functions and only return the `id`
     * const l2FunctionWithIdOnly = await prisma.l2Function.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends L2FunctionCreateManyAndReturnArgs>(args?: SelectSubset<T, L2FunctionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a L2Function.
     * @param {L2FunctionDeleteArgs} args - Arguments to delete one L2Function.
     * @example
     * // Delete one L2Function
     * const L2Function = await prisma.l2Function.delete({
     *   where: {
     *     // ... filter to delete one L2Function
     *   }
     * })
     * 
     */
    delete<T extends L2FunctionDeleteArgs>(args: SelectSubset<T, L2FunctionDeleteArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one L2Function.
     * @param {L2FunctionUpdateArgs} args - Arguments to update one L2Function.
     * @example
     * // Update one L2Function
     * const l2Function = await prisma.l2Function.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends L2FunctionUpdateArgs>(args: SelectSubset<T, L2FunctionUpdateArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more L2Functions.
     * @param {L2FunctionDeleteManyArgs} args - Arguments to filter L2Functions to delete.
     * @example
     * // Delete a few L2Functions
     * const { count } = await prisma.l2Function.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends L2FunctionDeleteManyArgs>(args?: SelectSubset<T, L2FunctionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L2Functions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2FunctionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many L2Functions
     * const l2Function = await prisma.l2Function.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends L2FunctionUpdateManyArgs>(args: SelectSubset<T, L2FunctionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L2Functions and returns the data updated in the database.
     * @param {L2FunctionUpdateManyAndReturnArgs} args - Arguments to update many L2Functions.
     * @example
     * // Update many L2Functions
     * const l2Function = await prisma.l2Function.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more L2Functions and only return the `id`
     * const l2FunctionWithIdOnly = await prisma.l2Function.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends L2FunctionUpdateManyAndReturnArgs>(args: SelectSubset<T, L2FunctionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one L2Function.
     * @param {L2FunctionUpsertArgs} args - Arguments to update or create a L2Function.
     * @example
     * // Update or create a L2Function
     * const l2Function = await prisma.l2Function.upsert({
     *   create: {
     *     // ... data to create a L2Function
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the L2Function we want to update
     *   }
     * })
     */
    upsert<T extends L2FunctionUpsertArgs>(args: SelectSubset<T, L2FunctionUpsertArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of L2Functions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2FunctionCountArgs} args - Arguments to filter L2Functions to count.
     * @example
     * // Count the number of L2Functions
     * const count = await prisma.l2Function.count({
     *   where: {
     *     // ... the filter for the L2Functions we want to count
     *   }
     * })
    **/
    count<T extends L2FunctionCountArgs>(
      args?: Subset<T, L2FunctionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], L2FunctionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a L2Function.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2FunctionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends L2FunctionAggregateArgs>(args: Subset<T, L2FunctionAggregateArgs>): Prisma.PrismaPromise<GetL2FunctionAggregateType<T>>

    /**
     * Group by L2Function.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L2FunctionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends L2FunctionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: L2FunctionGroupByArgs['orderBy'] }
        : { orderBy?: L2FunctionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, L2FunctionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetL2FunctionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the L2Function model
   */
  readonly fields: L2FunctionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for L2Function.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__L2FunctionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l2Structure<T extends L2StructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L2StructureDefaultArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureModes<T extends L2Function$failureModesArgs<ExtArgs> = {}>(args?: Subset<T, L2Function$failureModesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the L2Function model
   */
  interface L2FunctionFieldRefs {
    readonly id: FieldRef<"L2Function", 'String'>
    readonly fmeaId: FieldRef<"L2Function", 'String'>
    readonly l2StructId: FieldRef<"L2Function", 'String'>
    readonly functionName: FieldRef<"L2Function", 'String'>
    readonly productChar: FieldRef<"L2Function", 'String'>
    readonly specialChar: FieldRef<"L2Function", 'String'>
    readonly createdAt: FieldRef<"L2Function", 'DateTime'>
    readonly updatedAt: FieldRef<"L2Function", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * L2Function findUnique
   */
  export type L2FunctionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L2Function to fetch.
     */
    where: L2FunctionWhereUniqueInput
  }

  /**
   * L2Function findUniqueOrThrow
   */
  export type L2FunctionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L2Function to fetch.
     */
    where: L2FunctionWhereUniqueInput
  }

  /**
   * L2Function findFirst
   */
  export type L2FunctionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L2Function to fetch.
     */
    where?: L2FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Functions to fetch.
     */
    orderBy?: L2FunctionOrderByWithRelationInput | L2FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L2Functions.
     */
    cursor?: L2FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L2Functions.
     */
    distinct?: L2FunctionScalarFieldEnum | L2FunctionScalarFieldEnum[]
  }

  /**
   * L2Function findFirstOrThrow
   */
  export type L2FunctionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L2Function to fetch.
     */
    where?: L2FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Functions to fetch.
     */
    orderBy?: L2FunctionOrderByWithRelationInput | L2FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L2Functions.
     */
    cursor?: L2FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L2Functions.
     */
    distinct?: L2FunctionScalarFieldEnum | L2FunctionScalarFieldEnum[]
  }

  /**
   * L2Function findMany
   */
  export type L2FunctionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L2Functions to fetch.
     */
    where?: L2FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L2Functions to fetch.
     */
    orderBy?: L2FunctionOrderByWithRelationInput | L2FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing L2Functions.
     */
    cursor?: L2FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L2Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L2Functions.
     */
    skip?: number
    distinct?: L2FunctionScalarFieldEnum | L2FunctionScalarFieldEnum[]
  }

  /**
   * L2Function create
   */
  export type L2FunctionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * The data needed to create a L2Function.
     */
    data: XOR<L2FunctionCreateInput, L2FunctionUncheckedCreateInput>
  }

  /**
   * L2Function createMany
   */
  export type L2FunctionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many L2Functions.
     */
    data: L2FunctionCreateManyInput | L2FunctionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * L2Function createManyAndReturn
   */
  export type L2FunctionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * The data used to create many L2Functions.
     */
    data: L2FunctionCreateManyInput | L2FunctionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * L2Function update
   */
  export type L2FunctionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * The data needed to update a L2Function.
     */
    data: XOR<L2FunctionUpdateInput, L2FunctionUncheckedUpdateInput>
    /**
     * Choose, which L2Function to update.
     */
    where: L2FunctionWhereUniqueInput
  }

  /**
   * L2Function updateMany
   */
  export type L2FunctionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update L2Functions.
     */
    data: XOR<L2FunctionUpdateManyMutationInput, L2FunctionUncheckedUpdateManyInput>
    /**
     * Filter which L2Functions to update
     */
    where?: L2FunctionWhereInput
    /**
     * Limit how many L2Functions to update.
     */
    limit?: number
  }

  /**
   * L2Function updateManyAndReturn
   */
  export type L2FunctionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * The data used to update L2Functions.
     */
    data: XOR<L2FunctionUpdateManyMutationInput, L2FunctionUncheckedUpdateManyInput>
    /**
     * Filter which L2Functions to update
     */
    where?: L2FunctionWhereInput
    /**
     * Limit how many L2Functions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * L2Function upsert
   */
  export type L2FunctionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * The filter to search for the L2Function to update in case it exists.
     */
    where: L2FunctionWhereUniqueInput
    /**
     * In case the L2Function found by the `where` argument doesn't exist, create a new L2Function with this data.
     */
    create: XOR<L2FunctionCreateInput, L2FunctionUncheckedCreateInput>
    /**
     * In case the L2Function was found with the provided `where` argument, update it with this data.
     */
    update: XOR<L2FunctionUpdateInput, L2FunctionUncheckedUpdateInput>
  }

  /**
   * L2Function delete
   */
  export type L2FunctionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
    /**
     * Filter which L2Function to delete.
     */
    where: L2FunctionWhereUniqueInput
  }

  /**
   * L2Function deleteMany
   */
  export type L2FunctionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L2Functions to delete
     */
    where?: L2FunctionWhereInput
    /**
     * Limit how many L2Functions to delete.
     */
    limit?: number
  }

  /**
   * L2Function.failureModes
   */
  export type L2Function$failureModesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    where?: FailureModeWhereInput
    orderBy?: FailureModeOrderByWithRelationInput | FailureModeOrderByWithRelationInput[]
    cursor?: FailureModeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureModeScalarFieldEnum | FailureModeScalarFieldEnum[]
  }

  /**
   * L2Function without action
   */
  export type L2FunctionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L2Function
     */
    select?: L2FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L2Function
     */
    omit?: L2FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L2FunctionInclude<ExtArgs> | null
  }


  /**
   * Model L3Function
   */

  export type AggregateL3Function = {
    _count: L3FunctionCountAggregateOutputType | null
    _min: L3FunctionMinAggregateOutputType | null
    _max: L3FunctionMaxAggregateOutputType | null
  }

  export type L3FunctionMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l3StructId: string | null
    l2StructId: string | null
    functionName: string | null
    processChar: string | null
    specialChar: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L3FunctionMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l3StructId: string | null
    l2StructId: string | null
    functionName: string | null
    processChar: string | null
    specialChar: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type L3FunctionCountAggregateOutputType = {
    id: number
    fmeaId: number
    l3StructId: number
    l2StructId: number
    functionName: number
    processChar: number
    specialChar: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type L3FunctionMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l3StructId?: true
    l2StructId?: true
    functionName?: true
    processChar?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L3FunctionMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l3StructId?: true
    l2StructId?: true
    functionName?: true
    processChar?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
  }

  export type L3FunctionCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l3StructId?: true
    l2StructId?: true
    functionName?: true
    processChar?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type L3FunctionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L3Function to aggregate.
     */
    where?: L3FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Functions to fetch.
     */
    orderBy?: L3FunctionOrderByWithRelationInput | L3FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: L3FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned L3Functions
    **/
    _count?: true | L3FunctionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: L3FunctionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: L3FunctionMaxAggregateInputType
  }

  export type GetL3FunctionAggregateType<T extends L3FunctionAggregateArgs> = {
        [P in keyof T & keyof AggregateL3Function]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateL3Function[P]>
      : GetScalarType<T[P], AggregateL3Function[P]>
  }




  export type L3FunctionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: L3FunctionWhereInput
    orderBy?: L3FunctionOrderByWithAggregationInput | L3FunctionOrderByWithAggregationInput[]
    by: L3FunctionScalarFieldEnum[] | L3FunctionScalarFieldEnum
    having?: L3FunctionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: L3FunctionCountAggregateInputType | true
    _min?: L3FunctionMinAggregateInputType
    _max?: L3FunctionMaxAggregateInputType
  }

  export type L3FunctionGroupByOutputType = {
    id: string
    fmeaId: string
    l3StructId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar: string | null
    createdAt: Date
    updatedAt: Date
    _count: L3FunctionCountAggregateOutputType | null
    _min: L3FunctionMinAggregateOutputType | null
    _max: L3FunctionMaxAggregateOutputType | null
  }

  type GetL3FunctionGroupByPayload<T extends L3FunctionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<L3FunctionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof L3FunctionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], L3FunctionGroupByOutputType[P]>
            : GetScalarType<T[P], L3FunctionGroupByOutputType[P]>
        }
      >
    >


  export type L3FunctionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    processChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
    failureCauses?: boolean | L3Function$failureCausesArgs<ExtArgs>
    _count?: boolean | L3FunctionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l3Function"]>

  export type L3FunctionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    processChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l3Function"]>

  export type L3FunctionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    processChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["l3Function"]>

  export type L3FunctionSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    functionName?: boolean
    processChar?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type L3FunctionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l3StructId" | "l2StructId" | "functionName" | "processChar" | "specialChar" | "createdAt" | "updatedAt", ExtArgs["result"]["l3Function"]>
  export type L3FunctionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
    failureCauses?: boolean | L3Function$failureCausesArgs<ExtArgs>
    _count?: boolean | L3FunctionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type L3FunctionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }
  export type L3FunctionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }

  export type $L3FunctionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "L3Function"
    objects: {
      l3Structure: Prisma.$L3StructurePayload<ExtArgs>
      failureCauses: Prisma.$FailureCausePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l3StructId: string
      l2StructId: string
      functionName: string
      processChar: string
      specialChar: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["l3Function"]>
    composites: {}
  }

  type L3FunctionGetPayload<S extends boolean | null | undefined | L3FunctionDefaultArgs> = $Result.GetResult<Prisma.$L3FunctionPayload, S>

  type L3FunctionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<L3FunctionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: L3FunctionCountAggregateInputType | true
    }

  export interface L3FunctionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['L3Function'], meta: { name: 'L3Function' } }
    /**
     * Find zero or one L3Function that matches the filter.
     * @param {L3FunctionFindUniqueArgs} args - Arguments to find a L3Function
     * @example
     * // Get one L3Function
     * const l3Function = await prisma.l3Function.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends L3FunctionFindUniqueArgs>(args: SelectSubset<T, L3FunctionFindUniqueArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one L3Function that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {L3FunctionFindUniqueOrThrowArgs} args - Arguments to find a L3Function
     * @example
     * // Get one L3Function
     * const l3Function = await prisma.l3Function.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends L3FunctionFindUniqueOrThrowArgs>(args: SelectSubset<T, L3FunctionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L3Function that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3FunctionFindFirstArgs} args - Arguments to find a L3Function
     * @example
     * // Get one L3Function
     * const l3Function = await prisma.l3Function.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends L3FunctionFindFirstArgs>(args?: SelectSubset<T, L3FunctionFindFirstArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first L3Function that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3FunctionFindFirstOrThrowArgs} args - Arguments to find a L3Function
     * @example
     * // Get one L3Function
     * const l3Function = await prisma.l3Function.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends L3FunctionFindFirstOrThrowArgs>(args?: SelectSubset<T, L3FunctionFindFirstOrThrowArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more L3Functions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3FunctionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all L3Functions
     * const l3Functions = await prisma.l3Function.findMany()
     * 
     * // Get first 10 L3Functions
     * const l3Functions = await prisma.l3Function.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const l3FunctionWithIdOnly = await prisma.l3Function.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends L3FunctionFindManyArgs>(args?: SelectSubset<T, L3FunctionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a L3Function.
     * @param {L3FunctionCreateArgs} args - Arguments to create a L3Function.
     * @example
     * // Create one L3Function
     * const L3Function = await prisma.l3Function.create({
     *   data: {
     *     // ... data to create a L3Function
     *   }
     * })
     * 
     */
    create<T extends L3FunctionCreateArgs>(args: SelectSubset<T, L3FunctionCreateArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many L3Functions.
     * @param {L3FunctionCreateManyArgs} args - Arguments to create many L3Functions.
     * @example
     * // Create many L3Functions
     * const l3Function = await prisma.l3Function.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends L3FunctionCreateManyArgs>(args?: SelectSubset<T, L3FunctionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many L3Functions and returns the data saved in the database.
     * @param {L3FunctionCreateManyAndReturnArgs} args - Arguments to create many L3Functions.
     * @example
     * // Create many L3Functions
     * const l3Function = await prisma.l3Function.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many L3Functions and only return the `id`
     * const l3FunctionWithIdOnly = await prisma.l3Function.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends L3FunctionCreateManyAndReturnArgs>(args?: SelectSubset<T, L3FunctionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a L3Function.
     * @param {L3FunctionDeleteArgs} args - Arguments to delete one L3Function.
     * @example
     * // Delete one L3Function
     * const L3Function = await prisma.l3Function.delete({
     *   where: {
     *     // ... filter to delete one L3Function
     *   }
     * })
     * 
     */
    delete<T extends L3FunctionDeleteArgs>(args: SelectSubset<T, L3FunctionDeleteArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one L3Function.
     * @param {L3FunctionUpdateArgs} args - Arguments to update one L3Function.
     * @example
     * // Update one L3Function
     * const l3Function = await prisma.l3Function.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends L3FunctionUpdateArgs>(args: SelectSubset<T, L3FunctionUpdateArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more L3Functions.
     * @param {L3FunctionDeleteManyArgs} args - Arguments to filter L3Functions to delete.
     * @example
     * // Delete a few L3Functions
     * const { count } = await prisma.l3Function.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends L3FunctionDeleteManyArgs>(args?: SelectSubset<T, L3FunctionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L3Functions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3FunctionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many L3Functions
     * const l3Function = await prisma.l3Function.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends L3FunctionUpdateManyArgs>(args: SelectSubset<T, L3FunctionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more L3Functions and returns the data updated in the database.
     * @param {L3FunctionUpdateManyAndReturnArgs} args - Arguments to update many L3Functions.
     * @example
     * // Update many L3Functions
     * const l3Function = await prisma.l3Function.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more L3Functions and only return the `id`
     * const l3FunctionWithIdOnly = await prisma.l3Function.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends L3FunctionUpdateManyAndReturnArgs>(args: SelectSubset<T, L3FunctionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one L3Function.
     * @param {L3FunctionUpsertArgs} args - Arguments to update or create a L3Function.
     * @example
     * // Update or create a L3Function
     * const l3Function = await prisma.l3Function.upsert({
     *   create: {
     *     // ... data to create a L3Function
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the L3Function we want to update
     *   }
     * })
     */
    upsert<T extends L3FunctionUpsertArgs>(args: SelectSubset<T, L3FunctionUpsertArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of L3Functions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3FunctionCountArgs} args - Arguments to filter L3Functions to count.
     * @example
     * // Count the number of L3Functions
     * const count = await prisma.l3Function.count({
     *   where: {
     *     // ... the filter for the L3Functions we want to count
     *   }
     * })
    **/
    count<T extends L3FunctionCountArgs>(
      args?: Subset<T, L3FunctionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], L3FunctionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a L3Function.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3FunctionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends L3FunctionAggregateArgs>(args: Subset<T, L3FunctionAggregateArgs>): Prisma.PrismaPromise<GetL3FunctionAggregateType<T>>

    /**
     * Group by L3Function.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {L3FunctionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends L3FunctionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: L3FunctionGroupByArgs['orderBy'] }
        : { orderBy?: L3FunctionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, L3FunctionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetL3FunctionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the L3Function model
   */
  readonly fields: L3FunctionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for L3Function.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__L3FunctionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l3Structure<T extends L3StructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L3StructureDefaultArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureCauses<T extends L3Function$failureCausesArgs<ExtArgs> = {}>(args?: Subset<T, L3Function$failureCausesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the L3Function model
   */
  interface L3FunctionFieldRefs {
    readonly id: FieldRef<"L3Function", 'String'>
    readonly fmeaId: FieldRef<"L3Function", 'String'>
    readonly l3StructId: FieldRef<"L3Function", 'String'>
    readonly l2StructId: FieldRef<"L3Function", 'String'>
    readonly functionName: FieldRef<"L3Function", 'String'>
    readonly processChar: FieldRef<"L3Function", 'String'>
    readonly specialChar: FieldRef<"L3Function", 'String'>
    readonly createdAt: FieldRef<"L3Function", 'DateTime'>
    readonly updatedAt: FieldRef<"L3Function", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * L3Function findUnique
   */
  export type L3FunctionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L3Function to fetch.
     */
    where: L3FunctionWhereUniqueInput
  }

  /**
   * L3Function findUniqueOrThrow
   */
  export type L3FunctionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L3Function to fetch.
     */
    where: L3FunctionWhereUniqueInput
  }

  /**
   * L3Function findFirst
   */
  export type L3FunctionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L3Function to fetch.
     */
    where?: L3FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Functions to fetch.
     */
    orderBy?: L3FunctionOrderByWithRelationInput | L3FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L3Functions.
     */
    cursor?: L3FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L3Functions.
     */
    distinct?: L3FunctionScalarFieldEnum | L3FunctionScalarFieldEnum[]
  }

  /**
   * L3Function findFirstOrThrow
   */
  export type L3FunctionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L3Function to fetch.
     */
    where?: L3FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Functions to fetch.
     */
    orderBy?: L3FunctionOrderByWithRelationInput | L3FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for L3Functions.
     */
    cursor?: L3FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Functions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of L3Functions.
     */
    distinct?: L3FunctionScalarFieldEnum | L3FunctionScalarFieldEnum[]
  }

  /**
   * L3Function findMany
   */
  export type L3FunctionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * Filter, which L3Functions to fetch.
     */
    where?: L3FunctionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of L3Functions to fetch.
     */
    orderBy?: L3FunctionOrderByWithRelationInput | L3FunctionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing L3Functions.
     */
    cursor?: L3FunctionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` L3Functions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` L3Functions.
     */
    skip?: number
    distinct?: L3FunctionScalarFieldEnum | L3FunctionScalarFieldEnum[]
  }

  /**
   * L3Function create
   */
  export type L3FunctionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * The data needed to create a L3Function.
     */
    data: XOR<L3FunctionCreateInput, L3FunctionUncheckedCreateInput>
  }

  /**
   * L3Function createMany
   */
  export type L3FunctionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many L3Functions.
     */
    data: L3FunctionCreateManyInput | L3FunctionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * L3Function createManyAndReturn
   */
  export type L3FunctionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * The data used to create many L3Functions.
     */
    data: L3FunctionCreateManyInput | L3FunctionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * L3Function update
   */
  export type L3FunctionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * The data needed to update a L3Function.
     */
    data: XOR<L3FunctionUpdateInput, L3FunctionUncheckedUpdateInput>
    /**
     * Choose, which L3Function to update.
     */
    where: L3FunctionWhereUniqueInput
  }

  /**
   * L3Function updateMany
   */
  export type L3FunctionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update L3Functions.
     */
    data: XOR<L3FunctionUpdateManyMutationInput, L3FunctionUncheckedUpdateManyInput>
    /**
     * Filter which L3Functions to update
     */
    where?: L3FunctionWhereInput
    /**
     * Limit how many L3Functions to update.
     */
    limit?: number
  }

  /**
   * L3Function updateManyAndReturn
   */
  export type L3FunctionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * The data used to update L3Functions.
     */
    data: XOR<L3FunctionUpdateManyMutationInput, L3FunctionUncheckedUpdateManyInput>
    /**
     * Filter which L3Functions to update
     */
    where?: L3FunctionWhereInput
    /**
     * Limit how many L3Functions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * L3Function upsert
   */
  export type L3FunctionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * The filter to search for the L3Function to update in case it exists.
     */
    where: L3FunctionWhereUniqueInput
    /**
     * In case the L3Function found by the `where` argument doesn't exist, create a new L3Function with this data.
     */
    create: XOR<L3FunctionCreateInput, L3FunctionUncheckedCreateInput>
    /**
     * In case the L3Function was found with the provided `where` argument, update it with this data.
     */
    update: XOR<L3FunctionUpdateInput, L3FunctionUncheckedUpdateInput>
  }

  /**
   * L3Function delete
   */
  export type L3FunctionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
    /**
     * Filter which L3Function to delete.
     */
    where: L3FunctionWhereUniqueInput
  }

  /**
   * L3Function deleteMany
   */
  export type L3FunctionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which L3Functions to delete
     */
    where?: L3FunctionWhereInput
    /**
     * Limit how many L3Functions to delete.
     */
    limit?: number
  }

  /**
   * L3Function.failureCauses
   */
  export type L3Function$failureCausesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    where?: FailureCauseWhereInput
    orderBy?: FailureCauseOrderByWithRelationInput | FailureCauseOrderByWithRelationInput[]
    cursor?: FailureCauseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureCauseScalarFieldEnum | FailureCauseScalarFieldEnum[]
  }

  /**
   * L3Function without action
   */
  export type L3FunctionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the L3Function
     */
    select?: L3FunctionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the L3Function
     */
    omit?: L3FunctionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: L3FunctionInclude<ExtArgs> | null
  }


  /**
   * Model FailureEffect
   */

  export type AggregateFailureEffect = {
    _count: FailureEffectCountAggregateOutputType | null
    _avg: FailureEffectAvgAggregateOutputType | null
    _sum: FailureEffectSumAggregateOutputType | null
    _min: FailureEffectMinAggregateOutputType | null
    _max: FailureEffectMaxAggregateOutputType | null
  }

  export type FailureEffectAvgAggregateOutputType = {
    severity: number | null
  }

  export type FailureEffectSumAggregateOutputType = {
    severity: number | null
  }

  export type FailureEffectMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1FuncId: string | null
    category: string | null
    effect: string | null
    severity: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureEffectMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l1FuncId: string | null
    category: string | null
    effect: string | null
    severity: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureEffectCountAggregateOutputType = {
    id: number
    fmeaId: number
    l1FuncId: number
    category: number
    effect: number
    severity: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FailureEffectAvgAggregateInputType = {
    severity?: true
  }

  export type FailureEffectSumAggregateInputType = {
    severity?: true
  }

  export type FailureEffectMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l1FuncId?: true
    category?: true
    effect?: true
    severity?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureEffectMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l1FuncId?: true
    category?: true
    effect?: true
    severity?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureEffectCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l1FuncId?: true
    category?: true
    effect?: true
    severity?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FailureEffectAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureEffect to aggregate.
     */
    where?: FailureEffectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureEffects to fetch.
     */
    orderBy?: FailureEffectOrderByWithRelationInput | FailureEffectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FailureEffectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureEffects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureEffects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FailureEffects
    **/
    _count?: true | FailureEffectCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FailureEffectAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FailureEffectSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FailureEffectMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FailureEffectMaxAggregateInputType
  }

  export type GetFailureEffectAggregateType<T extends FailureEffectAggregateArgs> = {
        [P in keyof T & keyof AggregateFailureEffect]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFailureEffect[P]>
      : GetScalarType<T[P], AggregateFailureEffect[P]>
  }




  export type FailureEffectGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureEffectWhereInput
    orderBy?: FailureEffectOrderByWithAggregationInput | FailureEffectOrderByWithAggregationInput[]
    by: FailureEffectScalarFieldEnum[] | FailureEffectScalarFieldEnum
    having?: FailureEffectScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FailureEffectCountAggregateInputType | true
    _avg?: FailureEffectAvgAggregateInputType
    _sum?: FailureEffectSumAggregateInputType
    _min?: FailureEffectMinAggregateInputType
    _max?: FailureEffectMaxAggregateInputType
  }

  export type FailureEffectGroupByOutputType = {
    id: string
    fmeaId: string
    l1FuncId: string
    category: string
    effect: string
    severity: number
    createdAt: Date
    updatedAt: Date
    _count: FailureEffectCountAggregateOutputType | null
    _avg: FailureEffectAvgAggregateOutputType | null
    _sum: FailureEffectSumAggregateOutputType | null
    _min: FailureEffectMinAggregateOutputType | null
    _max: FailureEffectMaxAggregateOutputType | null
  }

  type GetFailureEffectGroupByPayload<T extends FailureEffectGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FailureEffectGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FailureEffectGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FailureEffectGroupByOutputType[P]>
            : GetScalarType<T[P], FailureEffectGroupByOutputType[P]>
        }
      >
    >


  export type FailureEffectSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1FuncId?: boolean
    category?: boolean
    effect?: boolean
    severity?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Function?: boolean | L1FunctionDefaultArgs<ExtArgs>
    failureLinks?: boolean | FailureEffect$failureLinksArgs<ExtArgs>
    _count?: boolean | FailureEffectCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureEffect"]>

  export type FailureEffectSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1FuncId?: boolean
    category?: boolean
    effect?: boolean
    severity?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Function?: boolean | L1FunctionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureEffect"]>

  export type FailureEffectSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l1FuncId?: boolean
    category?: boolean
    effect?: boolean
    severity?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l1Function?: boolean | L1FunctionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureEffect"]>

  export type FailureEffectSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l1FuncId?: boolean
    category?: boolean
    effect?: boolean
    severity?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FailureEffectOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l1FuncId" | "category" | "effect" | "severity" | "createdAt" | "updatedAt", ExtArgs["result"]["failureEffect"]>
  export type FailureEffectInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Function?: boolean | L1FunctionDefaultArgs<ExtArgs>
    failureLinks?: boolean | FailureEffect$failureLinksArgs<ExtArgs>
    _count?: boolean | FailureEffectCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FailureEffectIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Function?: boolean | L1FunctionDefaultArgs<ExtArgs>
  }
  export type FailureEffectIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l1Function?: boolean | L1FunctionDefaultArgs<ExtArgs>
  }

  export type $FailureEffectPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FailureEffect"
    objects: {
      l1Function: Prisma.$L1FunctionPayload<ExtArgs>
      failureLinks: Prisma.$FailureLinkPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l1FuncId: string
      category: string
      effect: string
      severity: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["failureEffect"]>
    composites: {}
  }

  type FailureEffectGetPayload<S extends boolean | null | undefined | FailureEffectDefaultArgs> = $Result.GetResult<Prisma.$FailureEffectPayload, S>

  type FailureEffectCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FailureEffectFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FailureEffectCountAggregateInputType | true
    }

  export interface FailureEffectDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FailureEffect'], meta: { name: 'FailureEffect' } }
    /**
     * Find zero or one FailureEffect that matches the filter.
     * @param {FailureEffectFindUniqueArgs} args - Arguments to find a FailureEffect
     * @example
     * // Get one FailureEffect
     * const failureEffect = await prisma.failureEffect.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FailureEffectFindUniqueArgs>(args: SelectSubset<T, FailureEffectFindUniqueArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FailureEffect that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FailureEffectFindUniqueOrThrowArgs} args - Arguments to find a FailureEffect
     * @example
     * // Get one FailureEffect
     * const failureEffect = await prisma.failureEffect.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FailureEffectFindUniqueOrThrowArgs>(args: SelectSubset<T, FailureEffectFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureEffect that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureEffectFindFirstArgs} args - Arguments to find a FailureEffect
     * @example
     * // Get one FailureEffect
     * const failureEffect = await prisma.failureEffect.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FailureEffectFindFirstArgs>(args?: SelectSubset<T, FailureEffectFindFirstArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureEffect that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureEffectFindFirstOrThrowArgs} args - Arguments to find a FailureEffect
     * @example
     * // Get one FailureEffect
     * const failureEffect = await prisma.failureEffect.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FailureEffectFindFirstOrThrowArgs>(args?: SelectSubset<T, FailureEffectFindFirstOrThrowArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FailureEffects that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureEffectFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FailureEffects
     * const failureEffects = await prisma.failureEffect.findMany()
     * 
     * // Get first 10 FailureEffects
     * const failureEffects = await prisma.failureEffect.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const failureEffectWithIdOnly = await prisma.failureEffect.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FailureEffectFindManyArgs>(args?: SelectSubset<T, FailureEffectFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FailureEffect.
     * @param {FailureEffectCreateArgs} args - Arguments to create a FailureEffect.
     * @example
     * // Create one FailureEffect
     * const FailureEffect = await prisma.failureEffect.create({
     *   data: {
     *     // ... data to create a FailureEffect
     *   }
     * })
     * 
     */
    create<T extends FailureEffectCreateArgs>(args: SelectSubset<T, FailureEffectCreateArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FailureEffects.
     * @param {FailureEffectCreateManyArgs} args - Arguments to create many FailureEffects.
     * @example
     * // Create many FailureEffects
     * const failureEffect = await prisma.failureEffect.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FailureEffectCreateManyArgs>(args?: SelectSubset<T, FailureEffectCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FailureEffects and returns the data saved in the database.
     * @param {FailureEffectCreateManyAndReturnArgs} args - Arguments to create many FailureEffects.
     * @example
     * // Create many FailureEffects
     * const failureEffect = await prisma.failureEffect.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FailureEffects and only return the `id`
     * const failureEffectWithIdOnly = await prisma.failureEffect.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FailureEffectCreateManyAndReturnArgs>(args?: SelectSubset<T, FailureEffectCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FailureEffect.
     * @param {FailureEffectDeleteArgs} args - Arguments to delete one FailureEffect.
     * @example
     * // Delete one FailureEffect
     * const FailureEffect = await prisma.failureEffect.delete({
     *   where: {
     *     // ... filter to delete one FailureEffect
     *   }
     * })
     * 
     */
    delete<T extends FailureEffectDeleteArgs>(args: SelectSubset<T, FailureEffectDeleteArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FailureEffect.
     * @param {FailureEffectUpdateArgs} args - Arguments to update one FailureEffect.
     * @example
     * // Update one FailureEffect
     * const failureEffect = await prisma.failureEffect.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FailureEffectUpdateArgs>(args: SelectSubset<T, FailureEffectUpdateArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FailureEffects.
     * @param {FailureEffectDeleteManyArgs} args - Arguments to filter FailureEffects to delete.
     * @example
     * // Delete a few FailureEffects
     * const { count } = await prisma.failureEffect.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FailureEffectDeleteManyArgs>(args?: SelectSubset<T, FailureEffectDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureEffects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureEffectUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FailureEffects
     * const failureEffect = await prisma.failureEffect.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FailureEffectUpdateManyArgs>(args: SelectSubset<T, FailureEffectUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureEffects and returns the data updated in the database.
     * @param {FailureEffectUpdateManyAndReturnArgs} args - Arguments to update many FailureEffects.
     * @example
     * // Update many FailureEffects
     * const failureEffect = await prisma.failureEffect.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FailureEffects and only return the `id`
     * const failureEffectWithIdOnly = await prisma.failureEffect.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FailureEffectUpdateManyAndReturnArgs>(args: SelectSubset<T, FailureEffectUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FailureEffect.
     * @param {FailureEffectUpsertArgs} args - Arguments to update or create a FailureEffect.
     * @example
     * // Update or create a FailureEffect
     * const failureEffect = await prisma.failureEffect.upsert({
     *   create: {
     *     // ... data to create a FailureEffect
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FailureEffect we want to update
     *   }
     * })
     */
    upsert<T extends FailureEffectUpsertArgs>(args: SelectSubset<T, FailureEffectUpsertArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FailureEffects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureEffectCountArgs} args - Arguments to filter FailureEffects to count.
     * @example
     * // Count the number of FailureEffects
     * const count = await prisma.failureEffect.count({
     *   where: {
     *     // ... the filter for the FailureEffects we want to count
     *   }
     * })
    **/
    count<T extends FailureEffectCountArgs>(
      args?: Subset<T, FailureEffectCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FailureEffectCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FailureEffect.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureEffectAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FailureEffectAggregateArgs>(args: Subset<T, FailureEffectAggregateArgs>): Prisma.PrismaPromise<GetFailureEffectAggregateType<T>>

    /**
     * Group by FailureEffect.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureEffectGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FailureEffectGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FailureEffectGroupByArgs['orderBy'] }
        : { orderBy?: FailureEffectGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FailureEffectGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFailureEffectGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FailureEffect model
   */
  readonly fields: FailureEffectFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FailureEffect.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FailureEffectClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l1Function<T extends L1FunctionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L1FunctionDefaultArgs<ExtArgs>>): Prisma__L1FunctionClient<$Result.GetResult<Prisma.$L1FunctionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureLinks<T extends FailureEffect$failureLinksArgs<ExtArgs> = {}>(args?: Subset<T, FailureEffect$failureLinksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FailureEffect model
   */
  interface FailureEffectFieldRefs {
    readonly id: FieldRef<"FailureEffect", 'String'>
    readonly fmeaId: FieldRef<"FailureEffect", 'String'>
    readonly l1FuncId: FieldRef<"FailureEffect", 'String'>
    readonly category: FieldRef<"FailureEffect", 'String'>
    readonly effect: FieldRef<"FailureEffect", 'String'>
    readonly severity: FieldRef<"FailureEffect", 'Int'>
    readonly createdAt: FieldRef<"FailureEffect", 'DateTime'>
    readonly updatedAt: FieldRef<"FailureEffect", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FailureEffect findUnique
   */
  export type FailureEffectFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * Filter, which FailureEffect to fetch.
     */
    where: FailureEffectWhereUniqueInput
  }

  /**
   * FailureEffect findUniqueOrThrow
   */
  export type FailureEffectFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * Filter, which FailureEffect to fetch.
     */
    where: FailureEffectWhereUniqueInput
  }

  /**
   * FailureEffect findFirst
   */
  export type FailureEffectFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * Filter, which FailureEffect to fetch.
     */
    where?: FailureEffectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureEffects to fetch.
     */
    orderBy?: FailureEffectOrderByWithRelationInput | FailureEffectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureEffects.
     */
    cursor?: FailureEffectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureEffects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureEffects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureEffects.
     */
    distinct?: FailureEffectScalarFieldEnum | FailureEffectScalarFieldEnum[]
  }

  /**
   * FailureEffect findFirstOrThrow
   */
  export type FailureEffectFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * Filter, which FailureEffect to fetch.
     */
    where?: FailureEffectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureEffects to fetch.
     */
    orderBy?: FailureEffectOrderByWithRelationInput | FailureEffectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureEffects.
     */
    cursor?: FailureEffectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureEffects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureEffects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureEffects.
     */
    distinct?: FailureEffectScalarFieldEnum | FailureEffectScalarFieldEnum[]
  }

  /**
   * FailureEffect findMany
   */
  export type FailureEffectFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * Filter, which FailureEffects to fetch.
     */
    where?: FailureEffectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureEffects to fetch.
     */
    orderBy?: FailureEffectOrderByWithRelationInput | FailureEffectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FailureEffects.
     */
    cursor?: FailureEffectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureEffects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureEffects.
     */
    skip?: number
    distinct?: FailureEffectScalarFieldEnum | FailureEffectScalarFieldEnum[]
  }

  /**
   * FailureEffect create
   */
  export type FailureEffectCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * The data needed to create a FailureEffect.
     */
    data: XOR<FailureEffectCreateInput, FailureEffectUncheckedCreateInput>
  }

  /**
   * FailureEffect createMany
   */
  export type FailureEffectCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FailureEffects.
     */
    data: FailureEffectCreateManyInput | FailureEffectCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FailureEffect createManyAndReturn
   */
  export type FailureEffectCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * The data used to create many FailureEffects.
     */
    data: FailureEffectCreateManyInput | FailureEffectCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureEffect update
   */
  export type FailureEffectUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * The data needed to update a FailureEffect.
     */
    data: XOR<FailureEffectUpdateInput, FailureEffectUncheckedUpdateInput>
    /**
     * Choose, which FailureEffect to update.
     */
    where: FailureEffectWhereUniqueInput
  }

  /**
   * FailureEffect updateMany
   */
  export type FailureEffectUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FailureEffects.
     */
    data: XOR<FailureEffectUpdateManyMutationInput, FailureEffectUncheckedUpdateManyInput>
    /**
     * Filter which FailureEffects to update
     */
    where?: FailureEffectWhereInput
    /**
     * Limit how many FailureEffects to update.
     */
    limit?: number
  }

  /**
   * FailureEffect updateManyAndReturn
   */
  export type FailureEffectUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * The data used to update FailureEffects.
     */
    data: XOR<FailureEffectUpdateManyMutationInput, FailureEffectUncheckedUpdateManyInput>
    /**
     * Filter which FailureEffects to update
     */
    where?: FailureEffectWhereInput
    /**
     * Limit how many FailureEffects to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureEffect upsert
   */
  export type FailureEffectUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * The filter to search for the FailureEffect to update in case it exists.
     */
    where: FailureEffectWhereUniqueInput
    /**
     * In case the FailureEffect found by the `where` argument doesn't exist, create a new FailureEffect with this data.
     */
    create: XOR<FailureEffectCreateInput, FailureEffectUncheckedCreateInput>
    /**
     * In case the FailureEffect was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FailureEffectUpdateInput, FailureEffectUncheckedUpdateInput>
  }

  /**
   * FailureEffect delete
   */
  export type FailureEffectDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
    /**
     * Filter which FailureEffect to delete.
     */
    where: FailureEffectWhereUniqueInput
  }

  /**
   * FailureEffect deleteMany
   */
  export type FailureEffectDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureEffects to delete
     */
    where?: FailureEffectWhereInput
    /**
     * Limit how many FailureEffects to delete.
     */
    limit?: number
  }

  /**
   * FailureEffect.failureLinks
   */
  export type FailureEffect$failureLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    where?: FailureLinkWhereInput
    orderBy?: FailureLinkOrderByWithRelationInput | FailureLinkOrderByWithRelationInput[]
    cursor?: FailureLinkWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureLinkScalarFieldEnum | FailureLinkScalarFieldEnum[]
  }

  /**
   * FailureEffect without action
   */
  export type FailureEffectDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureEffect
     */
    select?: FailureEffectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureEffect
     */
    omit?: FailureEffectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureEffectInclude<ExtArgs> | null
  }


  /**
   * Model FailureMode
   */

  export type AggregateFailureMode = {
    _count: FailureModeCountAggregateOutputType | null
    _min: FailureModeMinAggregateOutputType | null
    _max: FailureModeMaxAggregateOutputType | null
  }

  export type FailureModeMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l2FuncId: string | null
    l2StructId: string | null
    productCharId: string | null
    mode: string | null
    specialChar: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureModeMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l2FuncId: string | null
    l2StructId: string | null
    productCharId: string | null
    mode: string | null
    specialChar: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureModeCountAggregateOutputType = {
    id: number
    fmeaId: number
    l2FuncId: number
    l2StructId: number
    productCharId: number
    mode: number
    specialChar: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FailureModeMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l2FuncId?: true
    l2StructId?: true
    productCharId?: true
    mode?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureModeMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l2FuncId?: true
    l2StructId?: true
    productCharId?: true
    mode?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureModeCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l2FuncId?: true
    l2StructId?: true
    productCharId?: true
    mode?: true
    specialChar?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FailureModeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureMode to aggregate.
     */
    where?: FailureModeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureModes to fetch.
     */
    orderBy?: FailureModeOrderByWithRelationInput | FailureModeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FailureModeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureModes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureModes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FailureModes
    **/
    _count?: true | FailureModeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FailureModeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FailureModeMaxAggregateInputType
  }

  export type GetFailureModeAggregateType<T extends FailureModeAggregateArgs> = {
        [P in keyof T & keyof AggregateFailureMode]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFailureMode[P]>
      : GetScalarType<T[P], AggregateFailureMode[P]>
  }




  export type FailureModeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureModeWhereInput
    orderBy?: FailureModeOrderByWithAggregationInput | FailureModeOrderByWithAggregationInput[]
    by: FailureModeScalarFieldEnum[] | FailureModeScalarFieldEnum
    having?: FailureModeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FailureModeCountAggregateInputType | true
    _min?: FailureModeMinAggregateInputType
    _max?: FailureModeMaxAggregateInputType
  }

  export type FailureModeGroupByOutputType = {
    id: string
    fmeaId: string
    l2FuncId: string
    l2StructId: string
    productCharId: string | null
    mode: string
    specialChar: boolean | null
    createdAt: Date
    updatedAt: Date
    _count: FailureModeCountAggregateOutputType | null
    _min: FailureModeMinAggregateOutputType | null
    _max: FailureModeMaxAggregateOutputType | null
  }

  type GetFailureModeGroupByPayload<T extends FailureModeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FailureModeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FailureModeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FailureModeGroupByOutputType[P]>
            : GetScalarType<T[P], FailureModeGroupByOutputType[P]>
        }
      >
    >


  export type FailureModeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l2FuncId?: boolean
    l2StructId?: boolean
    productCharId?: boolean
    mode?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Function?: boolean | L2FunctionDefaultArgs<ExtArgs>
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
    failureLinks?: boolean | FailureMode$failureLinksArgs<ExtArgs>
    _count?: boolean | FailureModeCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureMode"]>

  export type FailureModeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l2FuncId?: boolean
    l2StructId?: boolean
    productCharId?: boolean
    mode?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Function?: boolean | L2FunctionDefaultArgs<ExtArgs>
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureMode"]>

  export type FailureModeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l2FuncId?: boolean
    l2StructId?: boolean
    productCharId?: boolean
    mode?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l2Function?: boolean | L2FunctionDefaultArgs<ExtArgs>
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureMode"]>

  export type FailureModeSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l2FuncId?: boolean
    l2StructId?: boolean
    productCharId?: boolean
    mode?: boolean
    specialChar?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FailureModeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l2FuncId" | "l2StructId" | "productCharId" | "mode" | "specialChar" | "createdAt" | "updatedAt", ExtArgs["result"]["failureMode"]>
  export type FailureModeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Function?: boolean | L2FunctionDefaultArgs<ExtArgs>
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
    failureLinks?: boolean | FailureMode$failureLinksArgs<ExtArgs>
    _count?: boolean | FailureModeCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FailureModeIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Function?: boolean | L2FunctionDefaultArgs<ExtArgs>
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }
  export type FailureModeIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l2Function?: boolean | L2FunctionDefaultArgs<ExtArgs>
    l2Structure?: boolean | L2StructureDefaultArgs<ExtArgs>
  }

  export type $FailureModePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FailureMode"
    objects: {
      l2Function: Prisma.$L2FunctionPayload<ExtArgs>
      l2Structure: Prisma.$L2StructurePayload<ExtArgs>
      failureLinks: Prisma.$FailureLinkPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l2FuncId: string
      l2StructId: string
      productCharId: string | null
      mode: string
      specialChar: boolean | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["failureMode"]>
    composites: {}
  }

  type FailureModeGetPayload<S extends boolean | null | undefined | FailureModeDefaultArgs> = $Result.GetResult<Prisma.$FailureModePayload, S>

  type FailureModeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FailureModeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FailureModeCountAggregateInputType | true
    }

  export interface FailureModeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FailureMode'], meta: { name: 'FailureMode' } }
    /**
     * Find zero or one FailureMode that matches the filter.
     * @param {FailureModeFindUniqueArgs} args - Arguments to find a FailureMode
     * @example
     * // Get one FailureMode
     * const failureMode = await prisma.failureMode.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FailureModeFindUniqueArgs>(args: SelectSubset<T, FailureModeFindUniqueArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FailureMode that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FailureModeFindUniqueOrThrowArgs} args - Arguments to find a FailureMode
     * @example
     * // Get one FailureMode
     * const failureMode = await prisma.failureMode.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FailureModeFindUniqueOrThrowArgs>(args: SelectSubset<T, FailureModeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureMode that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureModeFindFirstArgs} args - Arguments to find a FailureMode
     * @example
     * // Get one FailureMode
     * const failureMode = await prisma.failureMode.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FailureModeFindFirstArgs>(args?: SelectSubset<T, FailureModeFindFirstArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureMode that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureModeFindFirstOrThrowArgs} args - Arguments to find a FailureMode
     * @example
     * // Get one FailureMode
     * const failureMode = await prisma.failureMode.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FailureModeFindFirstOrThrowArgs>(args?: SelectSubset<T, FailureModeFindFirstOrThrowArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FailureModes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureModeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FailureModes
     * const failureModes = await prisma.failureMode.findMany()
     * 
     * // Get first 10 FailureModes
     * const failureModes = await prisma.failureMode.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const failureModeWithIdOnly = await prisma.failureMode.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FailureModeFindManyArgs>(args?: SelectSubset<T, FailureModeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FailureMode.
     * @param {FailureModeCreateArgs} args - Arguments to create a FailureMode.
     * @example
     * // Create one FailureMode
     * const FailureMode = await prisma.failureMode.create({
     *   data: {
     *     // ... data to create a FailureMode
     *   }
     * })
     * 
     */
    create<T extends FailureModeCreateArgs>(args: SelectSubset<T, FailureModeCreateArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FailureModes.
     * @param {FailureModeCreateManyArgs} args - Arguments to create many FailureModes.
     * @example
     * // Create many FailureModes
     * const failureMode = await prisma.failureMode.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FailureModeCreateManyArgs>(args?: SelectSubset<T, FailureModeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FailureModes and returns the data saved in the database.
     * @param {FailureModeCreateManyAndReturnArgs} args - Arguments to create many FailureModes.
     * @example
     * // Create many FailureModes
     * const failureMode = await prisma.failureMode.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FailureModes and only return the `id`
     * const failureModeWithIdOnly = await prisma.failureMode.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FailureModeCreateManyAndReturnArgs>(args?: SelectSubset<T, FailureModeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FailureMode.
     * @param {FailureModeDeleteArgs} args - Arguments to delete one FailureMode.
     * @example
     * // Delete one FailureMode
     * const FailureMode = await prisma.failureMode.delete({
     *   where: {
     *     // ... filter to delete one FailureMode
     *   }
     * })
     * 
     */
    delete<T extends FailureModeDeleteArgs>(args: SelectSubset<T, FailureModeDeleteArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FailureMode.
     * @param {FailureModeUpdateArgs} args - Arguments to update one FailureMode.
     * @example
     * // Update one FailureMode
     * const failureMode = await prisma.failureMode.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FailureModeUpdateArgs>(args: SelectSubset<T, FailureModeUpdateArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FailureModes.
     * @param {FailureModeDeleteManyArgs} args - Arguments to filter FailureModes to delete.
     * @example
     * // Delete a few FailureModes
     * const { count } = await prisma.failureMode.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FailureModeDeleteManyArgs>(args?: SelectSubset<T, FailureModeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureModes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureModeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FailureModes
     * const failureMode = await prisma.failureMode.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FailureModeUpdateManyArgs>(args: SelectSubset<T, FailureModeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureModes and returns the data updated in the database.
     * @param {FailureModeUpdateManyAndReturnArgs} args - Arguments to update many FailureModes.
     * @example
     * // Update many FailureModes
     * const failureMode = await prisma.failureMode.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FailureModes and only return the `id`
     * const failureModeWithIdOnly = await prisma.failureMode.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FailureModeUpdateManyAndReturnArgs>(args: SelectSubset<T, FailureModeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FailureMode.
     * @param {FailureModeUpsertArgs} args - Arguments to update or create a FailureMode.
     * @example
     * // Update or create a FailureMode
     * const failureMode = await prisma.failureMode.upsert({
     *   create: {
     *     // ... data to create a FailureMode
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FailureMode we want to update
     *   }
     * })
     */
    upsert<T extends FailureModeUpsertArgs>(args: SelectSubset<T, FailureModeUpsertArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FailureModes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureModeCountArgs} args - Arguments to filter FailureModes to count.
     * @example
     * // Count the number of FailureModes
     * const count = await prisma.failureMode.count({
     *   where: {
     *     // ... the filter for the FailureModes we want to count
     *   }
     * })
    **/
    count<T extends FailureModeCountArgs>(
      args?: Subset<T, FailureModeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FailureModeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FailureMode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureModeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FailureModeAggregateArgs>(args: Subset<T, FailureModeAggregateArgs>): Prisma.PrismaPromise<GetFailureModeAggregateType<T>>

    /**
     * Group by FailureMode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureModeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FailureModeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FailureModeGroupByArgs['orderBy'] }
        : { orderBy?: FailureModeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FailureModeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFailureModeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FailureMode model
   */
  readonly fields: FailureModeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FailureMode.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FailureModeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l2Function<T extends L2FunctionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L2FunctionDefaultArgs<ExtArgs>>): Prisma__L2FunctionClient<$Result.GetResult<Prisma.$L2FunctionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    l2Structure<T extends L2StructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L2StructureDefaultArgs<ExtArgs>>): Prisma__L2StructureClient<$Result.GetResult<Prisma.$L2StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureLinks<T extends FailureMode$failureLinksArgs<ExtArgs> = {}>(args?: Subset<T, FailureMode$failureLinksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FailureMode model
   */
  interface FailureModeFieldRefs {
    readonly id: FieldRef<"FailureMode", 'String'>
    readonly fmeaId: FieldRef<"FailureMode", 'String'>
    readonly l2FuncId: FieldRef<"FailureMode", 'String'>
    readonly l2StructId: FieldRef<"FailureMode", 'String'>
    readonly productCharId: FieldRef<"FailureMode", 'String'>
    readonly mode: FieldRef<"FailureMode", 'String'>
    readonly specialChar: FieldRef<"FailureMode", 'Boolean'>
    readonly createdAt: FieldRef<"FailureMode", 'DateTime'>
    readonly updatedAt: FieldRef<"FailureMode", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FailureMode findUnique
   */
  export type FailureModeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * Filter, which FailureMode to fetch.
     */
    where: FailureModeWhereUniqueInput
  }

  /**
   * FailureMode findUniqueOrThrow
   */
  export type FailureModeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * Filter, which FailureMode to fetch.
     */
    where: FailureModeWhereUniqueInput
  }

  /**
   * FailureMode findFirst
   */
  export type FailureModeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * Filter, which FailureMode to fetch.
     */
    where?: FailureModeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureModes to fetch.
     */
    orderBy?: FailureModeOrderByWithRelationInput | FailureModeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureModes.
     */
    cursor?: FailureModeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureModes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureModes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureModes.
     */
    distinct?: FailureModeScalarFieldEnum | FailureModeScalarFieldEnum[]
  }

  /**
   * FailureMode findFirstOrThrow
   */
  export type FailureModeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * Filter, which FailureMode to fetch.
     */
    where?: FailureModeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureModes to fetch.
     */
    orderBy?: FailureModeOrderByWithRelationInput | FailureModeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureModes.
     */
    cursor?: FailureModeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureModes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureModes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureModes.
     */
    distinct?: FailureModeScalarFieldEnum | FailureModeScalarFieldEnum[]
  }

  /**
   * FailureMode findMany
   */
  export type FailureModeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * Filter, which FailureModes to fetch.
     */
    where?: FailureModeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureModes to fetch.
     */
    orderBy?: FailureModeOrderByWithRelationInput | FailureModeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FailureModes.
     */
    cursor?: FailureModeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureModes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureModes.
     */
    skip?: number
    distinct?: FailureModeScalarFieldEnum | FailureModeScalarFieldEnum[]
  }

  /**
   * FailureMode create
   */
  export type FailureModeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * The data needed to create a FailureMode.
     */
    data: XOR<FailureModeCreateInput, FailureModeUncheckedCreateInput>
  }

  /**
   * FailureMode createMany
   */
  export type FailureModeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FailureModes.
     */
    data: FailureModeCreateManyInput | FailureModeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FailureMode createManyAndReturn
   */
  export type FailureModeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * The data used to create many FailureModes.
     */
    data: FailureModeCreateManyInput | FailureModeCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureMode update
   */
  export type FailureModeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * The data needed to update a FailureMode.
     */
    data: XOR<FailureModeUpdateInput, FailureModeUncheckedUpdateInput>
    /**
     * Choose, which FailureMode to update.
     */
    where: FailureModeWhereUniqueInput
  }

  /**
   * FailureMode updateMany
   */
  export type FailureModeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FailureModes.
     */
    data: XOR<FailureModeUpdateManyMutationInput, FailureModeUncheckedUpdateManyInput>
    /**
     * Filter which FailureModes to update
     */
    where?: FailureModeWhereInput
    /**
     * Limit how many FailureModes to update.
     */
    limit?: number
  }

  /**
   * FailureMode updateManyAndReturn
   */
  export type FailureModeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * The data used to update FailureModes.
     */
    data: XOR<FailureModeUpdateManyMutationInput, FailureModeUncheckedUpdateManyInput>
    /**
     * Filter which FailureModes to update
     */
    where?: FailureModeWhereInput
    /**
     * Limit how many FailureModes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureMode upsert
   */
  export type FailureModeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * The filter to search for the FailureMode to update in case it exists.
     */
    where: FailureModeWhereUniqueInput
    /**
     * In case the FailureMode found by the `where` argument doesn't exist, create a new FailureMode with this data.
     */
    create: XOR<FailureModeCreateInput, FailureModeUncheckedCreateInput>
    /**
     * In case the FailureMode was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FailureModeUpdateInput, FailureModeUncheckedUpdateInput>
  }

  /**
   * FailureMode delete
   */
  export type FailureModeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
    /**
     * Filter which FailureMode to delete.
     */
    where: FailureModeWhereUniqueInput
  }

  /**
   * FailureMode deleteMany
   */
  export type FailureModeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureModes to delete
     */
    where?: FailureModeWhereInput
    /**
     * Limit how many FailureModes to delete.
     */
    limit?: number
  }

  /**
   * FailureMode.failureLinks
   */
  export type FailureMode$failureLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    where?: FailureLinkWhereInput
    orderBy?: FailureLinkOrderByWithRelationInput | FailureLinkOrderByWithRelationInput[]
    cursor?: FailureLinkWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureLinkScalarFieldEnum | FailureLinkScalarFieldEnum[]
  }

  /**
   * FailureMode without action
   */
  export type FailureModeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureMode
     */
    select?: FailureModeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureMode
     */
    omit?: FailureModeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureModeInclude<ExtArgs> | null
  }


  /**
   * Model FailureCause
   */

  export type AggregateFailureCause = {
    _count: FailureCauseCountAggregateOutputType | null
    _avg: FailureCauseAvgAggregateOutputType | null
    _sum: FailureCauseSumAggregateOutputType | null
    _min: FailureCauseMinAggregateOutputType | null
    _max: FailureCauseMaxAggregateOutputType | null
  }

  export type FailureCauseAvgAggregateOutputType = {
    occurrence: number | null
  }

  export type FailureCauseSumAggregateOutputType = {
    occurrence: number | null
  }

  export type FailureCauseMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l3FuncId: string | null
    l3StructId: string | null
    l2StructId: string | null
    cause: string | null
    occurrence: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureCauseMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    l3FuncId: string | null
    l3StructId: string | null
    l2StructId: string | null
    cause: string | null
    occurrence: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureCauseCountAggregateOutputType = {
    id: number
    fmeaId: number
    l3FuncId: number
    l3StructId: number
    l2StructId: number
    cause: number
    occurrence: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FailureCauseAvgAggregateInputType = {
    occurrence?: true
  }

  export type FailureCauseSumAggregateInputType = {
    occurrence?: true
  }

  export type FailureCauseMinAggregateInputType = {
    id?: true
    fmeaId?: true
    l3FuncId?: true
    l3StructId?: true
    l2StructId?: true
    cause?: true
    occurrence?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureCauseMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    l3FuncId?: true
    l3StructId?: true
    l2StructId?: true
    cause?: true
    occurrence?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureCauseCountAggregateInputType = {
    id?: true
    fmeaId?: true
    l3FuncId?: true
    l3StructId?: true
    l2StructId?: true
    cause?: true
    occurrence?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FailureCauseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureCause to aggregate.
     */
    where?: FailureCauseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureCauses to fetch.
     */
    orderBy?: FailureCauseOrderByWithRelationInput | FailureCauseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FailureCauseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureCauses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureCauses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FailureCauses
    **/
    _count?: true | FailureCauseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FailureCauseAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FailureCauseSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FailureCauseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FailureCauseMaxAggregateInputType
  }

  export type GetFailureCauseAggregateType<T extends FailureCauseAggregateArgs> = {
        [P in keyof T & keyof AggregateFailureCause]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFailureCause[P]>
      : GetScalarType<T[P], AggregateFailureCause[P]>
  }




  export type FailureCauseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureCauseWhereInput
    orderBy?: FailureCauseOrderByWithAggregationInput | FailureCauseOrderByWithAggregationInput[]
    by: FailureCauseScalarFieldEnum[] | FailureCauseScalarFieldEnum
    having?: FailureCauseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FailureCauseCountAggregateInputType | true
    _avg?: FailureCauseAvgAggregateInputType
    _sum?: FailureCauseSumAggregateInputType
    _min?: FailureCauseMinAggregateInputType
    _max?: FailureCauseMaxAggregateInputType
  }

  export type FailureCauseGroupByOutputType = {
    id: string
    fmeaId: string
    l3FuncId: string
    l3StructId: string
    l2StructId: string
    cause: string
    occurrence: number | null
    createdAt: Date
    updatedAt: Date
    _count: FailureCauseCountAggregateOutputType | null
    _avg: FailureCauseAvgAggregateOutputType | null
    _sum: FailureCauseSumAggregateOutputType | null
    _min: FailureCauseMinAggregateOutputType | null
    _max: FailureCauseMaxAggregateOutputType | null
  }

  type GetFailureCauseGroupByPayload<T extends FailureCauseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FailureCauseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FailureCauseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FailureCauseGroupByOutputType[P]>
            : GetScalarType<T[P], FailureCauseGroupByOutputType[P]>
        }
      >
    >


  export type FailureCauseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l3FuncId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    cause?: boolean
    occurrence?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l3Function?: boolean | L3FunctionDefaultArgs<ExtArgs>
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
    failureLinks?: boolean | FailureCause$failureLinksArgs<ExtArgs>
    _count?: boolean | FailureCauseCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureCause"]>

  export type FailureCauseSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l3FuncId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    cause?: boolean
    occurrence?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l3Function?: boolean | L3FunctionDefaultArgs<ExtArgs>
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureCause"]>

  export type FailureCauseSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    l3FuncId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    cause?: boolean
    occurrence?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    l3Function?: boolean | L3FunctionDefaultArgs<ExtArgs>
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureCause"]>

  export type FailureCauseSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    l3FuncId?: boolean
    l3StructId?: boolean
    l2StructId?: boolean
    cause?: boolean
    occurrence?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FailureCauseOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "l3FuncId" | "l3StructId" | "l2StructId" | "cause" | "occurrence" | "createdAt" | "updatedAt", ExtArgs["result"]["failureCause"]>
  export type FailureCauseInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Function?: boolean | L3FunctionDefaultArgs<ExtArgs>
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
    failureLinks?: boolean | FailureCause$failureLinksArgs<ExtArgs>
    _count?: boolean | FailureCauseCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FailureCauseIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Function?: boolean | L3FunctionDefaultArgs<ExtArgs>
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }
  export type FailureCauseIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    l3Function?: boolean | L3FunctionDefaultArgs<ExtArgs>
    l3Structure?: boolean | L3StructureDefaultArgs<ExtArgs>
  }

  export type $FailureCausePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FailureCause"
    objects: {
      l3Function: Prisma.$L3FunctionPayload<ExtArgs>
      l3Structure: Prisma.$L3StructurePayload<ExtArgs>
      failureLinks: Prisma.$FailureLinkPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      l3FuncId: string
      l3StructId: string
      l2StructId: string
      cause: string
      occurrence: number | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["failureCause"]>
    composites: {}
  }

  type FailureCauseGetPayload<S extends boolean | null | undefined | FailureCauseDefaultArgs> = $Result.GetResult<Prisma.$FailureCausePayload, S>

  type FailureCauseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FailureCauseFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FailureCauseCountAggregateInputType | true
    }

  export interface FailureCauseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FailureCause'], meta: { name: 'FailureCause' } }
    /**
     * Find zero or one FailureCause that matches the filter.
     * @param {FailureCauseFindUniqueArgs} args - Arguments to find a FailureCause
     * @example
     * // Get one FailureCause
     * const failureCause = await prisma.failureCause.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FailureCauseFindUniqueArgs>(args: SelectSubset<T, FailureCauseFindUniqueArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FailureCause that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FailureCauseFindUniqueOrThrowArgs} args - Arguments to find a FailureCause
     * @example
     * // Get one FailureCause
     * const failureCause = await prisma.failureCause.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FailureCauseFindUniqueOrThrowArgs>(args: SelectSubset<T, FailureCauseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureCause that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureCauseFindFirstArgs} args - Arguments to find a FailureCause
     * @example
     * // Get one FailureCause
     * const failureCause = await prisma.failureCause.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FailureCauseFindFirstArgs>(args?: SelectSubset<T, FailureCauseFindFirstArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureCause that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureCauseFindFirstOrThrowArgs} args - Arguments to find a FailureCause
     * @example
     * // Get one FailureCause
     * const failureCause = await prisma.failureCause.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FailureCauseFindFirstOrThrowArgs>(args?: SelectSubset<T, FailureCauseFindFirstOrThrowArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FailureCauses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureCauseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FailureCauses
     * const failureCauses = await prisma.failureCause.findMany()
     * 
     * // Get first 10 FailureCauses
     * const failureCauses = await prisma.failureCause.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const failureCauseWithIdOnly = await prisma.failureCause.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FailureCauseFindManyArgs>(args?: SelectSubset<T, FailureCauseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FailureCause.
     * @param {FailureCauseCreateArgs} args - Arguments to create a FailureCause.
     * @example
     * // Create one FailureCause
     * const FailureCause = await prisma.failureCause.create({
     *   data: {
     *     // ... data to create a FailureCause
     *   }
     * })
     * 
     */
    create<T extends FailureCauseCreateArgs>(args: SelectSubset<T, FailureCauseCreateArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FailureCauses.
     * @param {FailureCauseCreateManyArgs} args - Arguments to create many FailureCauses.
     * @example
     * // Create many FailureCauses
     * const failureCause = await prisma.failureCause.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FailureCauseCreateManyArgs>(args?: SelectSubset<T, FailureCauseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FailureCauses and returns the data saved in the database.
     * @param {FailureCauseCreateManyAndReturnArgs} args - Arguments to create many FailureCauses.
     * @example
     * // Create many FailureCauses
     * const failureCause = await prisma.failureCause.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FailureCauses and only return the `id`
     * const failureCauseWithIdOnly = await prisma.failureCause.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FailureCauseCreateManyAndReturnArgs>(args?: SelectSubset<T, FailureCauseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FailureCause.
     * @param {FailureCauseDeleteArgs} args - Arguments to delete one FailureCause.
     * @example
     * // Delete one FailureCause
     * const FailureCause = await prisma.failureCause.delete({
     *   where: {
     *     // ... filter to delete one FailureCause
     *   }
     * })
     * 
     */
    delete<T extends FailureCauseDeleteArgs>(args: SelectSubset<T, FailureCauseDeleteArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FailureCause.
     * @param {FailureCauseUpdateArgs} args - Arguments to update one FailureCause.
     * @example
     * // Update one FailureCause
     * const failureCause = await prisma.failureCause.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FailureCauseUpdateArgs>(args: SelectSubset<T, FailureCauseUpdateArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FailureCauses.
     * @param {FailureCauseDeleteManyArgs} args - Arguments to filter FailureCauses to delete.
     * @example
     * // Delete a few FailureCauses
     * const { count } = await prisma.failureCause.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FailureCauseDeleteManyArgs>(args?: SelectSubset<T, FailureCauseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureCauses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureCauseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FailureCauses
     * const failureCause = await prisma.failureCause.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FailureCauseUpdateManyArgs>(args: SelectSubset<T, FailureCauseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureCauses and returns the data updated in the database.
     * @param {FailureCauseUpdateManyAndReturnArgs} args - Arguments to update many FailureCauses.
     * @example
     * // Update many FailureCauses
     * const failureCause = await prisma.failureCause.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FailureCauses and only return the `id`
     * const failureCauseWithIdOnly = await prisma.failureCause.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FailureCauseUpdateManyAndReturnArgs>(args: SelectSubset<T, FailureCauseUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FailureCause.
     * @param {FailureCauseUpsertArgs} args - Arguments to update or create a FailureCause.
     * @example
     * // Update or create a FailureCause
     * const failureCause = await prisma.failureCause.upsert({
     *   create: {
     *     // ... data to create a FailureCause
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FailureCause we want to update
     *   }
     * })
     */
    upsert<T extends FailureCauseUpsertArgs>(args: SelectSubset<T, FailureCauseUpsertArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FailureCauses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureCauseCountArgs} args - Arguments to filter FailureCauses to count.
     * @example
     * // Count the number of FailureCauses
     * const count = await prisma.failureCause.count({
     *   where: {
     *     // ... the filter for the FailureCauses we want to count
     *   }
     * })
    **/
    count<T extends FailureCauseCountArgs>(
      args?: Subset<T, FailureCauseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FailureCauseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FailureCause.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureCauseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FailureCauseAggregateArgs>(args: Subset<T, FailureCauseAggregateArgs>): Prisma.PrismaPromise<GetFailureCauseAggregateType<T>>

    /**
     * Group by FailureCause.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureCauseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FailureCauseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FailureCauseGroupByArgs['orderBy'] }
        : { orderBy?: FailureCauseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FailureCauseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFailureCauseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FailureCause model
   */
  readonly fields: FailureCauseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FailureCause.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FailureCauseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    l3Function<T extends L3FunctionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L3FunctionDefaultArgs<ExtArgs>>): Prisma__L3FunctionClient<$Result.GetResult<Prisma.$L3FunctionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    l3Structure<T extends L3StructureDefaultArgs<ExtArgs> = {}>(args?: Subset<T, L3StructureDefaultArgs<ExtArgs>>): Prisma__L3StructureClient<$Result.GetResult<Prisma.$L3StructurePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureLinks<T extends FailureCause$failureLinksArgs<ExtArgs> = {}>(args?: Subset<T, FailureCause$failureLinksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FailureCause model
   */
  interface FailureCauseFieldRefs {
    readonly id: FieldRef<"FailureCause", 'String'>
    readonly fmeaId: FieldRef<"FailureCause", 'String'>
    readonly l3FuncId: FieldRef<"FailureCause", 'String'>
    readonly l3StructId: FieldRef<"FailureCause", 'String'>
    readonly l2StructId: FieldRef<"FailureCause", 'String'>
    readonly cause: FieldRef<"FailureCause", 'String'>
    readonly occurrence: FieldRef<"FailureCause", 'Int'>
    readonly createdAt: FieldRef<"FailureCause", 'DateTime'>
    readonly updatedAt: FieldRef<"FailureCause", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FailureCause findUnique
   */
  export type FailureCauseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * Filter, which FailureCause to fetch.
     */
    where: FailureCauseWhereUniqueInput
  }

  /**
   * FailureCause findUniqueOrThrow
   */
  export type FailureCauseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * Filter, which FailureCause to fetch.
     */
    where: FailureCauseWhereUniqueInput
  }

  /**
   * FailureCause findFirst
   */
  export type FailureCauseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * Filter, which FailureCause to fetch.
     */
    where?: FailureCauseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureCauses to fetch.
     */
    orderBy?: FailureCauseOrderByWithRelationInput | FailureCauseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureCauses.
     */
    cursor?: FailureCauseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureCauses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureCauses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureCauses.
     */
    distinct?: FailureCauseScalarFieldEnum | FailureCauseScalarFieldEnum[]
  }

  /**
   * FailureCause findFirstOrThrow
   */
  export type FailureCauseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * Filter, which FailureCause to fetch.
     */
    where?: FailureCauseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureCauses to fetch.
     */
    orderBy?: FailureCauseOrderByWithRelationInput | FailureCauseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureCauses.
     */
    cursor?: FailureCauseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureCauses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureCauses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureCauses.
     */
    distinct?: FailureCauseScalarFieldEnum | FailureCauseScalarFieldEnum[]
  }

  /**
   * FailureCause findMany
   */
  export type FailureCauseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * Filter, which FailureCauses to fetch.
     */
    where?: FailureCauseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureCauses to fetch.
     */
    orderBy?: FailureCauseOrderByWithRelationInput | FailureCauseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FailureCauses.
     */
    cursor?: FailureCauseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureCauses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureCauses.
     */
    skip?: number
    distinct?: FailureCauseScalarFieldEnum | FailureCauseScalarFieldEnum[]
  }

  /**
   * FailureCause create
   */
  export type FailureCauseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * The data needed to create a FailureCause.
     */
    data: XOR<FailureCauseCreateInput, FailureCauseUncheckedCreateInput>
  }

  /**
   * FailureCause createMany
   */
  export type FailureCauseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FailureCauses.
     */
    data: FailureCauseCreateManyInput | FailureCauseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FailureCause createManyAndReturn
   */
  export type FailureCauseCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * The data used to create many FailureCauses.
     */
    data: FailureCauseCreateManyInput | FailureCauseCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureCause update
   */
  export type FailureCauseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * The data needed to update a FailureCause.
     */
    data: XOR<FailureCauseUpdateInput, FailureCauseUncheckedUpdateInput>
    /**
     * Choose, which FailureCause to update.
     */
    where: FailureCauseWhereUniqueInput
  }

  /**
   * FailureCause updateMany
   */
  export type FailureCauseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FailureCauses.
     */
    data: XOR<FailureCauseUpdateManyMutationInput, FailureCauseUncheckedUpdateManyInput>
    /**
     * Filter which FailureCauses to update
     */
    where?: FailureCauseWhereInput
    /**
     * Limit how many FailureCauses to update.
     */
    limit?: number
  }

  /**
   * FailureCause updateManyAndReturn
   */
  export type FailureCauseUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * The data used to update FailureCauses.
     */
    data: XOR<FailureCauseUpdateManyMutationInput, FailureCauseUncheckedUpdateManyInput>
    /**
     * Filter which FailureCauses to update
     */
    where?: FailureCauseWhereInput
    /**
     * Limit how many FailureCauses to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureCause upsert
   */
  export type FailureCauseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * The filter to search for the FailureCause to update in case it exists.
     */
    where: FailureCauseWhereUniqueInput
    /**
     * In case the FailureCause found by the `where` argument doesn't exist, create a new FailureCause with this data.
     */
    create: XOR<FailureCauseCreateInput, FailureCauseUncheckedCreateInput>
    /**
     * In case the FailureCause was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FailureCauseUpdateInput, FailureCauseUncheckedUpdateInput>
  }

  /**
   * FailureCause delete
   */
  export type FailureCauseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
    /**
     * Filter which FailureCause to delete.
     */
    where: FailureCauseWhereUniqueInput
  }

  /**
   * FailureCause deleteMany
   */
  export type FailureCauseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureCauses to delete
     */
    where?: FailureCauseWhereInput
    /**
     * Limit how many FailureCauses to delete.
     */
    limit?: number
  }

  /**
   * FailureCause.failureLinks
   */
  export type FailureCause$failureLinksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    where?: FailureLinkWhereInput
    orderBy?: FailureLinkOrderByWithRelationInput | FailureLinkOrderByWithRelationInput[]
    cursor?: FailureLinkWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FailureLinkScalarFieldEnum | FailureLinkScalarFieldEnum[]
  }

  /**
   * FailureCause without action
   */
  export type FailureCauseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureCause
     */
    select?: FailureCauseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureCause
     */
    omit?: FailureCauseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureCauseInclude<ExtArgs> | null
  }


  /**
   * Model FailureLink
   */

  export type AggregateFailureLink = {
    _count: FailureLinkCountAggregateOutputType | null
    _min: FailureLinkMinAggregateOutputType | null
    _max: FailureLinkMaxAggregateOutputType | null
  }

  export type FailureLinkMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    fmId: string | null
    feId: string | null
    fcId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureLinkMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    fmId: string | null
    feId: string | null
    fcId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FailureLinkCountAggregateOutputType = {
    id: number
    fmeaId: number
    fmId: number
    feId: number
    fcId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FailureLinkMinAggregateInputType = {
    id?: true
    fmeaId?: true
    fmId?: true
    feId?: true
    fcId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureLinkMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    fmId?: true
    feId?: true
    fcId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FailureLinkCountAggregateInputType = {
    id?: true
    fmeaId?: true
    fmId?: true
    feId?: true
    fcId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FailureLinkAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureLink to aggregate.
     */
    where?: FailureLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureLinks to fetch.
     */
    orderBy?: FailureLinkOrderByWithRelationInput | FailureLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FailureLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureLinks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FailureLinks
    **/
    _count?: true | FailureLinkCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FailureLinkMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FailureLinkMaxAggregateInputType
  }

  export type GetFailureLinkAggregateType<T extends FailureLinkAggregateArgs> = {
        [P in keyof T & keyof AggregateFailureLink]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFailureLink[P]>
      : GetScalarType<T[P], AggregateFailureLink[P]>
  }




  export type FailureLinkGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FailureLinkWhereInput
    orderBy?: FailureLinkOrderByWithAggregationInput | FailureLinkOrderByWithAggregationInput[]
    by: FailureLinkScalarFieldEnum[] | FailureLinkScalarFieldEnum
    having?: FailureLinkScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FailureLinkCountAggregateInputType | true
    _min?: FailureLinkMinAggregateInputType
    _max?: FailureLinkMaxAggregateInputType
  }

  export type FailureLinkGroupByOutputType = {
    id: string
    fmeaId: string
    fmId: string
    feId: string
    fcId: string
    createdAt: Date
    updatedAt: Date
    _count: FailureLinkCountAggregateOutputType | null
    _min: FailureLinkMinAggregateOutputType | null
    _max: FailureLinkMaxAggregateOutputType | null
  }

  type GetFailureLinkGroupByPayload<T extends FailureLinkGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FailureLinkGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FailureLinkGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FailureLinkGroupByOutputType[P]>
            : GetScalarType<T[P], FailureLinkGroupByOutputType[P]>
        }
      >
    >


  export type FailureLinkSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    fmId?: boolean
    feId?: boolean
    fcId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    failureMode?: boolean | FailureModeDefaultArgs<ExtArgs>
    failureEffect?: boolean | FailureEffectDefaultArgs<ExtArgs>
    failureCause?: boolean | FailureCauseDefaultArgs<ExtArgs>
    riskAnalyses?: boolean | FailureLink$riskAnalysesArgs<ExtArgs>
    _count?: boolean | FailureLinkCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureLink"]>

  export type FailureLinkSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    fmId?: boolean
    feId?: boolean
    fcId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    failureMode?: boolean | FailureModeDefaultArgs<ExtArgs>
    failureEffect?: boolean | FailureEffectDefaultArgs<ExtArgs>
    failureCause?: boolean | FailureCauseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureLink"]>

  export type FailureLinkSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    fmId?: boolean
    feId?: boolean
    fcId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    failureMode?: boolean | FailureModeDefaultArgs<ExtArgs>
    failureEffect?: boolean | FailureEffectDefaultArgs<ExtArgs>
    failureCause?: boolean | FailureCauseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["failureLink"]>

  export type FailureLinkSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    fmId?: boolean
    feId?: boolean
    fcId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FailureLinkOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "fmId" | "feId" | "fcId" | "createdAt" | "updatedAt", ExtArgs["result"]["failureLink"]>
  export type FailureLinkInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureMode?: boolean | FailureModeDefaultArgs<ExtArgs>
    failureEffect?: boolean | FailureEffectDefaultArgs<ExtArgs>
    failureCause?: boolean | FailureCauseDefaultArgs<ExtArgs>
    riskAnalyses?: boolean | FailureLink$riskAnalysesArgs<ExtArgs>
    _count?: boolean | FailureLinkCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FailureLinkIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureMode?: boolean | FailureModeDefaultArgs<ExtArgs>
    failureEffect?: boolean | FailureEffectDefaultArgs<ExtArgs>
    failureCause?: boolean | FailureCauseDefaultArgs<ExtArgs>
  }
  export type FailureLinkIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureMode?: boolean | FailureModeDefaultArgs<ExtArgs>
    failureEffect?: boolean | FailureEffectDefaultArgs<ExtArgs>
    failureCause?: boolean | FailureCauseDefaultArgs<ExtArgs>
  }

  export type $FailureLinkPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FailureLink"
    objects: {
      failureMode: Prisma.$FailureModePayload<ExtArgs>
      failureEffect: Prisma.$FailureEffectPayload<ExtArgs>
      failureCause: Prisma.$FailureCausePayload<ExtArgs>
      riskAnalyses: Prisma.$RiskAnalysisPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      fmId: string
      feId: string
      fcId: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["failureLink"]>
    composites: {}
  }

  type FailureLinkGetPayload<S extends boolean | null | undefined | FailureLinkDefaultArgs> = $Result.GetResult<Prisma.$FailureLinkPayload, S>

  type FailureLinkCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FailureLinkFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FailureLinkCountAggregateInputType | true
    }

  export interface FailureLinkDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FailureLink'], meta: { name: 'FailureLink' } }
    /**
     * Find zero or one FailureLink that matches the filter.
     * @param {FailureLinkFindUniqueArgs} args - Arguments to find a FailureLink
     * @example
     * // Get one FailureLink
     * const failureLink = await prisma.failureLink.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FailureLinkFindUniqueArgs>(args: SelectSubset<T, FailureLinkFindUniqueArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FailureLink that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FailureLinkFindUniqueOrThrowArgs} args - Arguments to find a FailureLink
     * @example
     * // Get one FailureLink
     * const failureLink = await prisma.failureLink.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FailureLinkFindUniqueOrThrowArgs>(args: SelectSubset<T, FailureLinkFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureLink that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureLinkFindFirstArgs} args - Arguments to find a FailureLink
     * @example
     * // Get one FailureLink
     * const failureLink = await prisma.failureLink.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FailureLinkFindFirstArgs>(args?: SelectSubset<T, FailureLinkFindFirstArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FailureLink that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureLinkFindFirstOrThrowArgs} args - Arguments to find a FailureLink
     * @example
     * // Get one FailureLink
     * const failureLink = await prisma.failureLink.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FailureLinkFindFirstOrThrowArgs>(args?: SelectSubset<T, FailureLinkFindFirstOrThrowArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FailureLinks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureLinkFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FailureLinks
     * const failureLinks = await prisma.failureLink.findMany()
     * 
     * // Get first 10 FailureLinks
     * const failureLinks = await prisma.failureLink.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const failureLinkWithIdOnly = await prisma.failureLink.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FailureLinkFindManyArgs>(args?: SelectSubset<T, FailureLinkFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FailureLink.
     * @param {FailureLinkCreateArgs} args - Arguments to create a FailureLink.
     * @example
     * // Create one FailureLink
     * const FailureLink = await prisma.failureLink.create({
     *   data: {
     *     // ... data to create a FailureLink
     *   }
     * })
     * 
     */
    create<T extends FailureLinkCreateArgs>(args: SelectSubset<T, FailureLinkCreateArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FailureLinks.
     * @param {FailureLinkCreateManyArgs} args - Arguments to create many FailureLinks.
     * @example
     * // Create many FailureLinks
     * const failureLink = await prisma.failureLink.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FailureLinkCreateManyArgs>(args?: SelectSubset<T, FailureLinkCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FailureLinks and returns the data saved in the database.
     * @param {FailureLinkCreateManyAndReturnArgs} args - Arguments to create many FailureLinks.
     * @example
     * // Create many FailureLinks
     * const failureLink = await prisma.failureLink.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FailureLinks and only return the `id`
     * const failureLinkWithIdOnly = await prisma.failureLink.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FailureLinkCreateManyAndReturnArgs>(args?: SelectSubset<T, FailureLinkCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FailureLink.
     * @param {FailureLinkDeleteArgs} args - Arguments to delete one FailureLink.
     * @example
     * // Delete one FailureLink
     * const FailureLink = await prisma.failureLink.delete({
     *   where: {
     *     // ... filter to delete one FailureLink
     *   }
     * })
     * 
     */
    delete<T extends FailureLinkDeleteArgs>(args: SelectSubset<T, FailureLinkDeleteArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FailureLink.
     * @param {FailureLinkUpdateArgs} args - Arguments to update one FailureLink.
     * @example
     * // Update one FailureLink
     * const failureLink = await prisma.failureLink.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FailureLinkUpdateArgs>(args: SelectSubset<T, FailureLinkUpdateArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FailureLinks.
     * @param {FailureLinkDeleteManyArgs} args - Arguments to filter FailureLinks to delete.
     * @example
     * // Delete a few FailureLinks
     * const { count } = await prisma.failureLink.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FailureLinkDeleteManyArgs>(args?: SelectSubset<T, FailureLinkDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureLinks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureLinkUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FailureLinks
     * const failureLink = await prisma.failureLink.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FailureLinkUpdateManyArgs>(args: SelectSubset<T, FailureLinkUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FailureLinks and returns the data updated in the database.
     * @param {FailureLinkUpdateManyAndReturnArgs} args - Arguments to update many FailureLinks.
     * @example
     * // Update many FailureLinks
     * const failureLink = await prisma.failureLink.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FailureLinks and only return the `id`
     * const failureLinkWithIdOnly = await prisma.failureLink.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FailureLinkUpdateManyAndReturnArgs>(args: SelectSubset<T, FailureLinkUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FailureLink.
     * @param {FailureLinkUpsertArgs} args - Arguments to update or create a FailureLink.
     * @example
     * // Update or create a FailureLink
     * const failureLink = await prisma.failureLink.upsert({
     *   create: {
     *     // ... data to create a FailureLink
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FailureLink we want to update
     *   }
     * })
     */
    upsert<T extends FailureLinkUpsertArgs>(args: SelectSubset<T, FailureLinkUpsertArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FailureLinks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureLinkCountArgs} args - Arguments to filter FailureLinks to count.
     * @example
     * // Count the number of FailureLinks
     * const count = await prisma.failureLink.count({
     *   where: {
     *     // ... the filter for the FailureLinks we want to count
     *   }
     * })
    **/
    count<T extends FailureLinkCountArgs>(
      args?: Subset<T, FailureLinkCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FailureLinkCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FailureLink.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureLinkAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FailureLinkAggregateArgs>(args: Subset<T, FailureLinkAggregateArgs>): Prisma.PrismaPromise<GetFailureLinkAggregateType<T>>

    /**
     * Group by FailureLink.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FailureLinkGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FailureLinkGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FailureLinkGroupByArgs['orderBy'] }
        : { orderBy?: FailureLinkGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FailureLinkGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFailureLinkGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FailureLink model
   */
  readonly fields: FailureLinkFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FailureLink.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FailureLinkClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    failureMode<T extends FailureModeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FailureModeDefaultArgs<ExtArgs>>): Prisma__FailureModeClient<$Result.GetResult<Prisma.$FailureModePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureEffect<T extends FailureEffectDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FailureEffectDefaultArgs<ExtArgs>>): Prisma__FailureEffectClient<$Result.GetResult<Prisma.$FailureEffectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    failureCause<T extends FailureCauseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FailureCauseDefaultArgs<ExtArgs>>): Prisma__FailureCauseClient<$Result.GetResult<Prisma.$FailureCausePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    riskAnalyses<T extends FailureLink$riskAnalysesArgs<ExtArgs> = {}>(args?: Subset<T, FailureLink$riskAnalysesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FailureLink model
   */
  interface FailureLinkFieldRefs {
    readonly id: FieldRef<"FailureLink", 'String'>
    readonly fmeaId: FieldRef<"FailureLink", 'String'>
    readonly fmId: FieldRef<"FailureLink", 'String'>
    readonly feId: FieldRef<"FailureLink", 'String'>
    readonly fcId: FieldRef<"FailureLink", 'String'>
    readonly createdAt: FieldRef<"FailureLink", 'DateTime'>
    readonly updatedAt: FieldRef<"FailureLink", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FailureLink findUnique
   */
  export type FailureLinkFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * Filter, which FailureLink to fetch.
     */
    where: FailureLinkWhereUniqueInput
  }

  /**
   * FailureLink findUniqueOrThrow
   */
  export type FailureLinkFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * Filter, which FailureLink to fetch.
     */
    where: FailureLinkWhereUniqueInput
  }

  /**
   * FailureLink findFirst
   */
  export type FailureLinkFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * Filter, which FailureLink to fetch.
     */
    where?: FailureLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureLinks to fetch.
     */
    orderBy?: FailureLinkOrderByWithRelationInput | FailureLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureLinks.
     */
    cursor?: FailureLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureLinks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureLinks.
     */
    distinct?: FailureLinkScalarFieldEnum | FailureLinkScalarFieldEnum[]
  }

  /**
   * FailureLink findFirstOrThrow
   */
  export type FailureLinkFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * Filter, which FailureLink to fetch.
     */
    where?: FailureLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureLinks to fetch.
     */
    orderBy?: FailureLinkOrderByWithRelationInput | FailureLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FailureLinks.
     */
    cursor?: FailureLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureLinks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FailureLinks.
     */
    distinct?: FailureLinkScalarFieldEnum | FailureLinkScalarFieldEnum[]
  }

  /**
   * FailureLink findMany
   */
  export type FailureLinkFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * Filter, which FailureLinks to fetch.
     */
    where?: FailureLinkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FailureLinks to fetch.
     */
    orderBy?: FailureLinkOrderByWithRelationInput | FailureLinkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FailureLinks.
     */
    cursor?: FailureLinkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FailureLinks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FailureLinks.
     */
    skip?: number
    distinct?: FailureLinkScalarFieldEnum | FailureLinkScalarFieldEnum[]
  }

  /**
   * FailureLink create
   */
  export type FailureLinkCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * The data needed to create a FailureLink.
     */
    data: XOR<FailureLinkCreateInput, FailureLinkUncheckedCreateInput>
  }

  /**
   * FailureLink createMany
   */
  export type FailureLinkCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FailureLinks.
     */
    data: FailureLinkCreateManyInput | FailureLinkCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FailureLink createManyAndReturn
   */
  export type FailureLinkCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * The data used to create many FailureLinks.
     */
    data: FailureLinkCreateManyInput | FailureLinkCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureLink update
   */
  export type FailureLinkUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * The data needed to update a FailureLink.
     */
    data: XOR<FailureLinkUpdateInput, FailureLinkUncheckedUpdateInput>
    /**
     * Choose, which FailureLink to update.
     */
    where: FailureLinkWhereUniqueInput
  }

  /**
   * FailureLink updateMany
   */
  export type FailureLinkUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FailureLinks.
     */
    data: XOR<FailureLinkUpdateManyMutationInput, FailureLinkUncheckedUpdateManyInput>
    /**
     * Filter which FailureLinks to update
     */
    where?: FailureLinkWhereInput
    /**
     * Limit how many FailureLinks to update.
     */
    limit?: number
  }

  /**
   * FailureLink updateManyAndReturn
   */
  export type FailureLinkUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * The data used to update FailureLinks.
     */
    data: XOR<FailureLinkUpdateManyMutationInput, FailureLinkUncheckedUpdateManyInput>
    /**
     * Filter which FailureLinks to update
     */
    where?: FailureLinkWhereInput
    /**
     * Limit how many FailureLinks to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FailureLink upsert
   */
  export type FailureLinkUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * The filter to search for the FailureLink to update in case it exists.
     */
    where: FailureLinkWhereUniqueInput
    /**
     * In case the FailureLink found by the `where` argument doesn't exist, create a new FailureLink with this data.
     */
    create: XOR<FailureLinkCreateInput, FailureLinkUncheckedCreateInput>
    /**
     * In case the FailureLink was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FailureLinkUpdateInput, FailureLinkUncheckedUpdateInput>
  }

  /**
   * FailureLink delete
   */
  export type FailureLinkDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
    /**
     * Filter which FailureLink to delete.
     */
    where: FailureLinkWhereUniqueInput
  }

  /**
   * FailureLink deleteMany
   */
  export type FailureLinkDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FailureLinks to delete
     */
    where?: FailureLinkWhereInput
    /**
     * Limit how many FailureLinks to delete.
     */
    limit?: number
  }

  /**
   * FailureLink.riskAnalyses
   */
  export type FailureLink$riskAnalysesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    where?: RiskAnalysisWhereInput
    orderBy?: RiskAnalysisOrderByWithRelationInput | RiskAnalysisOrderByWithRelationInput[]
    cursor?: RiskAnalysisWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RiskAnalysisScalarFieldEnum | RiskAnalysisScalarFieldEnum[]
  }

  /**
   * FailureLink without action
   */
  export type FailureLinkDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FailureLink
     */
    select?: FailureLinkSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FailureLink
     */
    omit?: FailureLinkOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FailureLinkInclude<ExtArgs> | null
  }


  /**
   * Model RiskAnalysis
   */

  export type AggregateRiskAnalysis = {
    _count: RiskAnalysisCountAggregateOutputType | null
    _avg: RiskAnalysisAvgAggregateOutputType | null
    _sum: RiskAnalysisSumAggregateOutputType | null
    _min: RiskAnalysisMinAggregateOutputType | null
    _max: RiskAnalysisMaxAggregateOutputType | null
  }

  export type RiskAnalysisAvgAggregateOutputType = {
    severity: number | null
    occurrence: number | null
    detection: number | null
  }

  export type RiskAnalysisSumAggregateOutputType = {
    severity: number | null
    occurrence: number | null
    detection: number | null
  }

  export type RiskAnalysisMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    linkId: string | null
    severity: number | null
    occurrence: number | null
    detection: number | null
    ap: string | null
    preventionControl: string | null
    detectionControl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RiskAnalysisMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    linkId: string | null
    severity: number | null
    occurrence: number | null
    detection: number | null
    ap: string | null
    preventionControl: string | null
    detectionControl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RiskAnalysisCountAggregateOutputType = {
    id: number
    fmeaId: number
    linkId: number
    severity: number
    occurrence: number
    detection: number
    ap: number
    preventionControl: number
    detectionControl: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RiskAnalysisAvgAggregateInputType = {
    severity?: true
    occurrence?: true
    detection?: true
  }

  export type RiskAnalysisSumAggregateInputType = {
    severity?: true
    occurrence?: true
    detection?: true
  }

  export type RiskAnalysisMinAggregateInputType = {
    id?: true
    fmeaId?: true
    linkId?: true
    severity?: true
    occurrence?: true
    detection?: true
    ap?: true
    preventionControl?: true
    detectionControl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RiskAnalysisMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    linkId?: true
    severity?: true
    occurrence?: true
    detection?: true
    ap?: true
    preventionControl?: true
    detectionControl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RiskAnalysisCountAggregateInputType = {
    id?: true
    fmeaId?: true
    linkId?: true
    severity?: true
    occurrence?: true
    detection?: true
    ap?: true
    preventionControl?: true
    detectionControl?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RiskAnalysisAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RiskAnalysis to aggregate.
     */
    where?: RiskAnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RiskAnalyses to fetch.
     */
    orderBy?: RiskAnalysisOrderByWithRelationInput | RiskAnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RiskAnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RiskAnalyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RiskAnalyses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RiskAnalyses
    **/
    _count?: true | RiskAnalysisCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RiskAnalysisAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RiskAnalysisSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RiskAnalysisMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RiskAnalysisMaxAggregateInputType
  }

  export type GetRiskAnalysisAggregateType<T extends RiskAnalysisAggregateArgs> = {
        [P in keyof T & keyof AggregateRiskAnalysis]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRiskAnalysis[P]>
      : GetScalarType<T[P], AggregateRiskAnalysis[P]>
  }




  export type RiskAnalysisGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RiskAnalysisWhereInput
    orderBy?: RiskAnalysisOrderByWithAggregationInput | RiskAnalysisOrderByWithAggregationInput[]
    by: RiskAnalysisScalarFieldEnum[] | RiskAnalysisScalarFieldEnum
    having?: RiskAnalysisScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RiskAnalysisCountAggregateInputType | true
    _avg?: RiskAnalysisAvgAggregateInputType
    _sum?: RiskAnalysisSumAggregateInputType
    _min?: RiskAnalysisMinAggregateInputType
    _max?: RiskAnalysisMaxAggregateInputType
  }

  export type RiskAnalysisGroupByOutputType = {
    id: string
    fmeaId: string
    linkId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl: string | null
    detectionControl: string | null
    createdAt: Date
    updatedAt: Date
    _count: RiskAnalysisCountAggregateOutputType | null
    _avg: RiskAnalysisAvgAggregateOutputType | null
    _sum: RiskAnalysisSumAggregateOutputType | null
    _min: RiskAnalysisMinAggregateOutputType | null
    _max: RiskAnalysisMaxAggregateOutputType | null
  }

  type GetRiskAnalysisGroupByPayload<T extends RiskAnalysisGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RiskAnalysisGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RiskAnalysisGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RiskAnalysisGroupByOutputType[P]>
            : GetScalarType<T[P], RiskAnalysisGroupByOutputType[P]>
        }
      >
    >


  export type RiskAnalysisSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    linkId?: boolean
    severity?: boolean
    occurrence?: boolean
    detection?: boolean
    ap?: boolean
    preventionControl?: boolean
    detectionControl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    failureLink?: boolean | FailureLinkDefaultArgs<ExtArgs>
    optimizations?: boolean | RiskAnalysis$optimizationsArgs<ExtArgs>
    _count?: boolean | RiskAnalysisCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["riskAnalysis"]>

  export type RiskAnalysisSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    linkId?: boolean
    severity?: boolean
    occurrence?: boolean
    detection?: boolean
    ap?: boolean
    preventionControl?: boolean
    detectionControl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    failureLink?: boolean | FailureLinkDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["riskAnalysis"]>

  export type RiskAnalysisSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    linkId?: boolean
    severity?: boolean
    occurrence?: boolean
    detection?: boolean
    ap?: boolean
    preventionControl?: boolean
    detectionControl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    failureLink?: boolean | FailureLinkDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["riskAnalysis"]>

  export type RiskAnalysisSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    linkId?: boolean
    severity?: boolean
    occurrence?: boolean
    detection?: boolean
    ap?: boolean
    preventionControl?: boolean
    detectionControl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RiskAnalysisOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "linkId" | "severity" | "occurrence" | "detection" | "ap" | "preventionControl" | "detectionControl" | "createdAt" | "updatedAt", ExtArgs["result"]["riskAnalysis"]>
  export type RiskAnalysisInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureLink?: boolean | FailureLinkDefaultArgs<ExtArgs>
    optimizations?: boolean | RiskAnalysis$optimizationsArgs<ExtArgs>
    _count?: boolean | RiskAnalysisCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RiskAnalysisIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureLink?: boolean | FailureLinkDefaultArgs<ExtArgs>
  }
  export type RiskAnalysisIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    failureLink?: boolean | FailureLinkDefaultArgs<ExtArgs>
  }

  export type $RiskAnalysisPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RiskAnalysis"
    objects: {
      failureLink: Prisma.$FailureLinkPayload<ExtArgs>
      optimizations: Prisma.$OptimizationPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      linkId: string
      severity: number
      occurrence: number
      detection: number
      ap: string
      preventionControl: string | null
      detectionControl: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["riskAnalysis"]>
    composites: {}
  }

  type RiskAnalysisGetPayload<S extends boolean | null | undefined | RiskAnalysisDefaultArgs> = $Result.GetResult<Prisma.$RiskAnalysisPayload, S>

  type RiskAnalysisCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RiskAnalysisFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RiskAnalysisCountAggregateInputType | true
    }

  export interface RiskAnalysisDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RiskAnalysis'], meta: { name: 'RiskAnalysis' } }
    /**
     * Find zero or one RiskAnalysis that matches the filter.
     * @param {RiskAnalysisFindUniqueArgs} args - Arguments to find a RiskAnalysis
     * @example
     * // Get one RiskAnalysis
     * const riskAnalysis = await prisma.riskAnalysis.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RiskAnalysisFindUniqueArgs>(args: SelectSubset<T, RiskAnalysisFindUniqueArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RiskAnalysis that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RiskAnalysisFindUniqueOrThrowArgs} args - Arguments to find a RiskAnalysis
     * @example
     * // Get one RiskAnalysis
     * const riskAnalysis = await prisma.riskAnalysis.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RiskAnalysisFindUniqueOrThrowArgs>(args: SelectSubset<T, RiskAnalysisFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RiskAnalysis that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RiskAnalysisFindFirstArgs} args - Arguments to find a RiskAnalysis
     * @example
     * // Get one RiskAnalysis
     * const riskAnalysis = await prisma.riskAnalysis.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RiskAnalysisFindFirstArgs>(args?: SelectSubset<T, RiskAnalysisFindFirstArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RiskAnalysis that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RiskAnalysisFindFirstOrThrowArgs} args - Arguments to find a RiskAnalysis
     * @example
     * // Get one RiskAnalysis
     * const riskAnalysis = await prisma.riskAnalysis.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RiskAnalysisFindFirstOrThrowArgs>(args?: SelectSubset<T, RiskAnalysisFindFirstOrThrowArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RiskAnalyses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RiskAnalysisFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RiskAnalyses
     * const riskAnalyses = await prisma.riskAnalysis.findMany()
     * 
     * // Get first 10 RiskAnalyses
     * const riskAnalyses = await prisma.riskAnalysis.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const riskAnalysisWithIdOnly = await prisma.riskAnalysis.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RiskAnalysisFindManyArgs>(args?: SelectSubset<T, RiskAnalysisFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RiskAnalysis.
     * @param {RiskAnalysisCreateArgs} args - Arguments to create a RiskAnalysis.
     * @example
     * // Create one RiskAnalysis
     * const RiskAnalysis = await prisma.riskAnalysis.create({
     *   data: {
     *     // ... data to create a RiskAnalysis
     *   }
     * })
     * 
     */
    create<T extends RiskAnalysisCreateArgs>(args: SelectSubset<T, RiskAnalysisCreateArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RiskAnalyses.
     * @param {RiskAnalysisCreateManyArgs} args - Arguments to create many RiskAnalyses.
     * @example
     * // Create many RiskAnalyses
     * const riskAnalysis = await prisma.riskAnalysis.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RiskAnalysisCreateManyArgs>(args?: SelectSubset<T, RiskAnalysisCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RiskAnalyses and returns the data saved in the database.
     * @param {RiskAnalysisCreateManyAndReturnArgs} args - Arguments to create many RiskAnalyses.
     * @example
     * // Create many RiskAnalyses
     * const riskAnalysis = await prisma.riskAnalysis.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RiskAnalyses and only return the `id`
     * const riskAnalysisWithIdOnly = await prisma.riskAnalysis.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RiskAnalysisCreateManyAndReturnArgs>(args?: SelectSubset<T, RiskAnalysisCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RiskAnalysis.
     * @param {RiskAnalysisDeleteArgs} args - Arguments to delete one RiskAnalysis.
     * @example
     * // Delete one RiskAnalysis
     * const RiskAnalysis = await prisma.riskAnalysis.delete({
     *   where: {
     *     // ... filter to delete one RiskAnalysis
     *   }
     * })
     * 
     */
    delete<T extends RiskAnalysisDeleteArgs>(args: SelectSubset<T, RiskAnalysisDeleteArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RiskAnalysis.
     * @param {RiskAnalysisUpdateArgs} args - Arguments to update one RiskAnalysis.
     * @example
     * // Update one RiskAnalysis
     * const riskAnalysis = await prisma.riskAnalysis.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RiskAnalysisUpdateArgs>(args: SelectSubset<T, RiskAnalysisUpdateArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RiskAnalyses.
     * @param {RiskAnalysisDeleteManyArgs} args - Arguments to filter RiskAnalyses to delete.
     * @example
     * // Delete a few RiskAnalyses
     * const { count } = await prisma.riskAnalysis.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RiskAnalysisDeleteManyArgs>(args?: SelectSubset<T, RiskAnalysisDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RiskAnalyses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RiskAnalysisUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RiskAnalyses
     * const riskAnalysis = await prisma.riskAnalysis.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RiskAnalysisUpdateManyArgs>(args: SelectSubset<T, RiskAnalysisUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RiskAnalyses and returns the data updated in the database.
     * @param {RiskAnalysisUpdateManyAndReturnArgs} args - Arguments to update many RiskAnalyses.
     * @example
     * // Update many RiskAnalyses
     * const riskAnalysis = await prisma.riskAnalysis.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RiskAnalyses and only return the `id`
     * const riskAnalysisWithIdOnly = await prisma.riskAnalysis.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RiskAnalysisUpdateManyAndReturnArgs>(args: SelectSubset<T, RiskAnalysisUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RiskAnalysis.
     * @param {RiskAnalysisUpsertArgs} args - Arguments to update or create a RiskAnalysis.
     * @example
     * // Update or create a RiskAnalysis
     * const riskAnalysis = await prisma.riskAnalysis.upsert({
     *   create: {
     *     // ... data to create a RiskAnalysis
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RiskAnalysis we want to update
     *   }
     * })
     */
    upsert<T extends RiskAnalysisUpsertArgs>(args: SelectSubset<T, RiskAnalysisUpsertArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RiskAnalyses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RiskAnalysisCountArgs} args - Arguments to filter RiskAnalyses to count.
     * @example
     * // Count the number of RiskAnalyses
     * const count = await prisma.riskAnalysis.count({
     *   where: {
     *     // ... the filter for the RiskAnalyses we want to count
     *   }
     * })
    **/
    count<T extends RiskAnalysisCountArgs>(
      args?: Subset<T, RiskAnalysisCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RiskAnalysisCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RiskAnalysis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RiskAnalysisAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RiskAnalysisAggregateArgs>(args: Subset<T, RiskAnalysisAggregateArgs>): Prisma.PrismaPromise<GetRiskAnalysisAggregateType<T>>

    /**
     * Group by RiskAnalysis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RiskAnalysisGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RiskAnalysisGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RiskAnalysisGroupByArgs['orderBy'] }
        : { orderBy?: RiskAnalysisGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RiskAnalysisGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRiskAnalysisGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RiskAnalysis model
   */
  readonly fields: RiskAnalysisFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RiskAnalysis.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RiskAnalysisClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    failureLink<T extends FailureLinkDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FailureLinkDefaultArgs<ExtArgs>>): Prisma__FailureLinkClient<$Result.GetResult<Prisma.$FailureLinkPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    optimizations<T extends RiskAnalysis$optimizationsArgs<ExtArgs> = {}>(args?: Subset<T, RiskAnalysis$optimizationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RiskAnalysis model
   */
  interface RiskAnalysisFieldRefs {
    readonly id: FieldRef<"RiskAnalysis", 'String'>
    readonly fmeaId: FieldRef<"RiskAnalysis", 'String'>
    readonly linkId: FieldRef<"RiskAnalysis", 'String'>
    readonly severity: FieldRef<"RiskAnalysis", 'Int'>
    readonly occurrence: FieldRef<"RiskAnalysis", 'Int'>
    readonly detection: FieldRef<"RiskAnalysis", 'Int'>
    readonly ap: FieldRef<"RiskAnalysis", 'String'>
    readonly preventionControl: FieldRef<"RiskAnalysis", 'String'>
    readonly detectionControl: FieldRef<"RiskAnalysis", 'String'>
    readonly createdAt: FieldRef<"RiskAnalysis", 'DateTime'>
    readonly updatedAt: FieldRef<"RiskAnalysis", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RiskAnalysis findUnique
   */
  export type RiskAnalysisFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * Filter, which RiskAnalysis to fetch.
     */
    where: RiskAnalysisWhereUniqueInput
  }

  /**
   * RiskAnalysis findUniqueOrThrow
   */
  export type RiskAnalysisFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * Filter, which RiskAnalysis to fetch.
     */
    where: RiskAnalysisWhereUniqueInput
  }

  /**
   * RiskAnalysis findFirst
   */
  export type RiskAnalysisFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * Filter, which RiskAnalysis to fetch.
     */
    where?: RiskAnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RiskAnalyses to fetch.
     */
    orderBy?: RiskAnalysisOrderByWithRelationInput | RiskAnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RiskAnalyses.
     */
    cursor?: RiskAnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RiskAnalyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RiskAnalyses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RiskAnalyses.
     */
    distinct?: RiskAnalysisScalarFieldEnum | RiskAnalysisScalarFieldEnum[]
  }

  /**
   * RiskAnalysis findFirstOrThrow
   */
  export type RiskAnalysisFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * Filter, which RiskAnalysis to fetch.
     */
    where?: RiskAnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RiskAnalyses to fetch.
     */
    orderBy?: RiskAnalysisOrderByWithRelationInput | RiskAnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RiskAnalyses.
     */
    cursor?: RiskAnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RiskAnalyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RiskAnalyses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RiskAnalyses.
     */
    distinct?: RiskAnalysisScalarFieldEnum | RiskAnalysisScalarFieldEnum[]
  }

  /**
   * RiskAnalysis findMany
   */
  export type RiskAnalysisFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * Filter, which RiskAnalyses to fetch.
     */
    where?: RiskAnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RiskAnalyses to fetch.
     */
    orderBy?: RiskAnalysisOrderByWithRelationInput | RiskAnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RiskAnalyses.
     */
    cursor?: RiskAnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RiskAnalyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RiskAnalyses.
     */
    skip?: number
    distinct?: RiskAnalysisScalarFieldEnum | RiskAnalysisScalarFieldEnum[]
  }

  /**
   * RiskAnalysis create
   */
  export type RiskAnalysisCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * The data needed to create a RiskAnalysis.
     */
    data: XOR<RiskAnalysisCreateInput, RiskAnalysisUncheckedCreateInput>
  }

  /**
   * RiskAnalysis createMany
   */
  export type RiskAnalysisCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RiskAnalyses.
     */
    data: RiskAnalysisCreateManyInput | RiskAnalysisCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RiskAnalysis createManyAndReturn
   */
  export type RiskAnalysisCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * The data used to create many RiskAnalyses.
     */
    data: RiskAnalysisCreateManyInput | RiskAnalysisCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RiskAnalysis update
   */
  export type RiskAnalysisUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * The data needed to update a RiskAnalysis.
     */
    data: XOR<RiskAnalysisUpdateInput, RiskAnalysisUncheckedUpdateInput>
    /**
     * Choose, which RiskAnalysis to update.
     */
    where: RiskAnalysisWhereUniqueInput
  }

  /**
   * RiskAnalysis updateMany
   */
  export type RiskAnalysisUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RiskAnalyses.
     */
    data: XOR<RiskAnalysisUpdateManyMutationInput, RiskAnalysisUncheckedUpdateManyInput>
    /**
     * Filter which RiskAnalyses to update
     */
    where?: RiskAnalysisWhereInput
    /**
     * Limit how many RiskAnalyses to update.
     */
    limit?: number
  }

  /**
   * RiskAnalysis updateManyAndReturn
   */
  export type RiskAnalysisUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * The data used to update RiskAnalyses.
     */
    data: XOR<RiskAnalysisUpdateManyMutationInput, RiskAnalysisUncheckedUpdateManyInput>
    /**
     * Filter which RiskAnalyses to update
     */
    where?: RiskAnalysisWhereInput
    /**
     * Limit how many RiskAnalyses to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * RiskAnalysis upsert
   */
  export type RiskAnalysisUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * The filter to search for the RiskAnalysis to update in case it exists.
     */
    where: RiskAnalysisWhereUniqueInput
    /**
     * In case the RiskAnalysis found by the `where` argument doesn't exist, create a new RiskAnalysis with this data.
     */
    create: XOR<RiskAnalysisCreateInput, RiskAnalysisUncheckedCreateInput>
    /**
     * In case the RiskAnalysis was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RiskAnalysisUpdateInput, RiskAnalysisUncheckedUpdateInput>
  }

  /**
   * RiskAnalysis delete
   */
  export type RiskAnalysisDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
    /**
     * Filter which RiskAnalysis to delete.
     */
    where: RiskAnalysisWhereUniqueInput
  }

  /**
   * RiskAnalysis deleteMany
   */
  export type RiskAnalysisDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RiskAnalyses to delete
     */
    where?: RiskAnalysisWhereInput
    /**
     * Limit how many RiskAnalyses to delete.
     */
    limit?: number
  }

  /**
   * RiskAnalysis.optimizations
   */
  export type RiskAnalysis$optimizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    where?: OptimizationWhereInput
    orderBy?: OptimizationOrderByWithRelationInput | OptimizationOrderByWithRelationInput[]
    cursor?: OptimizationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OptimizationScalarFieldEnum | OptimizationScalarFieldEnum[]
  }

  /**
   * RiskAnalysis without action
   */
  export type RiskAnalysisDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RiskAnalysis
     */
    select?: RiskAnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the RiskAnalysis
     */
    omit?: RiskAnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RiskAnalysisInclude<ExtArgs> | null
  }


  /**
   * Model Optimization
   */

  export type AggregateOptimization = {
    _count: OptimizationCountAggregateOutputType | null
    _avg: OptimizationAvgAggregateOutputType | null
    _sum: OptimizationSumAggregateOutputType | null
    _min: OptimizationMinAggregateOutputType | null
    _max: OptimizationMaxAggregateOutputType | null
  }

  export type OptimizationAvgAggregateOutputType = {
    newSeverity: number | null
    newOccurrence: number | null
    newDetection: number | null
  }

  export type OptimizationSumAggregateOutputType = {
    newSeverity: number | null
    newOccurrence: number | null
    newDetection: number | null
  }

  export type OptimizationMinAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    riskId: string | null
    recommendedAction: string | null
    responsible: string | null
    targetDate: string | null
    newSeverity: number | null
    newOccurrence: number | null
    newDetection: number | null
    newAP: string | null
    status: string | null
    completedDate: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OptimizationMaxAggregateOutputType = {
    id: string | null
    fmeaId: string | null
    riskId: string | null
    recommendedAction: string | null
    responsible: string | null
    targetDate: string | null
    newSeverity: number | null
    newOccurrence: number | null
    newDetection: number | null
    newAP: string | null
    status: string | null
    completedDate: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OptimizationCountAggregateOutputType = {
    id: number
    fmeaId: number
    riskId: number
    recommendedAction: number
    responsible: number
    targetDate: number
    newSeverity: number
    newOccurrence: number
    newDetection: number
    newAP: number
    status: number
    completedDate: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type OptimizationAvgAggregateInputType = {
    newSeverity?: true
    newOccurrence?: true
    newDetection?: true
  }

  export type OptimizationSumAggregateInputType = {
    newSeverity?: true
    newOccurrence?: true
    newDetection?: true
  }

  export type OptimizationMinAggregateInputType = {
    id?: true
    fmeaId?: true
    riskId?: true
    recommendedAction?: true
    responsible?: true
    targetDate?: true
    newSeverity?: true
    newOccurrence?: true
    newDetection?: true
    newAP?: true
    status?: true
    completedDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OptimizationMaxAggregateInputType = {
    id?: true
    fmeaId?: true
    riskId?: true
    recommendedAction?: true
    responsible?: true
    targetDate?: true
    newSeverity?: true
    newOccurrence?: true
    newDetection?: true
    newAP?: true
    status?: true
    completedDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OptimizationCountAggregateInputType = {
    id?: true
    fmeaId?: true
    riskId?: true
    recommendedAction?: true
    responsible?: true
    targetDate?: true
    newSeverity?: true
    newOccurrence?: true
    newDetection?: true
    newAP?: true
    status?: true
    completedDate?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type OptimizationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Optimization to aggregate.
     */
    where?: OptimizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Optimizations to fetch.
     */
    orderBy?: OptimizationOrderByWithRelationInput | OptimizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OptimizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Optimizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Optimizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Optimizations
    **/
    _count?: true | OptimizationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OptimizationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OptimizationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OptimizationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OptimizationMaxAggregateInputType
  }

  export type GetOptimizationAggregateType<T extends OptimizationAggregateArgs> = {
        [P in keyof T & keyof AggregateOptimization]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOptimization[P]>
      : GetScalarType<T[P], AggregateOptimization[P]>
  }




  export type OptimizationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OptimizationWhereInput
    orderBy?: OptimizationOrderByWithAggregationInput | OptimizationOrderByWithAggregationInput[]
    by: OptimizationScalarFieldEnum[] | OptimizationScalarFieldEnum
    having?: OptimizationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OptimizationCountAggregateInputType | true
    _avg?: OptimizationAvgAggregateInputType
    _sum?: OptimizationSumAggregateInputType
    _min?: OptimizationMinAggregateInputType
    _max?: OptimizationMaxAggregateInputType
  }

  export type OptimizationGroupByOutputType = {
    id: string
    fmeaId: string
    riskId: string
    recommendedAction: string
    responsible: string
    targetDate: string
    newSeverity: number | null
    newOccurrence: number | null
    newDetection: number | null
    newAP: string | null
    status: string
    completedDate: string | null
    createdAt: Date
    updatedAt: Date
    _count: OptimizationCountAggregateOutputType | null
    _avg: OptimizationAvgAggregateOutputType | null
    _sum: OptimizationSumAggregateOutputType | null
    _min: OptimizationMinAggregateOutputType | null
    _max: OptimizationMaxAggregateOutputType | null
  }

  type GetOptimizationGroupByPayload<T extends OptimizationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OptimizationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OptimizationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OptimizationGroupByOutputType[P]>
            : GetScalarType<T[P], OptimizationGroupByOutputType[P]>
        }
      >
    >


  export type OptimizationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    riskId?: boolean
    recommendedAction?: boolean
    responsible?: boolean
    targetDate?: boolean
    newSeverity?: boolean
    newOccurrence?: boolean
    newDetection?: boolean
    newAP?: boolean
    status?: boolean
    completedDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    riskAnalysis?: boolean | RiskAnalysisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["optimization"]>

  export type OptimizationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    riskId?: boolean
    recommendedAction?: boolean
    responsible?: boolean
    targetDate?: boolean
    newSeverity?: boolean
    newOccurrence?: boolean
    newDetection?: boolean
    newAP?: boolean
    status?: boolean
    completedDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    riskAnalysis?: boolean | RiskAnalysisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["optimization"]>

  export type OptimizationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fmeaId?: boolean
    riskId?: boolean
    recommendedAction?: boolean
    responsible?: boolean
    targetDate?: boolean
    newSeverity?: boolean
    newOccurrence?: boolean
    newDetection?: boolean
    newAP?: boolean
    status?: boolean
    completedDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    riskAnalysis?: boolean | RiskAnalysisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["optimization"]>

  export type OptimizationSelectScalar = {
    id?: boolean
    fmeaId?: boolean
    riskId?: boolean
    recommendedAction?: boolean
    responsible?: boolean
    targetDate?: boolean
    newSeverity?: boolean
    newOccurrence?: boolean
    newDetection?: boolean
    newAP?: boolean
    status?: boolean
    completedDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type OptimizationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "fmeaId" | "riskId" | "recommendedAction" | "responsible" | "targetDate" | "newSeverity" | "newOccurrence" | "newDetection" | "newAP" | "status" | "completedDate" | "createdAt" | "updatedAt", ExtArgs["result"]["optimization"]>
  export type OptimizationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    riskAnalysis?: boolean | RiskAnalysisDefaultArgs<ExtArgs>
  }
  export type OptimizationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    riskAnalysis?: boolean | RiskAnalysisDefaultArgs<ExtArgs>
  }
  export type OptimizationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    riskAnalysis?: boolean | RiskAnalysisDefaultArgs<ExtArgs>
  }

  export type $OptimizationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Optimization"
    objects: {
      riskAnalysis: Prisma.$RiskAnalysisPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fmeaId: string
      riskId: string
      recommendedAction: string
      responsible: string
      targetDate: string
      newSeverity: number | null
      newOccurrence: number | null
      newDetection: number | null
      newAP: string | null
      status: string
      completedDate: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["optimization"]>
    composites: {}
  }

  type OptimizationGetPayload<S extends boolean | null | undefined | OptimizationDefaultArgs> = $Result.GetResult<Prisma.$OptimizationPayload, S>

  type OptimizationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OptimizationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OptimizationCountAggregateInputType | true
    }

  export interface OptimizationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Optimization'], meta: { name: 'Optimization' } }
    /**
     * Find zero or one Optimization that matches the filter.
     * @param {OptimizationFindUniqueArgs} args - Arguments to find a Optimization
     * @example
     * // Get one Optimization
     * const optimization = await prisma.optimization.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OptimizationFindUniqueArgs>(args: SelectSubset<T, OptimizationFindUniqueArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Optimization that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OptimizationFindUniqueOrThrowArgs} args - Arguments to find a Optimization
     * @example
     * // Get one Optimization
     * const optimization = await prisma.optimization.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OptimizationFindUniqueOrThrowArgs>(args: SelectSubset<T, OptimizationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Optimization that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OptimizationFindFirstArgs} args - Arguments to find a Optimization
     * @example
     * // Get one Optimization
     * const optimization = await prisma.optimization.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OptimizationFindFirstArgs>(args?: SelectSubset<T, OptimizationFindFirstArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Optimization that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OptimizationFindFirstOrThrowArgs} args - Arguments to find a Optimization
     * @example
     * // Get one Optimization
     * const optimization = await prisma.optimization.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OptimizationFindFirstOrThrowArgs>(args?: SelectSubset<T, OptimizationFindFirstOrThrowArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Optimizations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OptimizationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Optimizations
     * const optimizations = await prisma.optimization.findMany()
     * 
     * // Get first 10 Optimizations
     * const optimizations = await prisma.optimization.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const optimizationWithIdOnly = await prisma.optimization.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OptimizationFindManyArgs>(args?: SelectSubset<T, OptimizationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Optimization.
     * @param {OptimizationCreateArgs} args - Arguments to create a Optimization.
     * @example
     * // Create one Optimization
     * const Optimization = await prisma.optimization.create({
     *   data: {
     *     // ... data to create a Optimization
     *   }
     * })
     * 
     */
    create<T extends OptimizationCreateArgs>(args: SelectSubset<T, OptimizationCreateArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Optimizations.
     * @param {OptimizationCreateManyArgs} args - Arguments to create many Optimizations.
     * @example
     * // Create many Optimizations
     * const optimization = await prisma.optimization.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OptimizationCreateManyArgs>(args?: SelectSubset<T, OptimizationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Optimizations and returns the data saved in the database.
     * @param {OptimizationCreateManyAndReturnArgs} args - Arguments to create many Optimizations.
     * @example
     * // Create many Optimizations
     * const optimization = await prisma.optimization.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Optimizations and only return the `id`
     * const optimizationWithIdOnly = await prisma.optimization.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OptimizationCreateManyAndReturnArgs>(args?: SelectSubset<T, OptimizationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Optimization.
     * @param {OptimizationDeleteArgs} args - Arguments to delete one Optimization.
     * @example
     * // Delete one Optimization
     * const Optimization = await prisma.optimization.delete({
     *   where: {
     *     // ... filter to delete one Optimization
     *   }
     * })
     * 
     */
    delete<T extends OptimizationDeleteArgs>(args: SelectSubset<T, OptimizationDeleteArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Optimization.
     * @param {OptimizationUpdateArgs} args - Arguments to update one Optimization.
     * @example
     * // Update one Optimization
     * const optimization = await prisma.optimization.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OptimizationUpdateArgs>(args: SelectSubset<T, OptimizationUpdateArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Optimizations.
     * @param {OptimizationDeleteManyArgs} args - Arguments to filter Optimizations to delete.
     * @example
     * // Delete a few Optimizations
     * const { count } = await prisma.optimization.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OptimizationDeleteManyArgs>(args?: SelectSubset<T, OptimizationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Optimizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OptimizationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Optimizations
     * const optimization = await prisma.optimization.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OptimizationUpdateManyArgs>(args: SelectSubset<T, OptimizationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Optimizations and returns the data updated in the database.
     * @param {OptimizationUpdateManyAndReturnArgs} args - Arguments to update many Optimizations.
     * @example
     * // Update many Optimizations
     * const optimization = await prisma.optimization.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Optimizations and only return the `id`
     * const optimizationWithIdOnly = await prisma.optimization.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends OptimizationUpdateManyAndReturnArgs>(args: SelectSubset<T, OptimizationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Optimization.
     * @param {OptimizationUpsertArgs} args - Arguments to update or create a Optimization.
     * @example
     * // Update or create a Optimization
     * const optimization = await prisma.optimization.upsert({
     *   create: {
     *     // ... data to create a Optimization
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Optimization we want to update
     *   }
     * })
     */
    upsert<T extends OptimizationUpsertArgs>(args: SelectSubset<T, OptimizationUpsertArgs<ExtArgs>>): Prisma__OptimizationClient<$Result.GetResult<Prisma.$OptimizationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Optimizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OptimizationCountArgs} args - Arguments to filter Optimizations to count.
     * @example
     * // Count the number of Optimizations
     * const count = await prisma.optimization.count({
     *   where: {
     *     // ... the filter for the Optimizations we want to count
     *   }
     * })
    **/
    count<T extends OptimizationCountArgs>(
      args?: Subset<T, OptimizationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OptimizationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Optimization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OptimizationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OptimizationAggregateArgs>(args: Subset<T, OptimizationAggregateArgs>): Prisma.PrismaPromise<GetOptimizationAggregateType<T>>

    /**
     * Group by Optimization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OptimizationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OptimizationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OptimizationGroupByArgs['orderBy'] }
        : { orderBy?: OptimizationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OptimizationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOptimizationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Optimization model
   */
  readonly fields: OptimizationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Optimization.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OptimizationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    riskAnalysis<T extends RiskAnalysisDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RiskAnalysisDefaultArgs<ExtArgs>>): Prisma__RiskAnalysisClient<$Result.GetResult<Prisma.$RiskAnalysisPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Optimization model
   */
  interface OptimizationFieldRefs {
    readonly id: FieldRef<"Optimization", 'String'>
    readonly fmeaId: FieldRef<"Optimization", 'String'>
    readonly riskId: FieldRef<"Optimization", 'String'>
    readonly recommendedAction: FieldRef<"Optimization", 'String'>
    readonly responsible: FieldRef<"Optimization", 'String'>
    readonly targetDate: FieldRef<"Optimization", 'String'>
    readonly newSeverity: FieldRef<"Optimization", 'Int'>
    readonly newOccurrence: FieldRef<"Optimization", 'Int'>
    readonly newDetection: FieldRef<"Optimization", 'Int'>
    readonly newAP: FieldRef<"Optimization", 'String'>
    readonly status: FieldRef<"Optimization", 'String'>
    readonly completedDate: FieldRef<"Optimization", 'String'>
    readonly createdAt: FieldRef<"Optimization", 'DateTime'>
    readonly updatedAt: FieldRef<"Optimization", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Optimization findUnique
   */
  export type OptimizationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * Filter, which Optimization to fetch.
     */
    where: OptimizationWhereUniqueInput
  }

  /**
   * Optimization findUniqueOrThrow
   */
  export type OptimizationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * Filter, which Optimization to fetch.
     */
    where: OptimizationWhereUniqueInput
  }

  /**
   * Optimization findFirst
   */
  export type OptimizationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * Filter, which Optimization to fetch.
     */
    where?: OptimizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Optimizations to fetch.
     */
    orderBy?: OptimizationOrderByWithRelationInput | OptimizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Optimizations.
     */
    cursor?: OptimizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Optimizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Optimizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Optimizations.
     */
    distinct?: OptimizationScalarFieldEnum | OptimizationScalarFieldEnum[]
  }

  /**
   * Optimization findFirstOrThrow
   */
  export type OptimizationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * Filter, which Optimization to fetch.
     */
    where?: OptimizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Optimizations to fetch.
     */
    orderBy?: OptimizationOrderByWithRelationInput | OptimizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Optimizations.
     */
    cursor?: OptimizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Optimizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Optimizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Optimizations.
     */
    distinct?: OptimizationScalarFieldEnum | OptimizationScalarFieldEnum[]
  }

  /**
   * Optimization findMany
   */
  export type OptimizationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * Filter, which Optimizations to fetch.
     */
    where?: OptimizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Optimizations to fetch.
     */
    orderBy?: OptimizationOrderByWithRelationInput | OptimizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Optimizations.
     */
    cursor?: OptimizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Optimizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Optimizations.
     */
    skip?: number
    distinct?: OptimizationScalarFieldEnum | OptimizationScalarFieldEnum[]
  }

  /**
   * Optimization create
   */
  export type OptimizationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * The data needed to create a Optimization.
     */
    data: XOR<OptimizationCreateInput, OptimizationUncheckedCreateInput>
  }

  /**
   * Optimization createMany
   */
  export type OptimizationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Optimizations.
     */
    data: OptimizationCreateManyInput | OptimizationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Optimization createManyAndReturn
   */
  export type OptimizationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * The data used to create many Optimizations.
     */
    data: OptimizationCreateManyInput | OptimizationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Optimization update
   */
  export type OptimizationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * The data needed to update a Optimization.
     */
    data: XOR<OptimizationUpdateInput, OptimizationUncheckedUpdateInput>
    /**
     * Choose, which Optimization to update.
     */
    where: OptimizationWhereUniqueInput
  }

  /**
   * Optimization updateMany
   */
  export type OptimizationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Optimizations.
     */
    data: XOR<OptimizationUpdateManyMutationInput, OptimizationUncheckedUpdateManyInput>
    /**
     * Filter which Optimizations to update
     */
    where?: OptimizationWhereInput
    /**
     * Limit how many Optimizations to update.
     */
    limit?: number
  }

  /**
   * Optimization updateManyAndReturn
   */
  export type OptimizationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * The data used to update Optimizations.
     */
    data: XOR<OptimizationUpdateManyMutationInput, OptimizationUncheckedUpdateManyInput>
    /**
     * Filter which Optimizations to update
     */
    where?: OptimizationWhereInput
    /**
     * Limit how many Optimizations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Optimization upsert
   */
  export type OptimizationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * The filter to search for the Optimization to update in case it exists.
     */
    where: OptimizationWhereUniqueInput
    /**
     * In case the Optimization found by the `where` argument doesn't exist, create a new Optimization with this data.
     */
    create: XOR<OptimizationCreateInput, OptimizationUncheckedCreateInput>
    /**
     * In case the Optimization was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OptimizationUpdateInput, OptimizationUncheckedUpdateInput>
  }

  /**
   * Optimization delete
   */
  export type OptimizationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
    /**
     * Filter which Optimization to delete.
     */
    where: OptimizationWhereUniqueInput
  }

  /**
   * Optimization deleteMany
   */
  export type OptimizationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Optimizations to delete
     */
    where?: OptimizationWhereInput
    /**
     * Limit how many Optimizations to delete.
     */
    limit?: number
  }

  /**
   * Optimization without action
   */
  export type OptimizationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Optimization
     */
    select?: OptimizationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Optimization
     */
    omit?: OptimizationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OptimizationInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const APQPProjectScalarFieldEnum: {
    id: 'id',
    name: 'name',
    productName: 'productName',
    customerName: 'customerName',
    status: 'status',
    startDate: 'startDate',
    targetDate: 'targetDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type APQPProjectScalarFieldEnum = (typeof APQPProjectScalarFieldEnum)[keyof typeof APQPProjectScalarFieldEnum]


  export const L1StructureScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    name: 'name',
    confirmed: 'confirmed',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type L1StructureScalarFieldEnum = (typeof L1StructureScalarFieldEnum)[keyof typeof L1StructureScalarFieldEnum]


  export const L2StructureScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l1Id: 'l1Id',
    no: 'no',
    name: 'name',
    order: 'order',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type L2StructureScalarFieldEnum = (typeof L2StructureScalarFieldEnum)[keyof typeof L2StructureScalarFieldEnum]


  export const L3StructureScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l1Id: 'l1Id',
    l2Id: 'l2Id',
    m4: 'm4',
    name: 'name',
    order: 'order',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type L3StructureScalarFieldEnum = (typeof L3StructureScalarFieldEnum)[keyof typeof L3StructureScalarFieldEnum]


  export const L1FunctionScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l1StructId: 'l1StructId',
    category: 'category',
    functionName: 'functionName',
    requirement: 'requirement',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type L1FunctionScalarFieldEnum = (typeof L1FunctionScalarFieldEnum)[keyof typeof L1FunctionScalarFieldEnum]


  export const L2FunctionScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l2StructId: 'l2StructId',
    functionName: 'functionName',
    productChar: 'productChar',
    specialChar: 'specialChar',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type L2FunctionScalarFieldEnum = (typeof L2FunctionScalarFieldEnum)[keyof typeof L2FunctionScalarFieldEnum]


  export const L3FunctionScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l3StructId: 'l3StructId',
    l2StructId: 'l2StructId',
    functionName: 'functionName',
    processChar: 'processChar',
    specialChar: 'specialChar',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type L3FunctionScalarFieldEnum = (typeof L3FunctionScalarFieldEnum)[keyof typeof L3FunctionScalarFieldEnum]


  export const FailureEffectScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l1FuncId: 'l1FuncId',
    category: 'category',
    effect: 'effect',
    severity: 'severity',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FailureEffectScalarFieldEnum = (typeof FailureEffectScalarFieldEnum)[keyof typeof FailureEffectScalarFieldEnum]


  export const FailureModeScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l2FuncId: 'l2FuncId',
    l2StructId: 'l2StructId',
    productCharId: 'productCharId',
    mode: 'mode',
    specialChar: 'specialChar',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FailureModeScalarFieldEnum = (typeof FailureModeScalarFieldEnum)[keyof typeof FailureModeScalarFieldEnum]


  export const FailureCauseScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    l3FuncId: 'l3FuncId',
    l3StructId: 'l3StructId',
    l2StructId: 'l2StructId',
    cause: 'cause',
    occurrence: 'occurrence',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FailureCauseScalarFieldEnum = (typeof FailureCauseScalarFieldEnum)[keyof typeof FailureCauseScalarFieldEnum]


  export const FailureLinkScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    fmId: 'fmId',
    feId: 'feId',
    fcId: 'fcId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FailureLinkScalarFieldEnum = (typeof FailureLinkScalarFieldEnum)[keyof typeof FailureLinkScalarFieldEnum]


  export const RiskAnalysisScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    linkId: 'linkId',
    severity: 'severity',
    occurrence: 'occurrence',
    detection: 'detection',
    ap: 'ap',
    preventionControl: 'preventionControl',
    detectionControl: 'detectionControl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RiskAnalysisScalarFieldEnum = (typeof RiskAnalysisScalarFieldEnum)[keyof typeof RiskAnalysisScalarFieldEnum]


  export const OptimizationScalarFieldEnum: {
    id: 'id',
    fmeaId: 'fmeaId',
    riskId: 'riskId',
    recommendedAction: 'recommendedAction',
    responsible: 'responsible',
    targetDate: 'targetDate',
    newSeverity: 'newSeverity',
    newOccurrence: 'newOccurrence',
    newDetection: 'newDetection',
    newAP: 'newAP',
    status: 'status',
    completedDate: 'completedDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type OptimizationScalarFieldEnum = (typeof OptimizationScalarFieldEnum)[keyof typeof OptimizationScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type APQPProjectWhereInput = {
    AND?: APQPProjectWhereInput | APQPProjectWhereInput[]
    OR?: APQPProjectWhereInput[]
    NOT?: APQPProjectWhereInput | APQPProjectWhereInput[]
    id?: StringFilter<"APQPProject"> | string
    name?: StringFilter<"APQPProject"> | string
    productName?: StringFilter<"APQPProject"> | string
    customerName?: StringFilter<"APQPProject"> | string
    status?: StringFilter<"APQPProject"> | string
    startDate?: StringNullableFilter<"APQPProject"> | string | null
    targetDate?: StringNullableFilter<"APQPProject"> | string | null
    createdAt?: DateTimeFilter<"APQPProject"> | Date | string
    updatedAt?: DateTimeFilter<"APQPProject"> | Date | string
  }

  export type APQPProjectOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    productName?: SortOrder
    customerName?: SortOrder
    status?: SortOrder
    startDate?: SortOrderInput | SortOrder
    targetDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type APQPProjectWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: APQPProjectWhereInput | APQPProjectWhereInput[]
    OR?: APQPProjectWhereInput[]
    NOT?: APQPProjectWhereInput | APQPProjectWhereInput[]
    name?: StringFilter<"APQPProject"> | string
    productName?: StringFilter<"APQPProject"> | string
    customerName?: StringFilter<"APQPProject"> | string
    status?: StringFilter<"APQPProject"> | string
    startDate?: StringNullableFilter<"APQPProject"> | string | null
    targetDate?: StringNullableFilter<"APQPProject"> | string | null
    createdAt?: DateTimeFilter<"APQPProject"> | Date | string
    updatedAt?: DateTimeFilter<"APQPProject"> | Date | string
  }, "id">

  export type APQPProjectOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    productName?: SortOrder
    customerName?: SortOrder
    status?: SortOrder
    startDate?: SortOrderInput | SortOrder
    targetDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: APQPProjectCountOrderByAggregateInput
    _max?: APQPProjectMaxOrderByAggregateInput
    _min?: APQPProjectMinOrderByAggregateInput
  }

  export type APQPProjectScalarWhereWithAggregatesInput = {
    AND?: APQPProjectScalarWhereWithAggregatesInput | APQPProjectScalarWhereWithAggregatesInput[]
    OR?: APQPProjectScalarWhereWithAggregatesInput[]
    NOT?: APQPProjectScalarWhereWithAggregatesInput | APQPProjectScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"APQPProject"> | string
    name?: StringWithAggregatesFilter<"APQPProject"> | string
    productName?: StringWithAggregatesFilter<"APQPProject"> | string
    customerName?: StringWithAggregatesFilter<"APQPProject"> | string
    status?: StringWithAggregatesFilter<"APQPProject"> | string
    startDate?: StringNullableWithAggregatesFilter<"APQPProject"> | string | null
    targetDate?: StringNullableWithAggregatesFilter<"APQPProject"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"APQPProject"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"APQPProject"> | Date | string
  }

  export type L1StructureWhereInput = {
    AND?: L1StructureWhereInput | L1StructureWhereInput[]
    OR?: L1StructureWhereInput[]
    NOT?: L1StructureWhereInput | L1StructureWhereInput[]
    id?: StringFilter<"L1Structure"> | string
    fmeaId?: StringFilter<"L1Structure"> | string
    name?: StringFilter<"L1Structure"> | string
    confirmed?: BoolNullableFilter<"L1Structure"> | boolean | null
    createdAt?: DateTimeFilter<"L1Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L1Structure"> | Date | string
    l2Structures?: L2StructureListRelationFilter
    l1Functions?: L1FunctionListRelationFilter
  }

  export type L1StructureOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    name?: SortOrder
    confirmed?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l2Structures?: L2StructureOrderByRelationAggregateInput
    l1Functions?: L1FunctionOrderByRelationAggregateInput
  }

  export type L1StructureWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: L1StructureWhereInput | L1StructureWhereInput[]
    OR?: L1StructureWhereInput[]
    NOT?: L1StructureWhereInput | L1StructureWhereInput[]
    fmeaId?: StringFilter<"L1Structure"> | string
    name?: StringFilter<"L1Structure"> | string
    confirmed?: BoolNullableFilter<"L1Structure"> | boolean | null
    createdAt?: DateTimeFilter<"L1Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L1Structure"> | Date | string
    l2Structures?: L2StructureListRelationFilter
    l1Functions?: L1FunctionListRelationFilter
  }, "id">

  export type L1StructureOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    name?: SortOrder
    confirmed?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: L1StructureCountOrderByAggregateInput
    _max?: L1StructureMaxOrderByAggregateInput
    _min?: L1StructureMinOrderByAggregateInput
  }

  export type L1StructureScalarWhereWithAggregatesInput = {
    AND?: L1StructureScalarWhereWithAggregatesInput | L1StructureScalarWhereWithAggregatesInput[]
    OR?: L1StructureScalarWhereWithAggregatesInput[]
    NOT?: L1StructureScalarWhereWithAggregatesInput | L1StructureScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"L1Structure"> | string
    fmeaId?: StringWithAggregatesFilter<"L1Structure"> | string
    name?: StringWithAggregatesFilter<"L1Structure"> | string
    confirmed?: BoolNullableWithAggregatesFilter<"L1Structure"> | boolean | null
    createdAt?: DateTimeWithAggregatesFilter<"L1Structure"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"L1Structure"> | Date | string
  }

  export type L2StructureWhereInput = {
    AND?: L2StructureWhereInput | L2StructureWhereInput[]
    OR?: L2StructureWhereInput[]
    NOT?: L2StructureWhereInput | L2StructureWhereInput[]
    id?: StringFilter<"L2Structure"> | string
    fmeaId?: StringFilter<"L2Structure"> | string
    l1Id?: StringFilter<"L2Structure"> | string
    no?: StringFilter<"L2Structure"> | string
    name?: StringFilter<"L2Structure"> | string
    order?: IntFilter<"L2Structure"> | number
    createdAt?: DateTimeFilter<"L2Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L2Structure"> | Date | string
    l1Structure?: XOR<L1StructureScalarRelationFilter, L1StructureWhereInput>
    l3Structures?: L3StructureListRelationFilter
    l2Functions?: L2FunctionListRelationFilter
    failureModes?: FailureModeListRelationFilter
  }

  export type L2StructureOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    no?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l1Structure?: L1StructureOrderByWithRelationInput
    l3Structures?: L3StructureOrderByRelationAggregateInput
    l2Functions?: L2FunctionOrderByRelationAggregateInput
    failureModes?: FailureModeOrderByRelationAggregateInput
  }

  export type L2StructureWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: L2StructureWhereInput | L2StructureWhereInput[]
    OR?: L2StructureWhereInput[]
    NOT?: L2StructureWhereInput | L2StructureWhereInput[]
    fmeaId?: StringFilter<"L2Structure"> | string
    l1Id?: StringFilter<"L2Structure"> | string
    no?: StringFilter<"L2Structure"> | string
    name?: StringFilter<"L2Structure"> | string
    order?: IntFilter<"L2Structure"> | number
    createdAt?: DateTimeFilter<"L2Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L2Structure"> | Date | string
    l1Structure?: XOR<L1StructureScalarRelationFilter, L1StructureWhereInput>
    l3Structures?: L3StructureListRelationFilter
    l2Functions?: L2FunctionListRelationFilter
    failureModes?: FailureModeListRelationFilter
  }, "id">

  export type L2StructureOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    no?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: L2StructureCountOrderByAggregateInput
    _avg?: L2StructureAvgOrderByAggregateInput
    _max?: L2StructureMaxOrderByAggregateInput
    _min?: L2StructureMinOrderByAggregateInput
    _sum?: L2StructureSumOrderByAggregateInput
  }

  export type L2StructureScalarWhereWithAggregatesInput = {
    AND?: L2StructureScalarWhereWithAggregatesInput | L2StructureScalarWhereWithAggregatesInput[]
    OR?: L2StructureScalarWhereWithAggregatesInput[]
    NOT?: L2StructureScalarWhereWithAggregatesInput | L2StructureScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"L2Structure"> | string
    fmeaId?: StringWithAggregatesFilter<"L2Structure"> | string
    l1Id?: StringWithAggregatesFilter<"L2Structure"> | string
    no?: StringWithAggregatesFilter<"L2Structure"> | string
    name?: StringWithAggregatesFilter<"L2Structure"> | string
    order?: IntWithAggregatesFilter<"L2Structure"> | number
    createdAt?: DateTimeWithAggregatesFilter<"L2Structure"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"L2Structure"> | Date | string
  }

  export type L3StructureWhereInput = {
    AND?: L3StructureWhereInput | L3StructureWhereInput[]
    OR?: L3StructureWhereInput[]
    NOT?: L3StructureWhereInput | L3StructureWhereInput[]
    id?: StringFilter<"L3Structure"> | string
    fmeaId?: StringFilter<"L3Structure"> | string
    l1Id?: StringFilter<"L3Structure"> | string
    l2Id?: StringFilter<"L3Structure"> | string
    m4?: StringNullableFilter<"L3Structure"> | string | null
    name?: StringFilter<"L3Structure"> | string
    order?: IntFilter<"L3Structure"> | number
    createdAt?: DateTimeFilter<"L3Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L3Structure"> | Date | string
    l2Structure?: XOR<L2StructureScalarRelationFilter, L2StructureWhereInput>
    l3Functions?: L3FunctionListRelationFilter
    failureCauses?: FailureCauseListRelationFilter
  }

  export type L3StructureOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    l2Id?: SortOrder
    m4?: SortOrderInput | SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l2Structure?: L2StructureOrderByWithRelationInput
    l3Functions?: L3FunctionOrderByRelationAggregateInput
    failureCauses?: FailureCauseOrderByRelationAggregateInput
  }

  export type L3StructureWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: L3StructureWhereInput | L3StructureWhereInput[]
    OR?: L3StructureWhereInput[]
    NOT?: L3StructureWhereInput | L3StructureWhereInput[]
    fmeaId?: StringFilter<"L3Structure"> | string
    l1Id?: StringFilter<"L3Structure"> | string
    l2Id?: StringFilter<"L3Structure"> | string
    m4?: StringNullableFilter<"L3Structure"> | string | null
    name?: StringFilter<"L3Structure"> | string
    order?: IntFilter<"L3Structure"> | number
    createdAt?: DateTimeFilter<"L3Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L3Structure"> | Date | string
    l2Structure?: XOR<L2StructureScalarRelationFilter, L2StructureWhereInput>
    l3Functions?: L3FunctionListRelationFilter
    failureCauses?: FailureCauseListRelationFilter
  }, "id">

  export type L3StructureOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    l2Id?: SortOrder
    m4?: SortOrderInput | SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: L3StructureCountOrderByAggregateInput
    _avg?: L3StructureAvgOrderByAggregateInput
    _max?: L3StructureMaxOrderByAggregateInput
    _min?: L3StructureMinOrderByAggregateInput
    _sum?: L3StructureSumOrderByAggregateInput
  }

  export type L3StructureScalarWhereWithAggregatesInput = {
    AND?: L3StructureScalarWhereWithAggregatesInput | L3StructureScalarWhereWithAggregatesInput[]
    OR?: L3StructureScalarWhereWithAggregatesInput[]
    NOT?: L3StructureScalarWhereWithAggregatesInput | L3StructureScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"L3Structure"> | string
    fmeaId?: StringWithAggregatesFilter<"L3Structure"> | string
    l1Id?: StringWithAggregatesFilter<"L3Structure"> | string
    l2Id?: StringWithAggregatesFilter<"L3Structure"> | string
    m4?: StringNullableWithAggregatesFilter<"L3Structure"> | string | null
    name?: StringWithAggregatesFilter<"L3Structure"> | string
    order?: IntWithAggregatesFilter<"L3Structure"> | number
    createdAt?: DateTimeWithAggregatesFilter<"L3Structure"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"L3Structure"> | Date | string
  }

  export type L1FunctionWhereInput = {
    AND?: L1FunctionWhereInput | L1FunctionWhereInput[]
    OR?: L1FunctionWhereInput[]
    NOT?: L1FunctionWhereInput | L1FunctionWhereInput[]
    id?: StringFilter<"L1Function"> | string
    fmeaId?: StringFilter<"L1Function"> | string
    l1StructId?: StringFilter<"L1Function"> | string
    category?: StringFilter<"L1Function"> | string
    functionName?: StringFilter<"L1Function"> | string
    requirement?: StringFilter<"L1Function"> | string
    createdAt?: DateTimeFilter<"L1Function"> | Date | string
    updatedAt?: DateTimeFilter<"L1Function"> | Date | string
    l1Structure?: XOR<L1StructureScalarRelationFilter, L1StructureWhereInput>
    failureEffects?: FailureEffectListRelationFilter
  }

  export type L1FunctionOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1StructId?: SortOrder
    category?: SortOrder
    functionName?: SortOrder
    requirement?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l1Structure?: L1StructureOrderByWithRelationInput
    failureEffects?: FailureEffectOrderByRelationAggregateInput
  }

  export type L1FunctionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: L1FunctionWhereInput | L1FunctionWhereInput[]
    OR?: L1FunctionWhereInput[]
    NOT?: L1FunctionWhereInput | L1FunctionWhereInput[]
    fmeaId?: StringFilter<"L1Function"> | string
    l1StructId?: StringFilter<"L1Function"> | string
    category?: StringFilter<"L1Function"> | string
    functionName?: StringFilter<"L1Function"> | string
    requirement?: StringFilter<"L1Function"> | string
    createdAt?: DateTimeFilter<"L1Function"> | Date | string
    updatedAt?: DateTimeFilter<"L1Function"> | Date | string
    l1Structure?: XOR<L1StructureScalarRelationFilter, L1StructureWhereInput>
    failureEffects?: FailureEffectListRelationFilter
  }, "id">

  export type L1FunctionOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1StructId?: SortOrder
    category?: SortOrder
    functionName?: SortOrder
    requirement?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: L1FunctionCountOrderByAggregateInput
    _max?: L1FunctionMaxOrderByAggregateInput
    _min?: L1FunctionMinOrderByAggregateInput
  }

  export type L1FunctionScalarWhereWithAggregatesInput = {
    AND?: L1FunctionScalarWhereWithAggregatesInput | L1FunctionScalarWhereWithAggregatesInput[]
    OR?: L1FunctionScalarWhereWithAggregatesInput[]
    NOT?: L1FunctionScalarWhereWithAggregatesInput | L1FunctionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"L1Function"> | string
    fmeaId?: StringWithAggregatesFilter<"L1Function"> | string
    l1StructId?: StringWithAggregatesFilter<"L1Function"> | string
    category?: StringWithAggregatesFilter<"L1Function"> | string
    functionName?: StringWithAggregatesFilter<"L1Function"> | string
    requirement?: StringWithAggregatesFilter<"L1Function"> | string
    createdAt?: DateTimeWithAggregatesFilter<"L1Function"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"L1Function"> | Date | string
  }

  export type L2FunctionWhereInput = {
    AND?: L2FunctionWhereInput | L2FunctionWhereInput[]
    OR?: L2FunctionWhereInput[]
    NOT?: L2FunctionWhereInput | L2FunctionWhereInput[]
    id?: StringFilter<"L2Function"> | string
    fmeaId?: StringFilter<"L2Function"> | string
    l2StructId?: StringFilter<"L2Function"> | string
    functionName?: StringFilter<"L2Function"> | string
    productChar?: StringFilter<"L2Function"> | string
    specialChar?: StringNullableFilter<"L2Function"> | string | null
    createdAt?: DateTimeFilter<"L2Function"> | Date | string
    updatedAt?: DateTimeFilter<"L2Function"> | Date | string
    l2Structure?: XOR<L2StructureScalarRelationFilter, L2StructureWhereInput>
    failureModes?: FailureModeListRelationFilter
  }

  export type L2FunctionOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    productChar?: SortOrder
    specialChar?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l2Structure?: L2StructureOrderByWithRelationInput
    failureModes?: FailureModeOrderByRelationAggregateInput
  }

  export type L2FunctionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: L2FunctionWhereInput | L2FunctionWhereInput[]
    OR?: L2FunctionWhereInput[]
    NOT?: L2FunctionWhereInput | L2FunctionWhereInput[]
    fmeaId?: StringFilter<"L2Function"> | string
    l2StructId?: StringFilter<"L2Function"> | string
    functionName?: StringFilter<"L2Function"> | string
    productChar?: StringFilter<"L2Function"> | string
    specialChar?: StringNullableFilter<"L2Function"> | string | null
    createdAt?: DateTimeFilter<"L2Function"> | Date | string
    updatedAt?: DateTimeFilter<"L2Function"> | Date | string
    l2Structure?: XOR<L2StructureScalarRelationFilter, L2StructureWhereInput>
    failureModes?: FailureModeListRelationFilter
  }, "id">

  export type L2FunctionOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    productChar?: SortOrder
    specialChar?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: L2FunctionCountOrderByAggregateInput
    _max?: L2FunctionMaxOrderByAggregateInput
    _min?: L2FunctionMinOrderByAggregateInput
  }

  export type L2FunctionScalarWhereWithAggregatesInput = {
    AND?: L2FunctionScalarWhereWithAggregatesInput | L2FunctionScalarWhereWithAggregatesInput[]
    OR?: L2FunctionScalarWhereWithAggregatesInput[]
    NOT?: L2FunctionScalarWhereWithAggregatesInput | L2FunctionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"L2Function"> | string
    fmeaId?: StringWithAggregatesFilter<"L2Function"> | string
    l2StructId?: StringWithAggregatesFilter<"L2Function"> | string
    functionName?: StringWithAggregatesFilter<"L2Function"> | string
    productChar?: StringWithAggregatesFilter<"L2Function"> | string
    specialChar?: StringNullableWithAggregatesFilter<"L2Function"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"L2Function"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"L2Function"> | Date | string
  }

  export type L3FunctionWhereInput = {
    AND?: L3FunctionWhereInput | L3FunctionWhereInput[]
    OR?: L3FunctionWhereInput[]
    NOT?: L3FunctionWhereInput | L3FunctionWhereInput[]
    id?: StringFilter<"L3Function"> | string
    fmeaId?: StringFilter<"L3Function"> | string
    l3StructId?: StringFilter<"L3Function"> | string
    l2StructId?: StringFilter<"L3Function"> | string
    functionName?: StringFilter<"L3Function"> | string
    processChar?: StringFilter<"L3Function"> | string
    specialChar?: StringNullableFilter<"L3Function"> | string | null
    createdAt?: DateTimeFilter<"L3Function"> | Date | string
    updatedAt?: DateTimeFilter<"L3Function"> | Date | string
    l3Structure?: XOR<L3StructureScalarRelationFilter, L3StructureWhereInput>
    failureCauses?: FailureCauseListRelationFilter
  }

  export type L3FunctionOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    processChar?: SortOrder
    specialChar?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l3Structure?: L3StructureOrderByWithRelationInput
    failureCauses?: FailureCauseOrderByRelationAggregateInput
  }

  export type L3FunctionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: L3FunctionWhereInput | L3FunctionWhereInput[]
    OR?: L3FunctionWhereInput[]
    NOT?: L3FunctionWhereInput | L3FunctionWhereInput[]
    fmeaId?: StringFilter<"L3Function"> | string
    l3StructId?: StringFilter<"L3Function"> | string
    l2StructId?: StringFilter<"L3Function"> | string
    functionName?: StringFilter<"L3Function"> | string
    processChar?: StringFilter<"L3Function"> | string
    specialChar?: StringNullableFilter<"L3Function"> | string | null
    createdAt?: DateTimeFilter<"L3Function"> | Date | string
    updatedAt?: DateTimeFilter<"L3Function"> | Date | string
    l3Structure?: XOR<L3StructureScalarRelationFilter, L3StructureWhereInput>
    failureCauses?: FailureCauseListRelationFilter
  }, "id">

  export type L3FunctionOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    processChar?: SortOrder
    specialChar?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: L3FunctionCountOrderByAggregateInput
    _max?: L3FunctionMaxOrderByAggregateInput
    _min?: L3FunctionMinOrderByAggregateInput
  }

  export type L3FunctionScalarWhereWithAggregatesInput = {
    AND?: L3FunctionScalarWhereWithAggregatesInput | L3FunctionScalarWhereWithAggregatesInput[]
    OR?: L3FunctionScalarWhereWithAggregatesInput[]
    NOT?: L3FunctionScalarWhereWithAggregatesInput | L3FunctionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"L3Function"> | string
    fmeaId?: StringWithAggregatesFilter<"L3Function"> | string
    l3StructId?: StringWithAggregatesFilter<"L3Function"> | string
    l2StructId?: StringWithAggregatesFilter<"L3Function"> | string
    functionName?: StringWithAggregatesFilter<"L3Function"> | string
    processChar?: StringWithAggregatesFilter<"L3Function"> | string
    specialChar?: StringNullableWithAggregatesFilter<"L3Function"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"L3Function"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"L3Function"> | Date | string
  }

  export type FailureEffectWhereInput = {
    AND?: FailureEffectWhereInput | FailureEffectWhereInput[]
    OR?: FailureEffectWhereInput[]
    NOT?: FailureEffectWhereInput | FailureEffectWhereInput[]
    id?: StringFilter<"FailureEffect"> | string
    fmeaId?: StringFilter<"FailureEffect"> | string
    l1FuncId?: StringFilter<"FailureEffect"> | string
    category?: StringFilter<"FailureEffect"> | string
    effect?: StringFilter<"FailureEffect"> | string
    severity?: IntFilter<"FailureEffect"> | number
    createdAt?: DateTimeFilter<"FailureEffect"> | Date | string
    updatedAt?: DateTimeFilter<"FailureEffect"> | Date | string
    l1Function?: XOR<L1FunctionScalarRelationFilter, L1FunctionWhereInput>
    failureLinks?: FailureLinkListRelationFilter
  }

  export type FailureEffectOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1FuncId?: SortOrder
    category?: SortOrder
    effect?: SortOrder
    severity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l1Function?: L1FunctionOrderByWithRelationInput
    failureLinks?: FailureLinkOrderByRelationAggregateInput
  }

  export type FailureEffectWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FailureEffectWhereInput | FailureEffectWhereInput[]
    OR?: FailureEffectWhereInput[]
    NOT?: FailureEffectWhereInput | FailureEffectWhereInput[]
    fmeaId?: StringFilter<"FailureEffect"> | string
    l1FuncId?: StringFilter<"FailureEffect"> | string
    category?: StringFilter<"FailureEffect"> | string
    effect?: StringFilter<"FailureEffect"> | string
    severity?: IntFilter<"FailureEffect"> | number
    createdAt?: DateTimeFilter<"FailureEffect"> | Date | string
    updatedAt?: DateTimeFilter<"FailureEffect"> | Date | string
    l1Function?: XOR<L1FunctionScalarRelationFilter, L1FunctionWhereInput>
    failureLinks?: FailureLinkListRelationFilter
  }, "id">

  export type FailureEffectOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1FuncId?: SortOrder
    category?: SortOrder
    effect?: SortOrder
    severity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FailureEffectCountOrderByAggregateInput
    _avg?: FailureEffectAvgOrderByAggregateInput
    _max?: FailureEffectMaxOrderByAggregateInput
    _min?: FailureEffectMinOrderByAggregateInput
    _sum?: FailureEffectSumOrderByAggregateInput
  }

  export type FailureEffectScalarWhereWithAggregatesInput = {
    AND?: FailureEffectScalarWhereWithAggregatesInput | FailureEffectScalarWhereWithAggregatesInput[]
    OR?: FailureEffectScalarWhereWithAggregatesInput[]
    NOT?: FailureEffectScalarWhereWithAggregatesInput | FailureEffectScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FailureEffect"> | string
    fmeaId?: StringWithAggregatesFilter<"FailureEffect"> | string
    l1FuncId?: StringWithAggregatesFilter<"FailureEffect"> | string
    category?: StringWithAggregatesFilter<"FailureEffect"> | string
    effect?: StringWithAggregatesFilter<"FailureEffect"> | string
    severity?: IntWithAggregatesFilter<"FailureEffect"> | number
    createdAt?: DateTimeWithAggregatesFilter<"FailureEffect"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"FailureEffect"> | Date | string
  }

  export type FailureModeWhereInput = {
    AND?: FailureModeWhereInput | FailureModeWhereInput[]
    OR?: FailureModeWhereInput[]
    NOT?: FailureModeWhereInput | FailureModeWhereInput[]
    id?: StringFilter<"FailureMode"> | string
    fmeaId?: StringFilter<"FailureMode"> | string
    l2FuncId?: StringFilter<"FailureMode"> | string
    l2StructId?: StringFilter<"FailureMode"> | string
    productCharId?: StringNullableFilter<"FailureMode"> | string | null
    mode?: StringFilter<"FailureMode"> | string
    specialChar?: BoolNullableFilter<"FailureMode"> | boolean | null
    createdAt?: DateTimeFilter<"FailureMode"> | Date | string
    updatedAt?: DateTimeFilter<"FailureMode"> | Date | string
    l2Function?: XOR<L2FunctionScalarRelationFilter, L2FunctionWhereInput>
    l2Structure?: XOR<L2StructureScalarRelationFilter, L2StructureWhereInput>
    failureLinks?: FailureLinkListRelationFilter
  }

  export type FailureModeOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2FuncId?: SortOrder
    l2StructId?: SortOrder
    productCharId?: SortOrderInput | SortOrder
    mode?: SortOrder
    specialChar?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l2Function?: L2FunctionOrderByWithRelationInput
    l2Structure?: L2StructureOrderByWithRelationInput
    failureLinks?: FailureLinkOrderByRelationAggregateInput
  }

  export type FailureModeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FailureModeWhereInput | FailureModeWhereInput[]
    OR?: FailureModeWhereInput[]
    NOT?: FailureModeWhereInput | FailureModeWhereInput[]
    fmeaId?: StringFilter<"FailureMode"> | string
    l2FuncId?: StringFilter<"FailureMode"> | string
    l2StructId?: StringFilter<"FailureMode"> | string
    productCharId?: StringNullableFilter<"FailureMode"> | string | null
    mode?: StringFilter<"FailureMode"> | string
    specialChar?: BoolNullableFilter<"FailureMode"> | boolean | null
    createdAt?: DateTimeFilter<"FailureMode"> | Date | string
    updatedAt?: DateTimeFilter<"FailureMode"> | Date | string
    l2Function?: XOR<L2FunctionScalarRelationFilter, L2FunctionWhereInput>
    l2Structure?: XOR<L2StructureScalarRelationFilter, L2StructureWhereInput>
    failureLinks?: FailureLinkListRelationFilter
  }, "id">

  export type FailureModeOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2FuncId?: SortOrder
    l2StructId?: SortOrder
    productCharId?: SortOrderInput | SortOrder
    mode?: SortOrder
    specialChar?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FailureModeCountOrderByAggregateInput
    _max?: FailureModeMaxOrderByAggregateInput
    _min?: FailureModeMinOrderByAggregateInput
  }

  export type FailureModeScalarWhereWithAggregatesInput = {
    AND?: FailureModeScalarWhereWithAggregatesInput | FailureModeScalarWhereWithAggregatesInput[]
    OR?: FailureModeScalarWhereWithAggregatesInput[]
    NOT?: FailureModeScalarWhereWithAggregatesInput | FailureModeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FailureMode"> | string
    fmeaId?: StringWithAggregatesFilter<"FailureMode"> | string
    l2FuncId?: StringWithAggregatesFilter<"FailureMode"> | string
    l2StructId?: StringWithAggregatesFilter<"FailureMode"> | string
    productCharId?: StringNullableWithAggregatesFilter<"FailureMode"> | string | null
    mode?: StringWithAggregatesFilter<"FailureMode"> | string
    specialChar?: BoolNullableWithAggregatesFilter<"FailureMode"> | boolean | null
    createdAt?: DateTimeWithAggregatesFilter<"FailureMode"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"FailureMode"> | Date | string
  }

  export type FailureCauseWhereInput = {
    AND?: FailureCauseWhereInput | FailureCauseWhereInput[]
    OR?: FailureCauseWhereInput[]
    NOT?: FailureCauseWhereInput | FailureCauseWhereInput[]
    id?: StringFilter<"FailureCause"> | string
    fmeaId?: StringFilter<"FailureCause"> | string
    l3FuncId?: StringFilter<"FailureCause"> | string
    l3StructId?: StringFilter<"FailureCause"> | string
    l2StructId?: StringFilter<"FailureCause"> | string
    cause?: StringFilter<"FailureCause"> | string
    occurrence?: IntNullableFilter<"FailureCause"> | number | null
    createdAt?: DateTimeFilter<"FailureCause"> | Date | string
    updatedAt?: DateTimeFilter<"FailureCause"> | Date | string
    l3Function?: XOR<L3FunctionScalarRelationFilter, L3FunctionWhereInput>
    l3Structure?: XOR<L3StructureScalarRelationFilter, L3StructureWhereInput>
    failureLinks?: FailureLinkListRelationFilter
  }

  export type FailureCauseOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3FuncId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    cause?: SortOrder
    occurrence?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    l3Function?: L3FunctionOrderByWithRelationInput
    l3Structure?: L3StructureOrderByWithRelationInput
    failureLinks?: FailureLinkOrderByRelationAggregateInput
  }

  export type FailureCauseWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FailureCauseWhereInput | FailureCauseWhereInput[]
    OR?: FailureCauseWhereInput[]
    NOT?: FailureCauseWhereInput | FailureCauseWhereInput[]
    fmeaId?: StringFilter<"FailureCause"> | string
    l3FuncId?: StringFilter<"FailureCause"> | string
    l3StructId?: StringFilter<"FailureCause"> | string
    l2StructId?: StringFilter<"FailureCause"> | string
    cause?: StringFilter<"FailureCause"> | string
    occurrence?: IntNullableFilter<"FailureCause"> | number | null
    createdAt?: DateTimeFilter<"FailureCause"> | Date | string
    updatedAt?: DateTimeFilter<"FailureCause"> | Date | string
    l3Function?: XOR<L3FunctionScalarRelationFilter, L3FunctionWhereInput>
    l3Structure?: XOR<L3StructureScalarRelationFilter, L3StructureWhereInput>
    failureLinks?: FailureLinkListRelationFilter
  }, "id">

  export type FailureCauseOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3FuncId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    cause?: SortOrder
    occurrence?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FailureCauseCountOrderByAggregateInput
    _avg?: FailureCauseAvgOrderByAggregateInput
    _max?: FailureCauseMaxOrderByAggregateInput
    _min?: FailureCauseMinOrderByAggregateInput
    _sum?: FailureCauseSumOrderByAggregateInput
  }

  export type FailureCauseScalarWhereWithAggregatesInput = {
    AND?: FailureCauseScalarWhereWithAggregatesInput | FailureCauseScalarWhereWithAggregatesInput[]
    OR?: FailureCauseScalarWhereWithAggregatesInput[]
    NOT?: FailureCauseScalarWhereWithAggregatesInput | FailureCauseScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FailureCause"> | string
    fmeaId?: StringWithAggregatesFilter<"FailureCause"> | string
    l3FuncId?: StringWithAggregatesFilter<"FailureCause"> | string
    l3StructId?: StringWithAggregatesFilter<"FailureCause"> | string
    l2StructId?: StringWithAggregatesFilter<"FailureCause"> | string
    cause?: StringWithAggregatesFilter<"FailureCause"> | string
    occurrence?: IntNullableWithAggregatesFilter<"FailureCause"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"FailureCause"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"FailureCause"> | Date | string
  }

  export type FailureLinkWhereInput = {
    AND?: FailureLinkWhereInput | FailureLinkWhereInput[]
    OR?: FailureLinkWhereInput[]
    NOT?: FailureLinkWhereInput | FailureLinkWhereInput[]
    id?: StringFilter<"FailureLink"> | string
    fmeaId?: StringFilter<"FailureLink"> | string
    fmId?: StringFilter<"FailureLink"> | string
    feId?: StringFilter<"FailureLink"> | string
    fcId?: StringFilter<"FailureLink"> | string
    createdAt?: DateTimeFilter<"FailureLink"> | Date | string
    updatedAt?: DateTimeFilter<"FailureLink"> | Date | string
    failureMode?: XOR<FailureModeScalarRelationFilter, FailureModeWhereInput>
    failureEffect?: XOR<FailureEffectScalarRelationFilter, FailureEffectWhereInput>
    failureCause?: XOR<FailureCauseScalarRelationFilter, FailureCauseWhereInput>
    riskAnalyses?: RiskAnalysisListRelationFilter
  }

  export type FailureLinkOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    fmId?: SortOrder
    feId?: SortOrder
    fcId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    failureMode?: FailureModeOrderByWithRelationInput
    failureEffect?: FailureEffectOrderByWithRelationInput
    failureCause?: FailureCauseOrderByWithRelationInput
    riskAnalyses?: RiskAnalysisOrderByRelationAggregateInput
  }

  export type FailureLinkWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FailureLinkWhereInput | FailureLinkWhereInput[]
    OR?: FailureLinkWhereInput[]
    NOT?: FailureLinkWhereInput | FailureLinkWhereInput[]
    fmeaId?: StringFilter<"FailureLink"> | string
    fmId?: StringFilter<"FailureLink"> | string
    feId?: StringFilter<"FailureLink"> | string
    fcId?: StringFilter<"FailureLink"> | string
    createdAt?: DateTimeFilter<"FailureLink"> | Date | string
    updatedAt?: DateTimeFilter<"FailureLink"> | Date | string
    failureMode?: XOR<FailureModeScalarRelationFilter, FailureModeWhereInput>
    failureEffect?: XOR<FailureEffectScalarRelationFilter, FailureEffectWhereInput>
    failureCause?: XOR<FailureCauseScalarRelationFilter, FailureCauseWhereInput>
    riskAnalyses?: RiskAnalysisListRelationFilter
  }, "id">

  export type FailureLinkOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    fmId?: SortOrder
    feId?: SortOrder
    fcId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FailureLinkCountOrderByAggregateInput
    _max?: FailureLinkMaxOrderByAggregateInput
    _min?: FailureLinkMinOrderByAggregateInput
  }

  export type FailureLinkScalarWhereWithAggregatesInput = {
    AND?: FailureLinkScalarWhereWithAggregatesInput | FailureLinkScalarWhereWithAggregatesInput[]
    OR?: FailureLinkScalarWhereWithAggregatesInput[]
    NOT?: FailureLinkScalarWhereWithAggregatesInput | FailureLinkScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FailureLink"> | string
    fmeaId?: StringWithAggregatesFilter<"FailureLink"> | string
    fmId?: StringWithAggregatesFilter<"FailureLink"> | string
    feId?: StringWithAggregatesFilter<"FailureLink"> | string
    fcId?: StringWithAggregatesFilter<"FailureLink"> | string
    createdAt?: DateTimeWithAggregatesFilter<"FailureLink"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"FailureLink"> | Date | string
  }

  export type RiskAnalysisWhereInput = {
    AND?: RiskAnalysisWhereInput | RiskAnalysisWhereInput[]
    OR?: RiskAnalysisWhereInput[]
    NOT?: RiskAnalysisWhereInput | RiskAnalysisWhereInput[]
    id?: StringFilter<"RiskAnalysis"> | string
    fmeaId?: StringFilter<"RiskAnalysis"> | string
    linkId?: StringFilter<"RiskAnalysis"> | string
    severity?: IntFilter<"RiskAnalysis"> | number
    occurrence?: IntFilter<"RiskAnalysis"> | number
    detection?: IntFilter<"RiskAnalysis"> | number
    ap?: StringFilter<"RiskAnalysis"> | string
    preventionControl?: StringNullableFilter<"RiskAnalysis"> | string | null
    detectionControl?: StringNullableFilter<"RiskAnalysis"> | string | null
    createdAt?: DateTimeFilter<"RiskAnalysis"> | Date | string
    updatedAt?: DateTimeFilter<"RiskAnalysis"> | Date | string
    failureLink?: XOR<FailureLinkScalarRelationFilter, FailureLinkWhereInput>
    optimizations?: OptimizationListRelationFilter
  }

  export type RiskAnalysisOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    linkId?: SortOrder
    severity?: SortOrder
    occurrence?: SortOrder
    detection?: SortOrder
    ap?: SortOrder
    preventionControl?: SortOrderInput | SortOrder
    detectionControl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    failureLink?: FailureLinkOrderByWithRelationInput
    optimizations?: OptimizationOrderByRelationAggregateInput
  }

  export type RiskAnalysisWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RiskAnalysisWhereInput | RiskAnalysisWhereInput[]
    OR?: RiskAnalysisWhereInput[]
    NOT?: RiskAnalysisWhereInput | RiskAnalysisWhereInput[]
    fmeaId?: StringFilter<"RiskAnalysis"> | string
    linkId?: StringFilter<"RiskAnalysis"> | string
    severity?: IntFilter<"RiskAnalysis"> | number
    occurrence?: IntFilter<"RiskAnalysis"> | number
    detection?: IntFilter<"RiskAnalysis"> | number
    ap?: StringFilter<"RiskAnalysis"> | string
    preventionControl?: StringNullableFilter<"RiskAnalysis"> | string | null
    detectionControl?: StringNullableFilter<"RiskAnalysis"> | string | null
    createdAt?: DateTimeFilter<"RiskAnalysis"> | Date | string
    updatedAt?: DateTimeFilter<"RiskAnalysis"> | Date | string
    failureLink?: XOR<FailureLinkScalarRelationFilter, FailureLinkWhereInput>
    optimizations?: OptimizationListRelationFilter
  }, "id">

  export type RiskAnalysisOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    linkId?: SortOrder
    severity?: SortOrder
    occurrence?: SortOrder
    detection?: SortOrder
    ap?: SortOrder
    preventionControl?: SortOrderInput | SortOrder
    detectionControl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RiskAnalysisCountOrderByAggregateInput
    _avg?: RiskAnalysisAvgOrderByAggregateInput
    _max?: RiskAnalysisMaxOrderByAggregateInput
    _min?: RiskAnalysisMinOrderByAggregateInput
    _sum?: RiskAnalysisSumOrderByAggregateInput
  }

  export type RiskAnalysisScalarWhereWithAggregatesInput = {
    AND?: RiskAnalysisScalarWhereWithAggregatesInput | RiskAnalysisScalarWhereWithAggregatesInput[]
    OR?: RiskAnalysisScalarWhereWithAggregatesInput[]
    NOT?: RiskAnalysisScalarWhereWithAggregatesInput | RiskAnalysisScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RiskAnalysis"> | string
    fmeaId?: StringWithAggregatesFilter<"RiskAnalysis"> | string
    linkId?: StringWithAggregatesFilter<"RiskAnalysis"> | string
    severity?: IntWithAggregatesFilter<"RiskAnalysis"> | number
    occurrence?: IntWithAggregatesFilter<"RiskAnalysis"> | number
    detection?: IntWithAggregatesFilter<"RiskAnalysis"> | number
    ap?: StringWithAggregatesFilter<"RiskAnalysis"> | string
    preventionControl?: StringNullableWithAggregatesFilter<"RiskAnalysis"> | string | null
    detectionControl?: StringNullableWithAggregatesFilter<"RiskAnalysis"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"RiskAnalysis"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RiskAnalysis"> | Date | string
  }

  export type OptimizationWhereInput = {
    AND?: OptimizationWhereInput | OptimizationWhereInput[]
    OR?: OptimizationWhereInput[]
    NOT?: OptimizationWhereInput | OptimizationWhereInput[]
    id?: StringFilter<"Optimization"> | string
    fmeaId?: StringFilter<"Optimization"> | string
    riskId?: StringFilter<"Optimization"> | string
    recommendedAction?: StringFilter<"Optimization"> | string
    responsible?: StringFilter<"Optimization"> | string
    targetDate?: StringFilter<"Optimization"> | string
    newSeverity?: IntNullableFilter<"Optimization"> | number | null
    newOccurrence?: IntNullableFilter<"Optimization"> | number | null
    newDetection?: IntNullableFilter<"Optimization"> | number | null
    newAP?: StringNullableFilter<"Optimization"> | string | null
    status?: StringFilter<"Optimization"> | string
    completedDate?: StringNullableFilter<"Optimization"> | string | null
    createdAt?: DateTimeFilter<"Optimization"> | Date | string
    updatedAt?: DateTimeFilter<"Optimization"> | Date | string
    riskAnalysis?: XOR<RiskAnalysisScalarRelationFilter, RiskAnalysisWhereInput>
  }

  export type OptimizationOrderByWithRelationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    riskId?: SortOrder
    recommendedAction?: SortOrder
    responsible?: SortOrder
    targetDate?: SortOrder
    newSeverity?: SortOrderInput | SortOrder
    newOccurrence?: SortOrderInput | SortOrder
    newDetection?: SortOrderInput | SortOrder
    newAP?: SortOrderInput | SortOrder
    status?: SortOrder
    completedDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    riskAnalysis?: RiskAnalysisOrderByWithRelationInput
  }

  export type OptimizationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: OptimizationWhereInput | OptimizationWhereInput[]
    OR?: OptimizationWhereInput[]
    NOT?: OptimizationWhereInput | OptimizationWhereInput[]
    fmeaId?: StringFilter<"Optimization"> | string
    riskId?: StringFilter<"Optimization"> | string
    recommendedAction?: StringFilter<"Optimization"> | string
    responsible?: StringFilter<"Optimization"> | string
    targetDate?: StringFilter<"Optimization"> | string
    newSeverity?: IntNullableFilter<"Optimization"> | number | null
    newOccurrence?: IntNullableFilter<"Optimization"> | number | null
    newDetection?: IntNullableFilter<"Optimization"> | number | null
    newAP?: StringNullableFilter<"Optimization"> | string | null
    status?: StringFilter<"Optimization"> | string
    completedDate?: StringNullableFilter<"Optimization"> | string | null
    createdAt?: DateTimeFilter<"Optimization"> | Date | string
    updatedAt?: DateTimeFilter<"Optimization"> | Date | string
    riskAnalysis?: XOR<RiskAnalysisScalarRelationFilter, RiskAnalysisWhereInput>
  }, "id">

  export type OptimizationOrderByWithAggregationInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    riskId?: SortOrder
    recommendedAction?: SortOrder
    responsible?: SortOrder
    targetDate?: SortOrder
    newSeverity?: SortOrderInput | SortOrder
    newOccurrence?: SortOrderInput | SortOrder
    newDetection?: SortOrderInput | SortOrder
    newAP?: SortOrderInput | SortOrder
    status?: SortOrder
    completedDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: OptimizationCountOrderByAggregateInput
    _avg?: OptimizationAvgOrderByAggregateInput
    _max?: OptimizationMaxOrderByAggregateInput
    _min?: OptimizationMinOrderByAggregateInput
    _sum?: OptimizationSumOrderByAggregateInput
  }

  export type OptimizationScalarWhereWithAggregatesInput = {
    AND?: OptimizationScalarWhereWithAggregatesInput | OptimizationScalarWhereWithAggregatesInput[]
    OR?: OptimizationScalarWhereWithAggregatesInput[]
    NOT?: OptimizationScalarWhereWithAggregatesInput | OptimizationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Optimization"> | string
    fmeaId?: StringWithAggregatesFilter<"Optimization"> | string
    riskId?: StringWithAggregatesFilter<"Optimization"> | string
    recommendedAction?: StringWithAggregatesFilter<"Optimization"> | string
    responsible?: StringWithAggregatesFilter<"Optimization"> | string
    targetDate?: StringWithAggregatesFilter<"Optimization"> | string
    newSeverity?: IntNullableWithAggregatesFilter<"Optimization"> | number | null
    newOccurrence?: IntNullableWithAggregatesFilter<"Optimization"> | number | null
    newDetection?: IntNullableWithAggregatesFilter<"Optimization"> | number | null
    newAP?: StringNullableWithAggregatesFilter<"Optimization"> | string | null
    status?: StringWithAggregatesFilter<"Optimization"> | string
    completedDate?: StringNullableWithAggregatesFilter<"Optimization"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Optimization"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Optimization"> | Date | string
  }

  export type APQPProjectCreateInput = {
    id?: string
    name: string
    productName: string
    customerName: string
    status: string
    startDate?: string | null
    targetDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type APQPProjectUncheckedCreateInput = {
    id?: string
    name: string
    productName: string
    customerName: string
    status: string
    startDate?: string | null
    targetDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type APQPProjectUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    productName?: StringFieldUpdateOperationsInput | string
    customerName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    targetDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type APQPProjectUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    productName?: StringFieldUpdateOperationsInput | string
    customerName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    targetDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type APQPProjectCreateManyInput = {
    id?: string
    name: string
    productName: string
    customerName: string
    status: string
    startDate?: string | null
    targetDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type APQPProjectUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    productName?: StringFieldUpdateOperationsInput | string
    customerName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    targetDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type APQPProjectUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    productName?: StringFieldUpdateOperationsInput | string
    customerName?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    targetDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L1StructureCreateInput = {
    id?: string
    fmeaId: string
    name: string
    confirmed?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structures?: L2StructureCreateNestedManyWithoutL1StructureInput
    l1Functions?: L1FunctionCreateNestedManyWithoutL1StructureInput
  }

  export type L1StructureUncheckedCreateInput = {
    id?: string
    fmeaId: string
    name: string
    confirmed?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structures?: L2StructureUncheckedCreateNestedManyWithoutL1StructureInput
    l1Functions?: L1FunctionUncheckedCreateNestedManyWithoutL1StructureInput
  }

  export type L1StructureUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structures?: L2StructureUpdateManyWithoutL1StructureNestedInput
    l1Functions?: L1FunctionUpdateManyWithoutL1StructureNestedInput
  }

  export type L1StructureUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structures?: L2StructureUncheckedUpdateManyWithoutL1StructureNestedInput
    l1Functions?: L1FunctionUncheckedUpdateManyWithoutL1StructureNestedInput
  }

  export type L1StructureCreateManyInput = {
    id?: string
    fmeaId: string
    name: string
    confirmed?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L1StructureUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L1StructureUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L2StructureCreateInput = {
    id?: string
    fmeaId: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Structure: L1StructureCreateNestedOneWithoutL2StructuresInput
    l3Structures?: L3StructureCreateNestedManyWithoutL2StructureInput
    l2Functions?: L2FunctionCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l1Id: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structures?: L3StructureUncheckedCreateNestedManyWithoutL2StructureInput
    l2Functions?: L2FunctionUncheckedCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeUncheckedCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Structure?: L1StructureUpdateOneRequiredWithoutL2StructuresNestedInput
    l3Structures?: L3StructureUpdateManyWithoutL2StructureNestedInput
    l2Functions?: L2FunctionUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUpdateManyWithoutL2StructureNestedInput
  }

  export type L2StructureUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structures?: L3StructureUncheckedUpdateManyWithoutL2StructureNestedInput
    l2Functions?: L2FunctionUncheckedUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUncheckedUpdateManyWithoutL2StructureNestedInput
  }

  export type L2StructureCreateManyInput = {
    id?: string
    fmeaId: string
    l1Id: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L2StructureUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L2StructureUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L3StructureCreateInput = {
    id?: string
    fmeaId: string
    l1Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structure: L2StructureCreateNestedOneWithoutL3StructuresInput
    l3Functions?: L3FunctionCreateNestedManyWithoutL3StructureInput
    failureCauses?: FailureCauseCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l1Id: string
    l2Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Functions?: L3FunctionUncheckedCreateNestedManyWithoutL3StructureInput
    failureCauses?: FailureCauseUncheckedCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structure?: L2StructureUpdateOneRequiredWithoutL3StructuresNestedInput
    l3Functions?: L3FunctionUpdateManyWithoutL3StructureNestedInput
    failureCauses?: FailureCauseUpdateManyWithoutL3StructureNestedInput
  }

  export type L3StructureUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    l2Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Functions?: L3FunctionUncheckedUpdateManyWithoutL3StructureNestedInput
    failureCauses?: FailureCauseUncheckedUpdateManyWithoutL3StructureNestedInput
  }

  export type L3StructureCreateManyInput = {
    id?: string
    fmeaId: string
    l1Id: string
    l2Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L3StructureUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L3StructureUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    l2Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L1FunctionCreateInput = {
    id?: string
    fmeaId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Structure: L1StructureCreateNestedOneWithoutL1FunctionsInput
    failureEffects?: FailureEffectCreateNestedManyWithoutL1FunctionInput
  }

  export type L1FunctionUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l1StructId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureEffects?: FailureEffectUncheckedCreateNestedManyWithoutL1FunctionInput
  }

  export type L1FunctionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Structure?: L1StructureUpdateOneRequiredWithoutL1FunctionsNestedInput
    failureEffects?: FailureEffectUpdateManyWithoutL1FunctionNestedInput
  }

  export type L1FunctionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1StructId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureEffects?: FailureEffectUncheckedUpdateManyWithoutL1FunctionNestedInput
  }

  export type L1FunctionCreateManyInput = {
    id?: string
    fmeaId: string
    l1StructId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L1FunctionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L1FunctionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1StructId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L2FunctionCreateInput = {
    id?: string
    fmeaId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structure: L2StructureCreateNestedOneWithoutL2FunctionsInput
    failureModes?: FailureModeCreateNestedManyWithoutL2FunctionInput
  }

  export type L2FunctionUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureModes?: FailureModeUncheckedCreateNestedManyWithoutL2FunctionInput
  }

  export type L2FunctionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structure?: L2StructureUpdateOneRequiredWithoutL2FunctionsNestedInput
    failureModes?: FailureModeUpdateManyWithoutL2FunctionNestedInput
  }

  export type L2FunctionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureModes?: FailureModeUncheckedUpdateManyWithoutL2FunctionNestedInput
  }

  export type L2FunctionCreateManyInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L2FunctionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L2FunctionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L3FunctionCreateInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structure: L3StructureCreateNestedOneWithoutL3FunctionsInput
    failureCauses?: FailureCauseCreateNestedManyWithoutL3FunctionInput
  }

  export type L3FunctionUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l3StructId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureCauses?: FailureCauseUncheckedCreateNestedManyWithoutL3FunctionInput
  }

  export type L3FunctionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structure?: L3StructureUpdateOneRequiredWithoutL3FunctionsNestedInput
    failureCauses?: FailureCauseUpdateManyWithoutL3FunctionNestedInput
  }

  export type L3FunctionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureCauses?: FailureCauseUncheckedUpdateManyWithoutL3FunctionNestedInput
  }

  export type L3FunctionCreateManyInput = {
    id?: string
    fmeaId: string
    l3StructId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L3FunctionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L3FunctionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureEffectCreateInput = {
    id?: string
    fmeaId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Function: L1FunctionCreateNestedOneWithoutFailureEffectsInput
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureEffectInput
  }

  export type FailureEffectUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l1FuncId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureEffectInput
  }

  export type FailureEffectUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Function?: L1FunctionUpdateOneRequiredWithoutFailureEffectsNestedInput
    failureLinks?: FailureLinkUpdateManyWithoutFailureEffectNestedInput
  }

  export type FailureEffectUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1FuncId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureEffectNestedInput
  }

  export type FailureEffectCreateManyInput = {
    id?: string
    fmeaId: string
    l1FuncId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureEffectUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureEffectUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1FuncId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureModeCreateInput = {
    id?: string
    fmeaId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Function: L2FunctionCreateNestedOneWithoutFailureModesInput
    l2Structure: L2StructureCreateNestedOneWithoutFailureModesInput
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureModeInput
  }

  export type FailureModeUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l2FuncId: string
    l2StructId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureModeInput
  }

  export type FailureModeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Function?: L2FunctionUpdateOneRequiredWithoutFailureModesNestedInput
    l2Structure?: L2StructureUpdateOneRequiredWithoutFailureModesNestedInput
    failureLinks?: FailureLinkUpdateManyWithoutFailureModeNestedInput
  }

  export type FailureModeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2FuncId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureModeNestedInput
  }

  export type FailureModeCreateManyInput = {
    id?: string
    fmeaId: string
    l2FuncId: string
    l2StructId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureModeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureModeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2FuncId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureCauseCreateInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Function: L3FunctionCreateNestedOneWithoutFailureCausesInput
    l3Structure: L3StructureCreateNestedOneWithoutFailureCausesInput
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureCauseInput
  }

  export type FailureCauseUncheckedCreateInput = {
    id?: string
    fmeaId: string
    l3FuncId: string
    l3StructId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureCauseInput
  }

  export type FailureCauseUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Function?: L3FunctionUpdateOneRequiredWithoutFailureCausesNestedInput
    l3Structure?: L3StructureUpdateOneRequiredWithoutFailureCausesNestedInput
    failureLinks?: FailureLinkUpdateManyWithoutFailureCauseNestedInput
  }

  export type FailureCauseUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3FuncId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureCauseNestedInput
  }

  export type FailureCauseCreateManyInput = {
    id?: string
    fmeaId: string
    l3FuncId: string
    l3StructId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureCauseUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureCauseUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3FuncId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureLinkCreateInput = {
    id?: string
    fmeaId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureMode: FailureModeCreateNestedOneWithoutFailureLinksInput
    failureEffect: FailureEffectCreateNestedOneWithoutFailureLinksInput
    failureCause: FailureCauseCreateNestedOneWithoutFailureLinksInput
    riskAnalyses?: RiskAnalysisCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkUncheckedCreateInput = {
    id?: string
    fmeaId: string
    fmId: string
    feId: string
    fcId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    riskAnalyses?: RiskAnalysisUncheckedCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureMode?: FailureModeUpdateOneRequiredWithoutFailureLinksNestedInput
    failureEffect?: FailureEffectUpdateOneRequiredWithoutFailureLinksNestedInput
    failureCause?: FailureCauseUpdateOneRequiredWithoutFailureLinksNestedInput
    riskAnalyses?: RiskAnalysisUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    fmId?: StringFieldUpdateOperationsInput | string
    feId?: StringFieldUpdateOperationsInput | string
    fcId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    riskAnalyses?: RiskAnalysisUncheckedUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkCreateManyInput = {
    id?: string
    fmeaId: string
    fmId: string
    feId: string
    fcId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureLinkUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureLinkUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    fmId?: StringFieldUpdateOperationsInput | string
    feId?: StringFieldUpdateOperationsInput | string
    fcId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RiskAnalysisCreateInput = {
    id?: string
    fmeaId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLink: FailureLinkCreateNestedOneWithoutRiskAnalysesInput
    optimizations?: OptimizationCreateNestedManyWithoutRiskAnalysisInput
  }

  export type RiskAnalysisUncheckedCreateInput = {
    id?: string
    fmeaId: string
    linkId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    optimizations?: OptimizationUncheckedCreateNestedManyWithoutRiskAnalysisInput
  }

  export type RiskAnalysisUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLink?: FailureLinkUpdateOneRequiredWithoutRiskAnalysesNestedInput
    optimizations?: OptimizationUpdateManyWithoutRiskAnalysisNestedInput
  }

  export type RiskAnalysisUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    linkId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    optimizations?: OptimizationUncheckedUpdateManyWithoutRiskAnalysisNestedInput
  }

  export type RiskAnalysisCreateManyInput = {
    id?: string
    fmeaId: string
    linkId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RiskAnalysisUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RiskAnalysisUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    linkId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OptimizationCreateInput = {
    id?: string
    fmeaId: string
    recommendedAction: string
    responsible: string
    targetDate: string
    newSeverity?: number | null
    newOccurrence?: number | null
    newDetection?: number | null
    newAP?: string | null
    status: string
    completedDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    riskAnalysis: RiskAnalysisCreateNestedOneWithoutOptimizationsInput
  }

  export type OptimizationUncheckedCreateInput = {
    id?: string
    fmeaId: string
    riskId: string
    recommendedAction: string
    responsible: string
    targetDate: string
    newSeverity?: number | null
    newOccurrence?: number | null
    newDetection?: number | null
    newAP?: string | null
    status: string
    completedDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OptimizationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    recommendedAction?: StringFieldUpdateOperationsInput | string
    responsible?: StringFieldUpdateOperationsInput | string
    targetDate?: StringFieldUpdateOperationsInput | string
    newSeverity?: NullableIntFieldUpdateOperationsInput | number | null
    newOccurrence?: NullableIntFieldUpdateOperationsInput | number | null
    newDetection?: NullableIntFieldUpdateOperationsInput | number | null
    newAP?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    completedDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    riskAnalysis?: RiskAnalysisUpdateOneRequiredWithoutOptimizationsNestedInput
  }

  export type OptimizationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    riskId?: StringFieldUpdateOperationsInput | string
    recommendedAction?: StringFieldUpdateOperationsInput | string
    responsible?: StringFieldUpdateOperationsInput | string
    targetDate?: StringFieldUpdateOperationsInput | string
    newSeverity?: NullableIntFieldUpdateOperationsInput | number | null
    newOccurrence?: NullableIntFieldUpdateOperationsInput | number | null
    newDetection?: NullableIntFieldUpdateOperationsInput | number | null
    newAP?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    completedDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OptimizationCreateManyInput = {
    id?: string
    fmeaId: string
    riskId: string
    recommendedAction: string
    responsible: string
    targetDate: string
    newSeverity?: number | null
    newOccurrence?: number | null
    newDetection?: number | null
    newAP?: string | null
    status: string
    completedDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OptimizationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    recommendedAction?: StringFieldUpdateOperationsInput | string
    responsible?: StringFieldUpdateOperationsInput | string
    targetDate?: StringFieldUpdateOperationsInput | string
    newSeverity?: NullableIntFieldUpdateOperationsInput | number | null
    newOccurrence?: NullableIntFieldUpdateOperationsInput | number | null
    newDetection?: NullableIntFieldUpdateOperationsInput | number | null
    newAP?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    completedDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OptimizationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    riskId?: StringFieldUpdateOperationsInput | string
    recommendedAction?: StringFieldUpdateOperationsInput | string
    responsible?: StringFieldUpdateOperationsInput | string
    targetDate?: StringFieldUpdateOperationsInput | string
    newSeverity?: NullableIntFieldUpdateOperationsInput | number | null
    newOccurrence?: NullableIntFieldUpdateOperationsInput | number | null
    newDetection?: NullableIntFieldUpdateOperationsInput | number | null
    newAP?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    completedDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type APQPProjectCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    productName?: SortOrder
    customerName?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    targetDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type APQPProjectMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    productName?: SortOrder
    customerName?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    targetDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type APQPProjectMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    productName?: SortOrder
    customerName?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    targetDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type L2StructureListRelationFilter = {
    every?: L2StructureWhereInput
    some?: L2StructureWhereInput
    none?: L2StructureWhereInput
  }

  export type L1FunctionListRelationFilter = {
    every?: L1FunctionWhereInput
    some?: L1FunctionWhereInput
    none?: L1FunctionWhereInput
  }

  export type L2StructureOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type L1FunctionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type L1StructureCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    name?: SortOrder
    confirmed?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L1StructureMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    name?: SortOrder
    confirmed?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L1StructureMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    name?: SortOrder
    confirmed?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type L1StructureScalarRelationFilter = {
    is?: L1StructureWhereInput
    isNot?: L1StructureWhereInput
  }

  export type L3StructureListRelationFilter = {
    every?: L3StructureWhereInput
    some?: L3StructureWhereInput
    none?: L3StructureWhereInput
  }

  export type L2FunctionListRelationFilter = {
    every?: L2FunctionWhereInput
    some?: L2FunctionWhereInput
    none?: L2FunctionWhereInput
  }

  export type FailureModeListRelationFilter = {
    every?: FailureModeWhereInput
    some?: FailureModeWhereInput
    none?: FailureModeWhereInput
  }

  export type L3StructureOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type L2FunctionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FailureModeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type L2StructureCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    no?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L2StructureAvgOrderByAggregateInput = {
    order?: SortOrder
  }

  export type L2StructureMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    no?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L2StructureMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    no?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L2StructureSumOrderByAggregateInput = {
    order?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type L2StructureScalarRelationFilter = {
    is?: L2StructureWhereInput
    isNot?: L2StructureWhereInput
  }

  export type L3FunctionListRelationFilter = {
    every?: L3FunctionWhereInput
    some?: L3FunctionWhereInput
    none?: L3FunctionWhereInput
  }

  export type FailureCauseListRelationFilter = {
    every?: FailureCauseWhereInput
    some?: FailureCauseWhereInput
    none?: FailureCauseWhereInput
  }

  export type L3FunctionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FailureCauseOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type L3StructureCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    l2Id?: SortOrder
    m4?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L3StructureAvgOrderByAggregateInput = {
    order?: SortOrder
  }

  export type L3StructureMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    l2Id?: SortOrder
    m4?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L3StructureMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1Id?: SortOrder
    l2Id?: SortOrder
    m4?: SortOrder
    name?: SortOrder
    order?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L3StructureSumOrderByAggregateInput = {
    order?: SortOrder
  }

  export type FailureEffectListRelationFilter = {
    every?: FailureEffectWhereInput
    some?: FailureEffectWhereInput
    none?: FailureEffectWhereInput
  }

  export type FailureEffectOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type L1FunctionCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1StructId?: SortOrder
    category?: SortOrder
    functionName?: SortOrder
    requirement?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L1FunctionMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1StructId?: SortOrder
    category?: SortOrder
    functionName?: SortOrder
    requirement?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L1FunctionMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1StructId?: SortOrder
    category?: SortOrder
    functionName?: SortOrder
    requirement?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L2FunctionCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    productChar?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L2FunctionMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    productChar?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L2FunctionMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    productChar?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L3StructureScalarRelationFilter = {
    is?: L3StructureWhereInput
    isNot?: L3StructureWhereInput
  }

  export type L3FunctionCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    processChar?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L3FunctionMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    processChar?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L3FunctionMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    functionName?: SortOrder
    processChar?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type L1FunctionScalarRelationFilter = {
    is?: L1FunctionWhereInput
    isNot?: L1FunctionWhereInput
  }

  export type FailureLinkListRelationFilter = {
    every?: FailureLinkWhereInput
    some?: FailureLinkWhereInput
    none?: FailureLinkWhereInput
  }

  export type FailureLinkOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FailureEffectCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1FuncId?: SortOrder
    category?: SortOrder
    effect?: SortOrder
    severity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureEffectAvgOrderByAggregateInput = {
    severity?: SortOrder
  }

  export type FailureEffectMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1FuncId?: SortOrder
    category?: SortOrder
    effect?: SortOrder
    severity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureEffectMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l1FuncId?: SortOrder
    category?: SortOrder
    effect?: SortOrder
    severity?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureEffectSumOrderByAggregateInput = {
    severity?: SortOrder
  }

  export type L2FunctionScalarRelationFilter = {
    is?: L2FunctionWhereInput
    isNot?: L2FunctionWhereInput
  }

  export type FailureModeCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2FuncId?: SortOrder
    l2StructId?: SortOrder
    productCharId?: SortOrder
    mode?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureModeMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2FuncId?: SortOrder
    l2StructId?: SortOrder
    productCharId?: SortOrder
    mode?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureModeMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l2FuncId?: SortOrder
    l2StructId?: SortOrder
    productCharId?: SortOrder
    mode?: SortOrder
    specialChar?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type L3FunctionScalarRelationFilter = {
    is?: L3FunctionWhereInput
    isNot?: L3FunctionWhereInput
  }

  export type FailureCauseCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3FuncId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    cause?: SortOrder
    occurrence?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureCauseAvgOrderByAggregateInput = {
    occurrence?: SortOrder
  }

  export type FailureCauseMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3FuncId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    cause?: SortOrder
    occurrence?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureCauseMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    l3FuncId?: SortOrder
    l3StructId?: SortOrder
    l2StructId?: SortOrder
    cause?: SortOrder
    occurrence?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureCauseSumOrderByAggregateInput = {
    occurrence?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type FailureModeScalarRelationFilter = {
    is?: FailureModeWhereInput
    isNot?: FailureModeWhereInput
  }

  export type FailureEffectScalarRelationFilter = {
    is?: FailureEffectWhereInput
    isNot?: FailureEffectWhereInput
  }

  export type FailureCauseScalarRelationFilter = {
    is?: FailureCauseWhereInput
    isNot?: FailureCauseWhereInput
  }

  export type RiskAnalysisListRelationFilter = {
    every?: RiskAnalysisWhereInput
    some?: RiskAnalysisWhereInput
    none?: RiskAnalysisWhereInput
  }

  export type RiskAnalysisOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FailureLinkCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    fmId?: SortOrder
    feId?: SortOrder
    fcId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureLinkMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    fmId?: SortOrder
    feId?: SortOrder
    fcId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureLinkMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    fmId?: SortOrder
    feId?: SortOrder
    fcId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FailureLinkScalarRelationFilter = {
    is?: FailureLinkWhereInput
    isNot?: FailureLinkWhereInput
  }

  export type OptimizationListRelationFilter = {
    every?: OptimizationWhereInput
    some?: OptimizationWhereInput
    none?: OptimizationWhereInput
  }

  export type OptimizationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RiskAnalysisCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    linkId?: SortOrder
    severity?: SortOrder
    occurrence?: SortOrder
    detection?: SortOrder
    ap?: SortOrder
    preventionControl?: SortOrder
    detectionControl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RiskAnalysisAvgOrderByAggregateInput = {
    severity?: SortOrder
    occurrence?: SortOrder
    detection?: SortOrder
  }

  export type RiskAnalysisMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    linkId?: SortOrder
    severity?: SortOrder
    occurrence?: SortOrder
    detection?: SortOrder
    ap?: SortOrder
    preventionControl?: SortOrder
    detectionControl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RiskAnalysisMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    linkId?: SortOrder
    severity?: SortOrder
    occurrence?: SortOrder
    detection?: SortOrder
    ap?: SortOrder
    preventionControl?: SortOrder
    detectionControl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RiskAnalysisSumOrderByAggregateInput = {
    severity?: SortOrder
    occurrence?: SortOrder
    detection?: SortOrder
  }

  export type RiskAnalysisScalarRelationFilter = {
    is?: RiskAnalysisWhereInput
    isNot?: RiskAnalysisWhereInput
  }

  export type OptimizationCountOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    riskId?: SortOrder
    recommendedAction?: SortOrder
    responsible?: SortOrder
    targetDate?: SortOrder
    newSeverity?: SortOrder
    newOccurrence?: SortOrder
    newDetection?: SortOrder
    newAP?: SortOrder
    status?: SortOrder
    completedDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OptimizationAvgOrderByAggregateInput = {
    newSeverity?: SortOrder
    newOccurrence?: SortOrder
    newDetection?: SortOrder
  }

  export type OptimizationMaxOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    riskId?: SortOrder
    recommendedAction?: SortOrder
    responsible?: SortOrder
    targetDate?: SortOrder
    newSeverity?: SortOrder
    newOccurrence?: SortOrder
    newDetection?: SortOrder
    newAP?: SortOrder
    status?: SortOrder
    completedDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OptimizationMinOrderByAggregateInput = {
    id?: SortOrder
    fmeaId?: SortOrder
    riskId?: SortOrder
    recommendedAction?: SortOrder
    responsible?: SortOrder
    targetDate?: SortOrder
    newSeverity?: SortOrder
    newOccurrence?: SortOrder
    newDetection?: SortOrder
    newAP?: SortOrder
    status?: SortOrder
    completedDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OptimizationSumOrderByAggregateInput = {
    newSeverity?: SortOrder
    newOccurrence?: SortOrder
    newDetection?: SortOrder
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type L2StructureCreateNestedManyWithoutL1StructureInput = {
    create?: XOR<L2StructureCreateWithoutL1StructureInput, L2StructureUncheckedCreateWithoutL1StructureInput> | L2StructureCreateWithoutL1StructureInput[] | L2StructureUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L2StructureCreateOrConnectWithoutL1StructureInput | L2StructureCreateOrConnectWithoutL1StructureInput[]
    createMany?: L2StructureCreateManyL1StructureInputEnvelope
    connect?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
  }

  export type L1FunctionCreateNestedManyWithoutL1StructureInput = {
    create?: XOR<L1FunctionCreateWithoutL1StructureInput, L1FunctionUncheckedCreateWithoutL1StructureInput> | L1FunctionCreateWithoutL1StructureInput[] | L1FunctionUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L1FunctionCreateOrConnectWithoutL1StructureInput | L1FunctionCreateOrConnectWithoutL1StructureInput[]
    createMany?: L1FunctionCreateManyL1StructureInputEnvelope
    connect?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
  }

  export type L2StructureUncheckedCreateNestedManyWithoutL1StructureInput = {
    create?: XOR<L2StructureCreateWithoutL1StructureInput, L2StructureUncheckedCreateWithoutL1StructureInput> | L2StructureCreateWithoutL1StructureInput[] | L2StructureUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L2StructureCreateOrConnectWithoutL1StructureInput | L2StructureCreateOrConnectWithoutL1StructureInput[]
    createMany?: L2StructureCreateManyL1StructureInputEnvelope
    connect?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
  }

  export type L1FunctionUncheckedCreateNestedManyWithoutL1StructureInput = {
    create?: XOR<L1FunctionCreateWithoutL1StructureInput, L1FunctionUncheckedCreateWithoutL1StructureInput> | L1FunctionCreateWithoutL1StructureInput[] | L1FunctionUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L1FunctionCreateOrConnectWithoutL1StructureInput | L1FunctionCreateOrConnectWithoutL1StructureInput[]
    createMany?: L1FunctionCreateManyL1StructureInputEnvelope
    connect?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type L2StructureUpdateManyWithoutL1StructureNestedInput = {
    create?: XOR<L2StructureCreateWithoutL1StructureInput, L2StructureUncheckedCreateWithoutL1StructureInput> | L2StructureCreateWithoutL1StructureInput[] | L2StructureUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L2StructureCreateOrConnectWithoutL1StructureInput | L2StructureCreateOrConnectWithoutL1StructureInput[]
    upsert?: L2StructureUpsertWithWhereUniqueWithoutL1StructureInput | L2StructureUpsertWithWhereUniqueWithoutL1StructureInput[]
    createMany?: L2StructureCreateManyL1StructureInputEnvelope
    set?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    disconnect?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    delete?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    connect?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    update?: L2StructureUpdateWithWhereUniqueWithoutL1StructureInput | L2StructureUpdateWithWhereUniqueWithoutL1StructureInput[]
    updateMany?: L2StructureUpdateManyWithWhereWithoutL1StructureInput | L2StructureUpdateManyWithWhereWithoutL1StructureInput[]
    deleteMany?: L2StructureScalarWhereInput | L2StructureScalarWhereInput[]
  }

  export type L1FunctionUpdateManyWithoutL1StructureNestedInput = {
    create?: XOR<L1FunctionCreateWithoutL1StructureInput, L1FunctionUncheckedCreateWithoutL1StructureInput> | L1FunctionCreateWithoutL1StructureInput[] | L1FunctionUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L1FunctionCreateOrConnectWithoutL1StructureInput | L1FunctionCreateOrConnectWithoutL1StructureInput[]
    upsert?: L1FunctionUpsertWithWhereUniqueWithoutL1StructureInput | L1FunctionUpsertWithWhereUniqueWithoutL1StructureInput[]
    createMany?: L1FunctionCreateManyL1StructureInputEnvelope
    set?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    disconnect?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    delete?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    connect?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    update?: L1FunctionUpdateWithWhereUniqueWithoutL1StructureInput | L1FunctionUpdateWithWhereUniqueWithoutL1StructureInput[]
    updateMany?: L1FunctionUpdateManyWithWhereWithoutL1StructureInput | L1FunctionUpdateManyWithWhereWithoutL1StructureInput[]
    deleteMany?: L1FunctionScalarWhereInput | L1FunctionScalarWhereInput[]
  }

  export type L2StructureUncheckedUpdateManyWithoutL1StructureNestedInput = {
    create?: XOR<L2StructureCreateWithoutL1StructureInput, L2StructureUncheckedCreateWithoutL1StructureInput> | L2StructureCreateWithoutL1StructureInput[] | L2StructureUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L2StructureCreateOrConnectWithoutL1StructureInput | L2StructureCreateOrConnectWithoutL1StructureInput[]
    upsert?: L2StructureUpsertWithWhereUniqueWithoutL1StructureInput | L2StructureUpsertWithWhereUniqueWithoutL1StructureInput[]
    createMany?: L2StructureCreateManyL1StructureInputEnvelope
    set?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    disconnect?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    delete?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    connect?: L2StructureWhereUniqueInput | L2StructureWhereUniqueInput[]
    update?: L2StructureUpdateWithWhereUniqueWithoutL1StructureInput | L2StructureUpdateWithWhereUniqueWithoutL1StructureInput[]
    updateMany?: L2StructureUpdateManyWithWhereWithoutL1StructureInput | L2StructureUpdateManyWithWhereWithoutL1StructureInput[]
    deleteMany?: L2StructureScalarWhereInput | L2StructureScalarWhereInput[]
  }

  export type L1FunctionUncheckedUpdateManyWithoutL1StructureNestedInput = {
    create?: XOR<L1FunctionCreateWithoutL1StructureInput, L1FunctionUncheckedCreateWithoutL1StructureInput> | L1FunctionCreateWithoutL1StructureInput[] | L1FunctionUncheckedCreateWithoutL1StructureInput[]
    connectOrCreate?: L1FunctionCreateOrConnectWithoutL1StructureInput | L1FunctionCreateOrConnectWithoutL1StructureInput[]
    upsert?: L1FunctionUpsertWithWhereUniqueWithoutL1StructureInput | L1FunctionUpsertWithWhereUniqueWithoutL1StructureInput[]
    createMany?: L1FunctionCreateManyL1StructureInputEnvelope
    set?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    disconnect?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    delete?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    connect?: L1FunctionWhereUniqueInput | L1FunctionWhereUniqueInput[]
    update?: L1FunctionUpdateWithWhereUniqueWithoutL1StructureInput | L1FunctionUpdateWithWhereUniqueWithoutL1StructureInput[]
    updateMany?: L1FunctionUpdateManyWithWhereWithoutL1StructureInput | L1FunctionUpdateManyWithWhereWithoutL1StructureInput[]
    deleteMany?: L1FunctionScalarWhereInput | L1FunctionScalarWhereInput[]
  }

  export type L1StructureCreateNestedOneWithoutL2StructuresInput = {
    create?: XOR<L1StructureCreateWithoutL2StructuresInput, L1StructureUncheckedCreateWithoutL2StructuresInput>
    connectOrCreate?: L1StructureCreateOrConnectWithoutL2StructuresInput
    connect?: L1StructureWhereUniqueInput
  }

  export type L3StructureCreateNestedManyWithoutL2StructureInput = {
    create?: XOR<L3StructureCreateWithoutL2StructureInput, L3StructureUncheckedCreateWithoutL2StructureInput> | L3StructureCreateWithoutL2StructureInput[] | L3StructureUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L3StructureCreateOrConnectWithoutL2StructureInput | L3StructureCreateOrConnectWithoutL2StructureInput[]
    createMany?: L3StructureCreateManyL2StructureInputEnvelope
    connect?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
  }

  export type L2FunctionCreateNestedManyWithoutL2StructureInput = {
    create?: XOR<L2FunctionCreateWithoutL2StructureInput, L2FunctionUncheckedCreateWithoutL2StructureInput> | L2FunctionCreateWithoutL2StructureInput[] | L2FunctionUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L2FunctionCreateOrConnectWithoutL2StructureInput | L2FunctionCreateOrConnectWithoutL2StructureInput[]
    createMany?: L2FunctionCreateManyL2StructureInputEnvelope
    connect?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
  }

  export type FailureModeCreateNestedManyWithoutL2StructureInput = {
    create?: XOR<FailureModeCreateWithoutL2StructureInput, FailureModeUncheckedCreateWithoutL2StructureInput> | FailureModeCreateWithoutL2StructureInput[] | FailureModeUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2StructureInput | FailureModeCreateOrConnectWithoutL2StructureInput[]
    createMany?: FailureModeCreateManyL2StructureInputEnvelope
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
  }

  export type L3StructureUncheckedCreateNestedManyWithoutL2StructureInput = {
    create?: XOR<L3StructureCreateWithoutL2StructureInput, L3StructureUncheckedCreateWithoutL2StructureInput> | L3StructureCreateWithoutL2StructureInput[] | L3StructureUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L3StructureCreateOrConnectWithoutL2StructureInput | L3StructureCreateOrConnectWithoutL2StructureInput[]
    createMany?: L3StructureCreateManyL2StructureInputEnvelope
    connect?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
  }

  export type L2FunctionUncheckedCreateNestedManyWithoutL2StructureInput = {
    create?: XOR<L2FunctionCreateWithoutL2StructureInput, L2FunctionUncheckedCreateWithoutL2StructureInput> | L2FunctionCreateWithoutL2StructureInput[] | L2FunctionUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L2FunctionCreateOrConnectWithoutL2StructureInput | L2FunctionCreateOrConnectWithoutL2StructureInput[]
    createMany?: L2FunctionCreateManyL2StructureInputEnvelope
    connect?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
  }

  export type FailureModeUncheckedCreateNestedManyWithoutL2StructureInput = {
    create?: XOR<FailureModeCreateWithoutL2StructureInput, FailureModeUncheckedCreateWithoutL2StructureInput> | FailureModeCreateWithoutL2StructureInput[] | FailureModeUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2StructureInput | FailureModeCreateOrConnectWithoutL2StructureInput[]
    createMany?: FailureModeCreateManyL2StructureInputEnvelope
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type L1StructureUpdateOneRequiredWithoutL2StructuresNestedInput = {
    create?: XOR<L1StructureCreateWithoutL2StructuresInput, L1StructureUncheckedCreateWithoutL2StructuresInput>
    connectOrCreate?: L1StructureCreateOrConnectWithoutL2StructuresInput
    upsert?: L1StructureUpsertWithoutL2StructuresInput
    connect?: L1StructureWhereUniqueInput
    update?: XOR<XOR<L1StructureUpdateToOneWithWhereWithoutL2StructuresInput, L1StructureUpdateWithoutL2StructuresInput>, L1StructureUncheckedUpdateWithoutL2StructuresInput>
  }

  export type L3StructureUpdateManyWithoutL2StructureNestedInput = {
    create?: XOR<L3StructureCreateWithoutL2StructureInput, L3StructureUncheckedCreateWithoutL2StructureInput> | L3StructureCreateWithoutL2StructureInput[] | L3StructureUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L3StructureCreateOrConnectWithoutL2StructureInput | L3StructureCreateOrConnectWithoutL2StructureInput[]
    upsert?: L3StructureUpsertWithWhereUniqueWithoutL2StructureInput | L3StructureUpsertWithWhereUniqueWithoutL2StructureInput[]
    createMany?: L3StructureCreateManyL2StructureInputEnvelope
    set?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    disconnect?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    delete?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    connect?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    update?: L3StructureUpdateWithWhereUniqueWithoutL2StructureInput | L3StructureUpdateWithWhereUniqueWithoutL2StructureInput[]
    updateMany?: L3StructureUpdateManyWithWhereWithoutL2StructureInput | L3StructureUpdateManyWithWhereWithoutL2StructureInput[]
    deleteMany?: L3StructureScalarWhereInput | L3StructureScalarWhereInput[]
  }

  export type L2FunctionUpdateManyWithoutL2StructureNestedInput = {
    create?: XOR<L2FunctionCreateWithoutL2StructureInput, L2FunctionUncheckedCreateWithoutL2StructureInput> | L2FunctionCreateWithoutL2StructureInput[] | L2FunctionUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L2FunctionCreateOrConnectWithoutL2StructureInput | L2FunctionCreateOrConnectWithoutL2StructureInput[]
    upsert?: L2FunctionUpsertWithWhereUniqueWithoutL2StructureInput | L2FunctionUpsertWithWhereUniqueWithoutL2StructureInput[]
    createMany?: L2FunctionCreateManyL2StructureInputEnvelope
    set?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    disconnect?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    delete?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    connect?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    update?: L2FunctionUpdateWithWhereUniqueWithoutL2StructureInput | L2FunctionUpdateWithWhereUniqueWithoutL2StructureInput[]
    updateMany?: L2FunctionUpdateManyWithWhereWithoutL2StructureInput | L2FunctionUpdateManyWithWhereWithoutL2StructureInput[]
    deleteMany?: L2FunctionScalarWhereInput | L2FunctionScalarWhereInput[]
  }

  export type FailureModeUpdateManyWithoutL2StructureNestedInput = {
    create?: XOR<FailureModeCreateWithoutL2StructureInput, FailureModeUncheckedCreateWithoutL2StructureInput> | FailureModeCreateWithoutL2StructureInput[] | FailureModeUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2StructureInput | FailureModeCreateOrConnectWithoutL2StructureInput[]
    upsert?: FailureModeUpsertWithWhereUniqueWithoutL2StructureInput | FailureModeUpsertWithWhereUniqueWithoutL2StructureInput[]
    createMany?: FailureModeCreateManyL2StructureInputEnvelope
    set?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    disconnect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    delete?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    update?: FailureModeUpdateWithWhereUniqueWithoutL2StructureInput | FailureModeUpdateWithWhereUniqueWithoutL2StructureInput[]
    updateMany?: FailureModeUpdateManyWithWhereWithoutL2StructureInput | FailureModeUpdateManyWithWhereWithoutL2StructureInput[]
    deleteMany?: FailureModeScalarWhereInput | FailureModeScalarWhereInput[]
  }

  export type L3StructureUncheckedUpdateManyWithoutL2StructureNestedInput = {
    create?: XOR<L3StructureCreateWithoutL2StructureInput, L3StructureUncheckedCreateWithoutL2StructureInput> | L3StructureCreateWithoutL2StructureInput[] | L3StructureUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L3StructureCreateOrConnectWithoutL2StructureInput | L3StructureCreateOrConnectWithoutL2StructureInput[]
    upsert?: L3StructureUpsertWithWhereUniqueWithoutL2StructureInput | L3StructureUpsertWithWhereUniqueWithoutL2StructureInput[]
    createMany?: L3StructureCreateManyL2StructureInputEnvelope
    set?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    disconnect?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    delete?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    connect?: L3StructureWhereUniqueInput | L3StructureWhereUniqueInput[]
    update?: L3StructureUpdateWithWhereUniqueWithoutL2StructureInput | L3StructureUpdateWithWhereUniqueWithoutL2StructureInput[]
    updateMany?: L3StructureUpdateManyWithWhereWithoutL2StructureInput | L3StructureUpdateManyWithWhereWithoutL2StructureInput[]
    deleteMany?: L3StructureScalarWhereInput | L3StructureScalarWhereInput[]
  }

  export type L2FunctionUncheckedUpdateManyWithoutL2StructureNestedInput = {
    create?: XOR<L2FunctionCreateWithoutL2StructureInput, L2FunctionUncheckedCreateWithoutL2StructureInput> | L2FunctionCreateWithoutL2StructureInput[] | L2FunctionUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: L2FunctionCreateOrConnectWithoutL2StructureInput | L2FunctionCreateOrConnectWithoutL2StructureInput[]
    upsert?: L2FunctionUpsertWithWhereUniqueWithoutL2StructureInput | L2FunctionUpsertWithWhereUniqueWithoutL2StructureInput[]
    createMany?: L2FunctionCreateManyL2StructureInputEnvelope
    set?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    disconnect?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    delete?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    connect?: L2FunctionWhereUniqueInput | L2FunctionWhereUniqueInput[]
    update?: L2FunctionUpdateWithWhereUniqueWithoutL2StructureInput | L2FunctionUpdateWithWhereUniqueWithoutL2StructureInput[]
    updateMany?: L2FunctionUpdateManyWithWhereWithoutL2StructureInput | L2FunctionUpdateManyWithWhereWithoutL2StructureInput[]
    deleteMany?: L2FunctionScalarWhereInput | L2FunctionScalarWhereInput[]
  }

  export type FailureModeUncheckedUpdateManyWithoutL2StructureNestedInput = {
    create?: XOR<FailureModeCreateWithoutL2StructureInput, FailureModeUncheckedCreateWithoutL2StructureInput> | FailureModeCreateWithoutL2StructureInput[] | FailureModeUncheckedCreateWithoutL2StructureInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2StructureInput | FailureModeCreateOrConnectWithoutL2StructureInput[]
    upsert?: FailureModeUpsertWithWhereUniqueWithoutL2StructureInput | FailureModeUpsertWithWhereUniqueWithoutL2StructureInput[]
    createMany?: FailureModeCreateManyL2StructureInputEnvelope
    set?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    disconnect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    delete?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    update?: FailureModeUpdateWithWhereUniqueWithoutL2StructureInput | FailureModeUpdateWithWhereUniqueWithoutL2StructureInput[]
    updateMany?: FailureModeUpdateManyWithWhereWithoutL2StructureInput | FailureModeUpdateManyWithWhereWithoutL2StructureInput[]
    deleteMany?: FailureModeScalarWhereInput | FailureModeScalarWhereInput[]
  }

  export type L2StructureCreateNestedOneWithoutL3StructuresInput = {
    create?: XOR<L2StructureCreateWithoutL3StructuresInput, L2StructureUncheckedCreateWithoutL3StructuresInput>
    connectOrCreate?: L2StructureCreateOrConnectWithoutL3StructuresInput
    connect?: L2StructureWhereUniqueInput
  }

  export type L3FunctionCreateNestedManyWithoutL3StructureInput = {
    create?: XOR<L3FunctionCreateWithoutL3StructureInput, L3FunctionUncheckedCreateWithoutL3StructureInput> | L3FunctionCreateWithoutL3StructureInput[] | L3FunctionUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: L3FunctionCreateOrConnectWithoutL3StructureInput | L3FunctionCreateOrConnectWithoutL3StructureInput[]
    createMany?: L3FunctionCreateManyL3StructureInputEnvelope
    connect?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
  }

  export type FailureCauseCreateNestedManyWithoutL3StructureInput = {
    create?: XOR<FailureCauseCreateWithoutL3StructureInput, FailureCauseUncheckedCreateWithoutL3StructureInput> | FailureCauseCreateWithoutL3StructureInput[] | FailureCauseUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3StructureInput | FailureCauseCreateOrConnectWithoutL3StructureInput[]
    createMany?: FailureCauseCreateManyL3StructureInputEnvelope
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
  }

  export type L3FunctionUncheckedCreateNestedManyWithoutL3StructureInput = {
    create?: XOR<L3FunctionCreateWithoutL3StructureInput, L3FunctionUncheckedCreateWithoutL3StructureInput> | L3FunctionCreateWithoutL3StructureInput[] | L3FunctionUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: L3FunctionCreateOrConnectWithoutL3StructureInput | L3FunctionCreateOrConnectWithoutL3StructureInput[]
    createMany?: L3FunctionCreateManyL3StructureInputEnvelope
    connect?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
  }

  export type FailureCauseUncheckedCreateNestedManyWithoutL3StructureInput = {
    create?: XOR<FailureCauseCreateWithoutL3StructureInput, FailureCauseUncheckedCreateWithoutL3StructureInput> | FailureCauseCreateWithoutL3StructureInput[] | FailureCauseUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3StructureInput | FailureCauseCreateOrConnectWithoutL3StructureInput[]
    createMany?: FailureCauseCreateManyL3StructureInputEnvelope
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
  }

  export type L2StructureUpdateOneRequiredWithoutL3StructuresNestedInput = {
    create?: XOR<L2StructureCreateWithoutL3StructuresInput, L2StructureUncheckedCreateWithoutL3StructuresInput>
    connectOrCreate?: L2StructureCreateOrConnectWithoutL3StructuresInput
    upsert?: L2StructureUpsertWithoutL3StructuresInput
    connect?: L2StructureWhereUniqueInput
    update?: XOR<XOR<L2StructureUpdateToOneWithWhereWithoutL3StructuresInput, L2StructureUpdateWithoutL3StructuresInput>, L2StructureUncheckedUpdateWithoutL3StructuresInput>
  }

  export type L3FunctionUpdateManyWithoutL3StructureNestedInput = {
    create?: XOR<L3FunctionCreateWithoutL3StructureInput, L3FunctionUncheckedCreateWithoutL3StructureInput> | L3FunctionCreateWithoutL3StructureInput[] | L3FunctionUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: L3FunctionCreateOrConnectWithoutL3StructureInput | L3FunctionCreateOrConnectWithoutL3StructureInput[]
    upsert?: L3FunctionUpsertWithWhereUniqueWithoutL3StructureInput | L3FunctionUpsertWithWhereUniqueWithoutL3StructureInput[]
    createMany?: L3FunctionCreateManyL3StructureInputEnvelope
    set?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    disconnect?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    delete?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    connect?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    update?: L3FunctionUpdateWithWhereUniqueWithoutL3StructureInput | L3FunctionUpdateWithWhereUniqueWithoutL3StructureInput[]
    updateMany?: L3FunctionUpdateManyWithWhereWithoutL3StructureInput | L3FunctionUpdateManyWithWhereWithoutL3StructureInput[]
    deleteMany?: L3FunctionScalarWhereInput | L3FunctionScalarWhereInput[]
  }

  export type FailureCauseUpdateManyWithoutL3StructureNestedInput = {
    create?: XOR<FailureCauseCreateWithoutL3StructureInput, FailureCauseUncheckedCreateWithoutL3StructureInput> | FailureCauseCreateWithoutL3StructureInput[] | FailureCauseUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3StructureInput | FailureCauseCreateOrConnectWithoutL3StructureInput[]
    upsert?: FailureCauseUpsertWithWhereUniqueWithoutL3StructureInput | FailureCauseUpsertWithWhereUniqueWithoutL3StructureInput[]
    createMany?: FailureCauseCreateManyL3StructureInputEnvelope
    set?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    disconnect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    delete?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    update?: FailureCauseUpdateWithWhereUniqueWithoutL3StructureInput | FailureCauseUpdateWithWhereUniqueWithoutL3StructureInput[]
    updateMany?: FailureCauseUpdateManyWithWhereWithoutL3StructureInput | FailureCauseUpdateManyWithWhereWithoutL3StructureInput[]
    deleteMany?: FailureCauseScalarWhereInput | FailureCauseScalarWhereInput[]
  }

  export type L3FunctionUncheckedUpdateManyWithoutL3StructureNestedInput = {
    create?: XOR<L3FunctionCreateWithoutL3StructureInput, L3FunctionUncheckedCreateWithoutL3StructureInput> | L3FunctionCreateWithoutL3StructureInput[] | L3FunctionUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: L3FunctionCreateOrConnectWithoutL3StructureInput | L3FunctionCreateOrConnectWithoutL3StructureInput[]
    upsert?: L3FunctionUpsertWithWhereUniqueWithoutL3StructureInput | L3FunctionUpsertWithWhereUniqueWithoutL3StructureInput[]
    createMany?: L3FunctionCreateManyL3StructureInputEnvelope
    set?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    disconnect?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    delete?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    connect?: L3FunctionWhereUniqueInput | L3FunctionWhereUniqueInput[]
    update?: L3FunctionUpdateWithWhereUniqueWithoutL3StructureInput | L3FunctionUpdateWithWhereUniqueWithoutL3StructureInput[]
    updateMany?: L3FunctionUpdateManyWithWhereWithoutL3StructureInput | L3FunctionUpdateManyWithWhereWithoutL3StructureInput[]
    deleteMany?: L3FunctionScalarWhereInput | L3FunctionScalarWhereInput[]
  }

  export type FailureCauseUncheckedUpdateManyWithoutL3StructureNestedInput = {
    create?: XOR<FailureCauseCreateWithoutL3StructureInput, FailureCauseUncheckedCreateWithoutL3StructureInput> | FailureCauseCreateWithoutL3StructureInput[] | FailureCauseUncheckedCreateWithoutL3StructureInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3StructureInput | FailureCauseCreateOrConnectWithoutL3StructureInput[]
    upsert?: FailureCauseUpsertWithWhereUniqueWithoutL3StructureInput | FailureCauseUpsertWithWhereUniqueWithoutL3StructureInput[]
    createMany?: FailureCauseCreateManyL3StructureInputEnvelope
    set?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    disconnect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    delete?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    update?: FailureCauseUpdateWithWhereUniqueWithoutL3StructureInput | FailureCauseUpdateWithWhereUniqueWithoutL3StructureInput[]
    updateMany?: FailureCauseUpdateManyWithWhereWithoutL3StructureInput | FailureCauseUpdateManyWithWhereWithoutL3StructureInput[]
    deleteMany?: FailureCauseScalarWhereInput | FailureCauseScalarWhereInput[]
  }

  export type L1StructureCreateNestedOneWithoutL1FunctionsInput = {
    create?: XOR<L1StructureCreateWithoutL1FunctionsInput, L1StructureUncheckedCreateWithoutL1FunctionsInput>
    connectOrCreate?: L1StructureCreateOrConnectWithoutL1FunctionsInput
    connect?: L1StructureWhereUniqueInput
  }

  export type FailureEffectCreateNestedManyWithoutL1FunctionInput = {
    create?: XOR<FailureEffectCreateWithoutL1FunctionInput, FailureEffectUncheckedCreateWithoutL1FunctionInput> | FailureEffectCreateWithoutL1FunctionInput[] | FailureEffectUncheckedCreateWithoutL1FunctionInput[]
    connectOrCreate?: FailureEffectCreateOrConnectWithoutL1FunctionInput | FailureEffectCreateOrConnectWithoutL1FunctionInput[]
    createMany?: FailureEffectCreateManyL1FunctionInputEnvelope
    connect?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
  }

  export type FailureEffectUncheckedCreateNestedManyWithoutL1FunctionInput = {
    create?: XOR<FailureEffectCreateWithoutL1FunctionInput, FailureEffectUncheckedCreateWithoutL1FunctionInput> | FailureEffectCreateWithoutL1FunctionInput[] | FailureEffectUncheckedCreateWithoutL1FunctionInput[]
    connectOrCreate?: FailureEffectCreateOrConnectWithoutL1FunctionInput | FailureEffectCreateOrConnectWithoutL1FunctionInput[]
    createMany?: FailureEffectCreateManyL1FunctionInputEnvelope
    connect?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
  }

  export type L1StructureUpdateOneRequiredWithoutL1FunctionsNestedInput = {
    create?: XOR<L1StructureCreateWithoutL1FunctionsInput, L1StructureUncheckedCreateWithoutL1FunctionsInput>
    connectOrCreate?: L1StructureCreateOrConnectWithoutL1FunctionsInput
    upsert?: L1StructureUpsertWithoutL1FunctionsInput
    connect?: L1StructureWhereUniqueInput
    update?: XOR<XOR<L1StructureUpdateToOneWithWhereWithoutL1FunctionsInput, L1StructureUpdateWithoutL1FunctionsInput>, L1StructureUncheckedUpdateWithoutL1FunctionsInput>
  }

  export type FailureEffectUpdateManyWithoutL1FunctionNestedInput = {
    create?: XOR<FailureEffectCreateWithoutL1FunctionInput, FailureEffectUncheckedCreateWithoutL1FunctionInput> | FailureEffectCreateWithoutL1FunctionInput[] | FailureEffectUncheckedCreateWithoutL1FunctionInput[]
    connectOrCreate?: FailureEffectCreateOrConnectWithoutL1FunctionInput | FailureEffectCreateOrConnectWithoutL1FunctionInput[]
    upsert?: FailureEffectUpsertWithWhereUniqueWithoutL1FunctionInput | FailureEffectUpsertWithWhereUniqueWithoutL1FunctionInput[]
    createMany?: FailureEffectCreateManyL1FunctionInputEnvelope
    set?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    disconnect?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    delete?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    connect?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    update?: FailureEffectUpdateWithWhereUniqueWithoutL1FunctionInput | FailureEffectUpdateWithWhereUniqueWithoutL1FunctionInput[]
    updateMany?: FailureEffectUpdateManyWithWhereWithoutL1FunctionInput | FailureEffectUpdateManyWithWhereWithoutL1FunctionInput[]
    deleteMany?: FailureEffectScalarWhereInput | FailureEffectScalarWhereInput[]
  }

  export type FailureEffectUncheckedUpdateManyWithoutL1FunctionNestedInput = {
    create?: XOR<FailureEffectCreateWithoutL1FunctionInput, FailureEffectUncheckedCreateWithoutL1FunctionInput> | FailureEffectCreateWithoutL1FunctionInput[] | FailureEffectUncheckedCreateWithoutL1FunctionInput[]
    connectOrCreate?: FailureEffectCreateOrConnectWithoutL1FunctionInput | FailureEffectCreateOrConnectWithoutL1FunctionInput[]
    upsert?: FailureEffectUpsertWithWhereUniqueWithoutL1FunctionInput | FailureEffectUpsertWithWhereUniqueWithoutL1FunctionInput[]
    createMany?: FailureEffectCreateManyL1FunctionInputEnvelope
    set?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    disconnect?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    delete?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    connect?: FailureEffectWhereUniqueInput | FailureEffectWhereUniqueInput[]
    update?: FailureEffectUpdateWithWhereUniqueWithoutL1FunctionInput | FailureEffectUpdateWithWhereUniqueWithoutL1FunctionInput[]
    updateMany?: FailureEffectUpdateManyWithWhereWithoutL1FunctionInput | FailureEffectUpdateManyWithWhereWithoutL1FunctionInput[]
    deleteMany?: FailureEffectScalarWhereInput | FailureEffectScalarWhereInput[]
  }

  export type L2StructureCreateNestedOneWithoutL2FunctionsInput = {
    create?: XOR<L2StructureCreateWithoutL2FunctionsInput, L2StructureUncheckedCreateWithoutL2FunctionsInput>
    connectOrCreate?: L2StructureCreateOrConnectWithoutL2FunctionsInput
    connect?: L2StructureWhereUniqueInput
  }

  export type FailureModeCreateNestedManyWithoutL2FunctionInput = {
    create?: XOR<FailureModeCreateWithoutL2FunctionInput, FailureModeUncheckedCreateWithoutL2FunctionInput> | FailureModeCreateWithoutL2FunctionInput[] | FailureModeUncheckedCreateWithoutL2FunctionInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2FunctionInput | FailureModeCreateOrConnectWithoutL2FunctionInput[]
    createMany?: FailureModeCreateManyL2FunctionInputEnvelope
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
  }

  export type FailureModeUncheckedCreateNestedManyWithoutL2FunctionInput = {
    create?: XOR<FailureModeCreateWithoutL2FunctionInput, FailureModeUncheckedCreateWithoutL2FunctionInput> | FailureModeCreateWithoutL2FunctionInput[] | FailureModeUncheckedCreateWithoutL2FunctionInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2FunctionInput | FailureModeCreateOrConnectWithoutL2FunctionInput[]
    createMany?: FailureModeCreateManyL2FunctionInputEnvelope
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
  }

  export type L2StructureUpdateOneRequiredWithoutL2FunctionsNestedInput = {
    create?: XOR<L2StructureCreateWithoutL2FunctionsInput, L2StructureUncheckedCreateWithoutL2FunctionsInput>
    connectOrCreate?: L2StructureCreateOrConnectWithoutL2FunctionsInput
    upsert?: L2StructureUpsertWithoutL2FunctionsInput
    connect?: L2StructureWhereUniqueInput
    update?: XOR<XOR<L2StructureUpdateToOneWithWhereWithoutL2FunctionsInput, L2StructureUpdateWithoutL2FunctionsInput>, L2StructureUncheckedUpdateWithoutL2FunctionsInput>
  }

  export type FailureModeUpdateManyWithoutL2FunctionNestedInput = {
    create?: XOR<FailureModeCreateWithoutL2FunctionInput, FailureModeUncheckedCreateWithoutL2FunctionInput> | FailureModeCreateWithoutL2FunctionInput[] | FailureModeUncheckedCreateWithoutL2FunctionInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2FunctionInput | FailureModeCreateOrConnectWithoutL2FunctionInput[]
    upsert?: FailureModeUpsertWithWhereUniqueWithoutL2FunctionInput | FailureModeUpsertWithWhereUniqueWithoutL2FunctionInput[]
    createMany?: FailureModeCreateManyL2FunctionInputEnvelope
    set?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    disconnect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    delete?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    update?: FailureModeUpdateWithWhereUniqueWithoutL2FunctionInput | FailureModeUpdateWithWhereUniqueWithoutL2FunctionInput[]
    updateMany?: FailureModeUpdateManyWithWhereWithoutL2FunctionInput | FailureModeUpdateManyWithWhereWithoutL2FunctionInput[]
    deleteMany?: FailureModeScalarWhereInput | FailureModeScalarWhereInput[]
  }

  export type FailureModeUncheckedUpdateManyWithoutL2FunctionNestedInput = {
    create?: XOR<FailureModeCreateWithoutL2FunctionInput, FailureModeUncheckedCreateWithoutL2FunctionInput> | FailureModeCreateWithoutL2FunctionInput[] | FailureModeUncheckedCreateWithoutL2FunctionInput[]
    connectOrCreate?: FailureModeCreateOrConnectWithoutL2FunctionInput | FailureModeCreateOrConnectWithoutL2FunctionInput[]
    upsert?: FailureModeUpsertWithWhereUniqueWithoutL2FunctionInput | FailureModeUpsertWithWhereUniqueWithoutL2FunctionInput[]
    createMany?: FailureModeCreateManyL2FunctionInputEnvelope
    set?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    disconnect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    delete?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    connect?: FailureModeWhereUniqueInput | FailureModeWhereUniqueInput[]
    update?: FailureModeUpdateWithWhereUniqueWithoutL2FunctionInput | FailureModeUpdateWithWhereUniqueWithoutL2FunctionInput[]
    updateMany?: FailureModeUpdateManyWithWhereWithoutL2FunctionInput | FailureModeUpdateManyWithWhereWithoutL2FunctionInput[]
    deleteMany?: FailureModeScalarWhereInput | FailureModeScalarWhereInput[]
  }

  export type L3StructureCreateNestedOneWithoutL3FunctionsInput = {
    create?: XOR<L3StructureCreateWithoutL3FunctionsInput, L3StructureUncheckedCreateWithoutL3FunctionsInput>
    connectOrCreate?: L3StructureCreateOrConnectWithoutL3FunctionsInput
    connect?: L3StructureWhereUniqueInput
  }

  export type FailureCauseCreateNestedManyWithoutL3FunctionInput = {
    create?: XOR<FailureCauseCreateWithoutL3FunctionInput, FailureCauseUncheckedCreateWithoutL3FunctionInput> | FailureCauseCreateWithoutL3FunctionInput[] | FailureCauseUncheckedCreateWithoutL3FunctionInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3FunctionInput | FailureCauseCreateOrConnectWithoutL3FunctionInput[]
    createMany?: FailureCauseCreateManyL3FunctionInputEnvelope
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
  }

  export type FailureCauseUncheckedCreateNestedManyWithoutL3FunctionInput = {
    create?: XOR<FailureCauseCreateWithoutL3FunctionInput, FailureCauseUncheckedCreateWithoutL3FunctionInput> | FailureCauseCreateWithoutL3FunctionInput[] | FailureCauseUncheckedCreateWithoutL3FunctionInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3FunctionInput | FailureCauseCreateOrConnectWithoutL3FunctionInput[]
    createMany?: FailureCauseCreateManyL3FunctionInputEnvelope
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
  }

  export type L3StructureUpdateOneRequiredWithoutL3FunctionsNestedInput = {
    create?: XOR<L3StructureCreateWithoutL3FunctionsInput, L3StructureUncheckedCreateWithoutL3FunctionsInput>
    connectOrCreate?: L3StructureCreateOrConnectWithoutL3FunctionsInput
    upsert?: L3StructureUpsertWithoutL3FunctionsInput
    connect?: L3StructureWhereUniqueInput
    update?: XOR<XOR<L3StructureUpdateToOneWithWhereWithoutL3FunctionsInput, L3StructureUpdateWithoutL3FunctionsInput>, L3StructureUncheckedUpdateWithoutL3FunctionsInput>
  }

  export type FailureCauseUpdateManyWithoutL3FunctionNestedInput = {
    create?: XOR<FailureCauseCreateWithoutL3FunctionInput, FailureCauseUncheckedCreateWithoutL3FunctionInput> | FailureCauseCreateWithoutL3FunctionInput[] | FailureCauseUncheckedCreateWithoutL3FunctionInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3FunctionInput | FailureCauseCreateOrConnectWithoutL3FunctionInput[]
    upsert?: FailureCauseUpsertWithWhereUniqueWithoutL3FunctionInput | FailureCauseUpsertWithWhereUniqueWithoutL3FunctionInput[]
    createMany?: FailureCauseCreateManyL3FunctionInputEnvelope
    set?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    disconnect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    delete?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    update?: FailureCauseUpdateWithWhereUniqueWithoutL3FunctionInput | FailureCauseUpdateWithWhereUniqueWithoutL3FunctionInput[]
    updateMany?: FailureCauseUpdateManyWithWhereWithoutL3FunctionInput | FailureCauseUpdateManyWithWhereWithoutL3FunctionInput[]
    deleteMany?: FailureCauseScalarWhereInput | FailureCauseScalarWhereInput[]
  }

  export type FailureCauseUncheckedUpdateManyWithoutL3FunctionNestedInput = {
    create?: XOR<FailureCauseCreateWithoutL3FunctionInput, FailureCauseUncheckedCreateWithoutL3FunctionInput> | FailureCauseCreateWithoutL3FunctionInput[] | FailureCauseUncheckedCreateWithoutL3FunctionInput[]
    connectOrCreate?: FailureCauseCreateOrConnectWithoutL3FunctionInput | FailureCauseCreateOrConnectWithoutL3FunctionInput[]
    upsert?: FailureCauseUpsertWithWhereUniqueWithoutL3FunctionInput | FailureCauseUpsertWithWhereUniqueWithoutL3FunctionInput[]
    createMany?: FailureCauseCreateManyL3FunctionInputEnvelope
    set?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    disconnect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    delete?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    connect?: FailureCauseWhereUniqueInput | FailureCauseWhereUniqueInput[]
    update?: FailureCauseUpdateWithWhereUniqueWithoutL3FunctionInput | FailureCauseUpdateWithWhereUniqueWithoutL3FunctionInput[]
    updateMany?: FailureCauseUpdateManyWithWhereWithoutL3FunctionInput | FailureCauseUpdateManyWithWhereWithoutL3FunctionInput[]
    deleteMany?: FailureCauseScalarWhereInput | FailureCauseScalarWhereInput[]
  }

  export type L1FunctionCreateNestedOneWithoutFailureEffectsInput = {
    create?: XOR<L1FunctionCreateWithoutFailureEffectsInput, L1FunctionUncheckedCreateWithoutFailureEffectsInput>
    connectOrCreate?: L1FunctionCreateOrConnectWithoutFailureEffectsInput
    connect?: L1FunctionWhereUniqueInput
  }

  export type FailureLinkCreateNestedManyWithoutFailureEffectInput = {
    create?: XOR<FailureLinkCreateWithoutFailureEffectInput, FailureLinkUncheckedCreateWithoutFailureEffectInput> | FailureLinkCreateWithoutFailureEffectInput[] | FailureLinkUncheckedCreateWithoutFailureEffectInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureEffectInput | FailureLinkCreateOrConnectWithoutFailureEffectInput[]
    createMany?: FailureLinkCreateManyFailureEffectInputEnvelope
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
  }

  export type FailureLinkUncheckedCreateNestedManyWithoutFailureEffectInput = {
    create?: XOR<FailureLinkCreateWithoutFailureEffectInput, FailureLinkUncheckedCreateWithoutFailureEffectInput> | FailureLinkCreateWithoutFailureEffectInput[] | FailureLinkUncheckedCreateWithoutFailureEffectInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureEffectInput | FailureLinkCreateOrConnectWithoutFailureEffectInput[]
    createMany?: FailureLinkCreateManyFailureEffectInputEnvelope
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
  }

  export type L1FunctionUpdateOneRequiredWithoutFailureEffectsNestedInput = {
    create?: XOR<L1FunctionCreateWithoutFailureEffectsInput, L1FunctionUncheckedCreateWithoutFailureEffectsInput>
    connectOrCreate?: L1FunctionCreateOrConnectWithoutFailureEffectsInput
    upsert?: L1FunctionUpsertWithoutFailureEffectsInput
    connect?: L1FunctionWhereUniqueInput
    update?: XOR<XOR<L1FunctionUpdateToOneWithWhereWithoutFailureEffectsInput, L1FunctionUpdateWithoutFailureEffectsInput>, L1FunctionUncheckedUpdateWithoutFailureEffectsInput>
  }

  export type FailureLinkUpdateManyWithoutFailureEffectNestedInput = {
    create?: XOR<FailureLinkCreateWithoutFailureEffectInput, FailureLinkUncheckedCreateWithoutFailureEffectInput> | FailureLinkCreateWithoutFailureEffectInput[] | FailureLinkUncheckedCreateWithoutFailureEffectInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureEffectInput | FailureLinkCreateOrConnectWithoutFailureEffectInput[]
    upsert?: FailureLinkUpsertWithWhereUniqueWithoutFailureEffectInput | FailureLinkUpsertWithWhereUniqueWithoutFailureEffectInput[]
    createMany?: FailureLinkCreateManyFailureEffectInputEnvelope
    set?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    disconnect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    delete?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    update?: FailureLinkUpdateWithWhereUniqueWithoutFailureEffectInput | FailureLinkUpdateWithWhereUniqueWithoutFailureEffectInput[]
    updateMany?: FailureLinkUpdateManyWithWhereWithoutFailureEffectInput | FailureLinkUpdateManyWithWhereWithoutFailureEffectInput[]
    deleteMany?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
  }

  export type FailureLinkUncheckedUpdateManyWithoutFailureEffectNestedInput = {
    create?: XOR<FailureLinkCreateWithoutFailureEffectInput, FailureLinkUncheckedCreateWithoutFailureEffectInput> | FailureLinkCreateWithoutFailureEffectInput[] | FailureLinkUncheckedCreateWithoutFailureEffectInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureEffectInput | FailureLinkCreateOrConnectWithoutFailureEffectInput[]
    upsert?: FailureLinkUpsertWithWhereUniqueWithoutFailureEffectInput | FailureLinkUpsertWithWhereUniqueWithoutFailureEffectInput[]
    createMany?: FailureLinkCreateManyFailureEffectInputEnvelope
    set?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    disconnect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    delete?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    update?: FailureLinkUpdateWithWhereUniqueWithoutFailureEffectInput | FailureLinkUpdateWithWhereUniqueWithoutFailureEffectInput[]
    updateMany?: FailureLinkUpdateManyWithWhereWithoutFailureEffectInput | FailureLinkUpdateManyWithWhereWithoutFailureEffectInput[]
    deleteMany?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
  }

  export type L2FunctionCreateNestedOneWithoutFailureModesInput = {
    create?: XOR<L2FunctionCreateWithoutFailureModesInput, L2FunctionUncheckedCreateWithoutFailureModesInput>
    connectOrCreate?: L2FunctionCreateOrConnectWithoutFailureModesInput
    connect?: L2FunctionWhereUniqueInput
  }

  export type L2StructureCreateNestedOneWithoutFailureModesInput = {
    create?: XOR<L2StructureCreateWithoutFailureModesInput, L2StructureUncheckedCreateWithoutFailureModesInput>
    connectOrCreate?: L2StructureCreateOrConnectWithoutFailureModesInput
    connect?: L2StructureWhereUniqueInput
  }

  export type FailureLinkCreateNestedManyWithoutFailureModeInput = {
    create?: XOR<FailureLinkCreateWithoutFailureModeInput, FailureLinkUncheckedCreateWithoutFailureModeInput> | FailureLinkCreateWithoutFailureModeInput[] | FailureLinkUncheckedCreateWithoutFailureModeInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureModeInput | FailureLinkCreateOrConnectWithoutFailureModeInput[]
    createMany?: FailureLinkCreateManyFailureModeInputEnvelope
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
  }

  export type FailureLinkUncheckedCreateNestedManyWithoutFailureModeInput = {
    create?: XOR<FailureLinkCreateWithoutFailureModeInput, FailureLinkUncheckedCreateWithoutFailureModeInput> | FailureLinkCreateWithoutFailureModeInput[] | FailureLinkUncheckedCreateWithoutFailureModeInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureModeInput | FailureLinkCreateOrConnectWithoutFailureModeInput[]
    createMany?: FailureLinkCreateManyFailureModeInputEnvelope
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
  }

  export type L2FunctionUpdateOneRequiredWithoutFailureModesNestedInput = {
    create?: XOR<L2FunctionCreateWithoutFailureModesInput, L2FunctionUncheckedCreateWithoutFailureModesInput>
    connectOrCreate?: L2FunctionCreateOrConnectWithoutFailureModesInput
    upsert?: L2FunctionUpsertWithoutFailureModesInput
    connect?: L2FunctionWhereUniqueInput
    update?: XOR<XOR<L2FunctionUpdateToOneWithWhereWithoutFailureModesInput, L2FunctionUpdateWithoutFailureModesInput>, L2FunctionUncheckedUpdateWithoutFailureModesInput>
  }

  export type L2StructureUpdateOneRequiredWithoutFailureModesNestedInput = {
    create?: XOR<L2StructureCreateWithoutFailureModesInput, L2StructureUncheckedCreateWithoutFailureModesInput>
    connectOrCreate?: L2StructureCreateOrConnectWithoutFailureModesInput
    upsert?: L2StructureUpsertWithoutFailureModesInput
    connect?: L2StructureWhereUniqueInput
    update?: XOR<XOR<L2StructureUpdateToOneWithWhereWithoutFailureModesInput, L2StructureUpdateWithoutFailureModesInput>, L2StructureUncheckedUpdateWithoutFailureModesInput>
  }

  export type FailureLinkUpdateManyWithoutFailureModeNestedInput = {
    create?: XOR<FailureLinkCreateWithoutFailureModeInput, FailureLinkUncheckedCreateWithoutFailureModeInput> | FailureLinkCreateWithoutFailureModeInput[] | FailureLinkUncheckedCreateWithoutFailureModeInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureModeInput | FailureLinkCreateOrConnectWithoutFailureModeInput[]
    upsert?: FailureLinkUpsertWithWhereUniqueWithoutFailureModeInput | FailureLinkUpsertWithWhereUniqueWithoutFailureModeInput[]
    createMany?: FailureLinkCreateManyFailureModeInputEnvelope
    set?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    disconnect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    delete?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    update?: FailureLinkUpdateWithWhereUniqueWithoutFailureModeInput | FailureLinkUpdateWithWhereUniqueWithoutFailureModeInput[]
    updateMany?: FailureLinkUpdateManyWithWhereWithoutFailureModeInput | FailureLinkUpdateManyWithWhereWithoutFailureModeInput[]
    deleteMany?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
  }

  export type FailureLinkUncheckedUpdateManyWithoutFailureModeNestedInput = {
    create?: XOR<FailureLinkCreateWithoutFailureModeInput, FailureLinkUncheckedCreateWithoutFailureModeInput> | FailureLinkCreateWithoutFailureModeInput[] | FailureLinkUncheckedCreateWithoutFailureModeInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureModeInput | FailureLinkCreateOrConnectWithoutFailureModeInput[]
    upsert?: FailureLinkUpsertWithWhereUniqueWithoutFailureModeInput | FailureLinkUpsertWithWhereUniqueWithoutFailureModeInput[]
    createMany?: FailureLinkCreateManyFailureModeInputEnvelope
    set?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    disconnect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    delete?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    update?: FailureLinkUpdateWithWhereUniqueWithoutFailureModeInput | FailureLinkUpdateWithWhereUniqueWithoutFailureModeInput[]
    updateMany?: FailureLinkUpdateManyWithWhereWithoutFailureModeInput | FailureLinkUpdateManyWithWhereWithoutFailureModeInput[]
    deleteMany?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
  }

  export type L3FunctionCreateNestedOneWithoutFailureCausesInput = {
    create?: XOR<L3FunctionCreateWithoutFailureCausesInput, L3FunctionUncheckedCreateWithoutFailureCausesInput>
    connectOrCreate?: L3FunctionCreateOrConnectWithoutFailureCausesInput
    connect?: L3FunctionWhereUniqueInput
  }

  export type L3StructureCreateNestedOneWithoutFailureCausesInput = {
    create?: XOR<L3StructureCreateWithoutFailureCausesInput, L3StructureUncheckedCreateWithoutFailureCausesInput>
    connectOrCreate?: L3StructureCreateOrConnectWithoutFailureCausesInput
    connect?: L3StructureWhereUniqueInput
  }

  export type FailureLinkCreateNestedManyWithoutFailureCauseInput = {
    create?: XOR<FailureLinkCreateWithoutFailureCauseInput, FailureLinkUncheckedCreateWithoutFailureCauseInput> | FailureLinkCreateWithoutFailureCauseInput[] | FailureLinkUncheckedCreateWithoutFailureCauseInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureCauseInput | FailureLinkCreateOrConnectWithoutFailureCauseInput[]
    createMany?: FailureLinkCreateManyFailureCauseInputEnvelope
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
  }

  export type FailureLinkUncheckedCreateNestedManyWithoutFailureCauseInput = {
    create?: XOR<FailureLinkCreateWithoutFailureCauseInput, FailureLinkUncheckedCreateWithoutFailureCauseInput> | FailureLinkCreateWithoutFailureCauseInput[] | FailureLinkUncheckedCreateWithoutFailureCauseInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureCauseInput | FailureLinkCreateOrConnectWithoutFailureCauseInput[]
    createMany?: FailureLinkCreateManyFailureCauseInputEnvelope
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type L3FunctionUpdateOneRequiredWithoutFailureCausesNestedInput = {
    create?: XOR<L3FunctionCreateWithoutFailureCausesInput, L3FunctionUncheckedCreateWithoutFailureCausesInput>
    connectOrCreate?: L3FunctionCreateOrConnectWithoutFailureCausesInput
    upsert?: L3FunctionUpsertWithoutFailureCausesInput
    connect?: L3FunctionWhereUniqueInput
    update?: XOR<XOR<L3FunctionUpdateToOneWithWhereWithoutFailureCausesInput, L3FunctionUpdateWithoutFailureCausesInput>, L3FunctionUncheckedUpdateWithoutFailureCausesInput>
  }

  export type L3StructureUpdateOneRequiredWithoutFailureCausesNestedInput = {
    create?: XOR<L3StructureCreateWithoutFailureCausesInput, L3StructureUncheckedCreateWithoutFailureCausesInput>
    connectOrCreate?: L3StructureCreateOrConnectWithoutFailureCausesInput
    upsert?: L3StructureUpsertWithoutFailureCausesInput
    connect?: L3StructureWhereUniqueInput
    update?: XOR<XOR<L3StructureUpdateToOneWithWhereWithoutFailureCausesInput, L3StructureUpdateWithoutFailureCausesInput>, L3StructureUncheckedUpdateWithoutFailureCausesInput>
  }

  export type FailureLinkUpdateManyWithoutFailureCauseNestedInput = {
    create?: XOR<FailureLinkCreateWithoutFailureCauseInput, FailureLinkUncheckedCreateWithoutFailureCauseInput> | FailureLinkCreateWithoutFailureCauseInput[] | FailureLinkUncheckedCreateWithoutFailureCauseInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureCauseInput | FailureLinkCreateOrConnectWithoutFailureCauseInput[]
    upsert?: FailureLinkUpsertWithWhereUniqueWithoutFailureCauseInput | FailureLinkUpsertWithWhereUniqueWithoutFailureCauseInput[]
    createMany?: FailureLinkCreateManyFailureCauseInputEnvelope
    set?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    disconnect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    delete?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    update?: FailureLinkUpdateWithWhereUniqueWithoutFailureCauseInput | FailureLinkUpdateWithWhereUniqueWithoutFailureCauseInput[]
    updateMany?: FailureLinkUpdateManyWithWhereWithoutFailureCauseInput | FailureLinkUpdateManyWithWhereWithoutFailureCauseInput[]
    deleteMany?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
  }

  export type FailureLinkUncheckedUpdateManyWithoutFailureCauseNestedInput = {
    create?: XOR<FailureLinkCreateWithoutFailureCauseInput, FailureLinkUncheckedCreateWithoutFailureCauseInput> | FailureLinkCreateWithoutFailureCauseInput[] | FailureLinkUncheckedCreateWithoutFailureCauseInput[]
    connectOrCreate?: FailureLinkCreateOrConnectWithoutFailureCauseInput | FailureLinkCreateOrConnectWithoutFailureCauseInput[]
    upsert?: FailureLinkUpsertWithWhereUniqueWithoutFailureCauseInput | FailureLinkUpsertWithWhereUniqueWithoutFailureCauseInput[]
    createMany?: FailureLinkCreateManyFailureCauseInputEnvelope
    set?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    disconnect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    delete?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    connect?: FailureLinkWhereUniqueInput | FailureLinkWhereUniqueInput[]
    update?: FailureLinkUpdateWithWhereUniqueWithoutFailureCauseInput | FailureLinkUpdateWithWhereUniqueWithoutFailureCauseInput[]
    updateMany?: FailureLinkUpdateManyWithWhereWithoutFailureCauseInput | FailureLinkUpdateManyWithWhereWithoutFailureCauseInput[]
    deleteMany?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
  }

  export type FailureModeCreateNestedOneWithoutFailureLinksInput = {
    create?: XOR<FailureModeCreateWithoutFailureLinksInput, FailureModeUncheckedCreateWithoutFailureLinksInput>
    connectOrCreate?: FailureModeCreateOrConnectWithoutFailureLinksInput
    connect?: FailureModeWhereUniqueInput
  }

  export type FailureEffectCreateNestedOneWithoutFailureLinksInput = {
    create?: XOR<FailureEffectCreateWithoutFailureLinksInput, FailureEffectUncheckedCreateWithoutFailureLinksInput>
    connectOrCreate?: FailureEffectCreateOrConnectWithoutFailureLinksInput
    connect?: FailureEffectWhereUniqueInput
  }

  export type FailureCauseCreateNestedOneWithoutFailureLinksInput = {
    create?: XOR<FailureCauseCreateWithoutFailureLinksInput, FailureCauseUncheckedCreateWithoutFailureLinksInput>
    connectOrCreate?: FailureCauseCreateOrConnectWithoutFailureLinksInput
    connect?: FailureCauseWhereUniqueInput
  }

  export type RiskAnalysisCreateNestedManyWithoutFailureLinkInput = {
    create?: XOR<RiskAnalysisCreateWithoutFailureLinkInput, RiskAnalysisUncheckedCreateWithoutFailureLinkInput> | RiskAnalysisCreateWithoutFailureLinkInput[] | RiskAnalysisUncheckedCreateWithoutFailureLinkInput[]
    connectOrCreate?: RiskAnalysisCreateOrConnectWithoutFailureLinkInput | RiskAnalysisCreateOrConnectWithoutFailureLinkInput[]
    createMany?: RiskAnalysisCreateManyFailureLinkInputEnvelope
    connect?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
  }

  export type RiskAnalysisUncheckedCreateNestedManyWithoutFailureLinkInput = {
    create?: XOR<RiskAnalysisCreateWithoutFailureLinkInput, RiskAnalysisUncheckedCreateWithoutFailureLinkInput> | RiskAnalysisCreateWithoutFailureLinkInput[] | RiskAnalysisUncheckedCreateWithoutFailureLinkInput[]
    connectOrCreate?: RiskAnalysisCreateOrConnectWithoutFailureLinkInput | RiskAnalysisCreateOrConnectWithoutFailureLinkInput[]
    createMany?: RiskAnalysisCreateManyFailureLinkInputEnvelope
    connect?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
  }

  export type FailureModeUpdateOneRequiredWithoutFailureLinksNestedInput = {
    create?: XOR<FailureModeCreateWithoutFailureLinksInput, FailureModeUncheckedCreateWithoutFailureLinksInput>
    connectOrCreate?: FailureModeCreateOrConnectWithoutFailureLinksInput
    upsert?: FailureModeUpsertWithoutFailureLinksInput
    connect?: FailureModeWhereUniqueInput
    update?: XOR<XOR<FailureModeUpdateToOneWithWhereWithoutFailureLinksInput, FailureModeUpdateWithoutFailureLinksInput>, FailureModeUncheckedUpdateWithoutFailureLinksInput>
  }

  export type FailureEffectUpdateOneRequiredWithoutFailureLinksNestedInput = {
    create?: XOR<FailureEffectCreateWithoutFailureLinksInput, FailureEffectUncheckedCreateWithoutFailureLinksInput>
    connectOrCreate?: FailureEffectCreateOrConnectWithoutFailureLinksInput
    upsert?: FailureEffectUpsertWithoutFailureLinksInput
    connect?: FailureEffectWhereUniqueInput
    update?: XOR<XOR<FailureEffectUpdateToOneWithWhereWithoutFailureLinksInput, FailureEffectUpdateWithoutFailureLinksInput>, FailureEffectUncheckedUpdateWithoutFailureLinksInput>
  }

  export type FailureCauseUpdateOneRequiredWithoutFailureLinksNestedInput = {
    create?: XOR<FailureCauseCreateWithoutFailureLinksInput, FailureCauseUncheckedCreateWithoutFailureLinksInput>
    connectOrCreate?: FailureCauseCreateOrConnectWithoutFailureLinksInput
    upsert?: FailureCauseUpsertWithoutFailureLinksInput
    connect?: FailureCauseWhereUniqueInput
    update?: XOR<XOR<FailureCauseUpdateToOneWithWhereWithoutFailureLinksInput, FailureCauseUpdateWithoutFailureLinksInput>, FailureCauseUncheckedUpdateWithoutFailureLinksInput>
  }

  export type RiskAnalysisUpdateManyWithoutFailureLinkNestedInput = {
    create?: XOR<RiskAnalysisCreateWithoutFailureLinkInput, RiskAnalysisUncheckedCreateWithoutFailureLinkInput> | RiskAnalysisCreateWithoutFailureLinkInput[] | RiskAnalysisUncheckedCreateWithoutFailureLinkInput[]
    connectOrCreate?: RiskAnalysisCreateOrConnectWithoutFailureLinkInput | RiskAnalysisCreateOrConnectWithoutFailureLinkInput[]
    upsert?: RiskAnalysisUpsertWithWhereUniqueWithoutFailureLinkInput | RiskAnalysisUpsertWithWhereUniqueWithoutFailureLinkInput[]
    createMany?: RiskAnalysisCreateManyFailureLinkInputEnvelope
    set?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    disconnect?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    delete?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    connect?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    update?: RiskAnalysisUpdateWithWhereUniqueWithoutFailureLinkInput | RiskAnalysisUpdateWithWhereUniqueWithoutFailureLinkInput[]
    updateMany?: RiskAnalysisUpdateManyWithWhereWithoutFailureLinkInput | RiskAnalysisUpdateManyWithWhereWithoutFailureLinkInput[]
    deleteMany?: RiskAnalysisScalarWhereInput | RiskAnalysisScalarWhereInput[]
  }

  export type RiskAnalysisUncheckedUpdateManyWithoutFailureLinkNestedInput = {
    create?: XOR<RiskAnalysisCreateWithoutFailureLinkInput, RiskAnalysisUncheckedCreateWithoutFailureLinkInput> | RiskAnalysisCreateWithoutFailureLinkInput[] | RiskAnalysisUncheckedCreateWithoutFailureLinkInput[]
    connectOrCreate?: RiskAnalysisCreateOrConnectWithoutFailureLinkInput | RiskAnalysisCreateOrConnectWithoutFailureLinkInput[]
    upsert?: RiskAnalysisUpsertWithWhereUniqueWithoutFailureLinkInput | RiskAnalysisUpsertWithWhereUniqueWithoutFailureLinkInput[]
    createMany?: RiskAnalysisCreateManyFailureLinkInputEnvelope
    set?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    disconnect?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    delete?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    connect?: RiskAnalysisWhereUniqueInput | RiskAnalysisWhereUniqueInput[]
    update?: RiskAnalysisUpdateWithWhereUniqueWithoutFailureLinkInput | RiskAnalysisUpdateWithWhereUniqueWithoutFailureLinkInput[]
    updateMany?: RiskAnalysisUpdateManyWithWhereWithoutFailureLinkInput | RiskAnalysisUpdateManyWithWhereWithoutFailureLinkInput[]
    deleteMany?: RiskAnalysisScalarWhereInput | RiskAnalysisScalarWhereInput[]
  }

  export type FailureLinkCreateNestedOneWithoutRiskAnalysesInput = {
    create?: XOR<FailureLinkCreateWithoutRiskAnalysesInput, FailureLinkUncheckedCreateWithoutRiskAnalysesInput>
    connectOrCreate?: FailureLinkCreateOrConnectWithoutRiskAnalysesInput
    connect?: FailureLinkWhereUniqueInput
  }

  export type OptimizationCreateNestedManyWithoutRiskAnalysisInput = {
    create?: XOR<OptimizationCreateWithoutRiskAnalysisInput, OptimizationUncheckedCreateWithoutRiskAnalysisInput> | OptimizationCreateWithoutRiskAnalysisInput[] | OptimizationUncheckedCreateWithoutRiskAnalysisInput[]
    connectOrCreate?: OptimizationCreateOrConnectWithoutRiskAnalysisInput | OptimizationCreateOrConnectWithoutRiskAnalysisInput[]
    createMany?: OptimizationCreateManyRiskAnalysisInputEnvelope
    connect?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
  }

  export type OptimizationUncheckedCreateNestedManyWithoutRiskAnalysisInput = {
    create?: XOR<OptimizationCreateWithoutRiskAnalysisInput, OptimizationUncheckedCreateWithoutRiskAnalysisInput> | OptimizationCreateWithoutRiskAnalysisInput[] | OptimizationUncheckedCreateWithoutRiskAnalysisInput[]
    connectOrCreate?: OptimizationCreateOrConnectWithoutRiskAnalysisInput | OptimizationCreateOrConnectWithoutRiskAnalysisInput[]
    createMany?: OptimizationCreateManyRiskAnalysisInputEnvelope
    connect?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
  }

  export type FailureLinkUpdateOneRequiredWithoutRiskAnalysesNestedInput = {
    create?: XOR<FailureLinkCreateWithoutRiskAnalysesInput, FailureLinkUncheckedCreateWithoutRiskAnalysesInput>
    connectOrCreate?: FailureLinkCreateOrConnectWithoutRiskAnalysesInput
    upsert?: FailureLinkUpsertWithoutRiskAnalysesInput
    connect?: FailureLinkWhereUniqueInput
    update?: XOR<XOR<FailureLinkUpdateToOneWithWhereWithoutRiskAnalysesInput, FailureLinkUpdateWithoutRiskAnalysesInput>, FailureLinkUncheckedUpdateWithoutRiskAnalysesInput>
  }

  export type OptimizationUpdateManyWithoutRiskAnalysisNestedInput = {
    create?: XOR<OptimizationCreateWithoutRiskAnalysisInput, OptimizationUncheckedCreateWithoutRiskAnalysisInput> | OptimizationCreateWithoutRiskAnalysisInput[] | OptimizationUncheckedCreateWithoutRiskAnalysisInput[]
    connectOrCreate?: OptimizationCreateOrConnectWithoutRiskAnalysisInput | OptimizationCreateOrConnectWithoutRiskAnalysisInput[]
    upsert?: OptimizationUpsertWithWhereUniqueWithoutRiskAnalysisInput | OptimizationUpsertWithWhereUniqueWithoutRiskAnalysisInput[]
    createMany?: OptimizationCreateManyRiskAnalysisInputEnvelope
    set?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    disconnect?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    delete?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    connect?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    update?: OptimizationUpdateWithWhereUniqueWithoutRiskAnalysisInput | OptimizationUpdateWithWhereUniqueWithoutRiskAnalysisInput[]
    updateMany?: OptimizationUpdateManyWithWhereWithoutRiskAnalysisInput | OptimizationUpdateManyWithWhereWithoutRiskAnalysisInput[]
    deleteMany?: OptimizationScalarWhereInput | OptimizationScalarWhereInput[]
  }

  export type OptimizationUncheckedUpdateManyWithoutRiskAnalysisNestedInput = {
    create?: XOR<OptimizationCreateWithoutRiskAnalysisInput, OptimizationUncheckedCreateWithoutRiskAnalysisInput> | OptimizationCreateWithoutRiskAnalysisInput[] | OptimizationUncheckedCreateWithoutRiskAnalysisInput[]
    connectOrCreate?: OptimizationCreateOrConnectWithoutRiskAnalysisInput | OptimizationCreateOrConnectWithoutRiskAnalysisInput[]
    upsert?: OptimizationUpsertWithWhereUniqueWithoutRiskAnalysisInput | OptimizationUpsertWithWhereUniqueWithoutRiskAnalysisInput[]
    createMany?: OptimizationCreateManyRiskAnalysisInputEnvelope
    set?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    disconnect?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    delete?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    connect?: OptimizationWhereUniqueInput | OptimizationWhereUniqueInput[]
    update?: OptimizationUpdateWithWhereUniqueWithoutRiskAnalysisInput | OptimizationUpdateWithWhereUniqueWithoutRiskAnalysisInput[]
    updateMany?: OptimizationUpdateManyWithWhereWithoutRiskAnalysisInput | OptimizationUpdateManyWithWhereWithoutRiskAnalysisInput[]
    deleteMany?: OptimizationScalarWhereInput | OptimizationScalarWhereInput[]
  }

  export type RiskAnalysisCreateNestedOneWithoutOptimizationsInput = {
    create?: XOR<RiskAnalysisCreateWithoutOptimizationsInput, RiskAnalysisUncheckedCreateWithoutOptimizationsInput>
    connectOrCreate?: RiskAnalysisCreateOrConnectWithoutOptimizationsInput
    connect?: RiskAnalysisWhereUniqueInput
  }

  export type RiskAnalysisUpdateOneRequiredWithoutOptimizationsNestedInput = {
    create?: XOR<RiskAnalysisCreateWithoutOptimizationsInput, RiskAnalysisUncheckedCreateWithoutOptimizationsInput>
    connectOrCreate?: RiskAnalysisCreateOrConnectWithoutOptimizationsInput
    upsert?: RiskAnalysisUpsertWithoutOptimizationsInput
    connect?: RiskAnalysisWhereUniqueInput
    update?: XOR<XOR<RiskAnalysisUpdateToOneWithWhereWithoutOptimizationsInput, RiskAnalysisUpdateWithoutOptimizationsInput>, RiskAnalysisUncheckedUpdateWithoutOptimizationsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type L2StructureCreateWithoutL1StructureInput = {
    id?: string
    fmeaId: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structures?: L3StructureCreateNestedManyWithoutL2StructureInput
    l2Functions?: L2FunctionCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureUncheckedCreateWithoutL1StructureInput = {
    id?: string
    fmeaId: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structures?: L3StructureUncheckedCreateNestedManyWithoutL2StructureInput
    l2Functions?: L2FunctionUncheckedCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeUncheckedCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureCreateOrConnectWithoutL1StructureInput = {
    where: L2StructureWhereUniqueInput
    create: XOR<L2StructureCreateWithoutL1StructureInput, L2StructureUncheckedCreateWithoutL1StructureInput>
  }

  export type L2StructureCreateManyL1StructureInputEnvelope = {
    data: L2StructureCreateManyL1StructureInput | L2StructureCreateManyL1StructureInput[]
    skipDuplicates?: boolean
  }

  export type L1FunctionCreateWithoutL1StructureInput = {
    id?: string
    fmeaId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureEffects?: FailureEffectCreateNestedManyWithoutL1FunctionInput
  }

  export type L1FunctionUncheckedCreateWithoutL1StructureInput = {
    id?: string
    fmeaId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureEffects?: FailureEffectUncheckedCreateNestedManyWithoutL1FunctionInput
  }

  export type L1FunctionCreateOrConnectWithoutL1StructureInput = {
    where: L1FunctionWhereUniqueInput
    create: XOR<L1FunctionCreateWithoutL1StructureInput, L1FunctionUncheckedCreateWithoutL1StructureInput>
  }

  export type L1FunctionCreateManyL1StructureInputEnvelope = {
    data: L1FunctionCreateManyL1StructureInput | L1FunctionCreateManyL1StructureInput[]
    skipDuplicates?: boolean
  }

  export type L2StructureUpsertWithWhereUniqueWithoutL1StructureInput = {
    where: L2StructureWhereUniqueInput
    update: XOR<L2StructureUpdateWithoutL1StructureInput, L2StructureUncheckedUpdateWithoutL1StructureInput>
    create: XOR<L2StructureCreateWithoutL1StructureInput, L2StructureUncheckedCreateWithoutL1StructureInput>
  }

  export type L2StructureUpdateWithWhereUniqueWithoutL1StructureInput = {
    where: L2StructureWhereUniqueInput
    data: XOR<L2StructureUpdateWithoutL1StructureInput, L2StructureUncheckedUpdateWithoutL1StructureInput>
  }

  export type L2StructureUpdateManyWithWhereWithoutL1StructureInput = {
    where: L2StructureScalarWhereInput
    data: XOR<L2StructureUpdateManyMutationInput, L2StructureUncheckedUpdateManyWithoutL1StructureInput>
  }

  export type L2StructureScalarWhereInput = {
    AND?: L2StructureScalarWhereInput | L2StructureScalarWhereInput[]
    OR?: L2StructureScalarWhereInput[]
    NOT?: L2StructureScalarWhereInput | L2StructureScalarWhereInput[]
    id?: StringFilter<"L2Structure"> | string
    fmeaId?: StringFilter<"L2Structure"> | string
    l1Id?: StringFilter<"L2Structure"> | string
    no?: StringFilter<"L2Structure"> | string
    name?: StringFilter<"L2Structure"> | string
    order?: IntFilter<"L2Structure"> | number
    createdAt?: DateTimeFilter<"L2Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L2Structure"> | Date | string
  }

  export type L1FunctionUpsertWithWhereUniqueWithoutL1StructureInput = {
    where: L1FunctionWhereUniqueInput
    update: XOR<L1FunctionUpdateWithoutL1StructureInput, L1FunctionUncheckedUpdateWithoutL1StructureInput>
    create: XOR<L1FunctionCreateWithoutL1StructureInput, L1FunctionUncheckedCreateWithoutL1StructureInput>
  }

  export type L1FunctionUpdateWithWhereUniqueWithoutL1StructureInput = {
    where: L1FunctionWhereUniqueInput
    data: XOR<L1FunctionUpdateWithoutL1StructureInput, L1FunctionUncheckedUpdateWithoutL1StructureInput>
  }

  export type L1FunctionUpdateManyWithWhereWithoutL1StructureInput = {
    where: L1FunctionScalarWhereInput
    data: XOR<L1FunctionUpdateManyMutationInput, L1FunctionUncheckedUpdateManyWithoutL1StructureInput>
  }

  export type L1FunctionScalarWhereInput = {
    AND?: L1FunctionScalarWhereInput | L1FunctionScalarWhereInput[]
    OR?: L1FunctionScalarWhereInput[]
    NOT?: L1FunctionScalarWhereInput | L1FunctionScalarWhereInput[]
    id?: StringFilter<"L1Function"> | string
    fmeaId?: StringFilter<"L1Function"> | string
    l1StructId?: StringFilter<"L1Function"> | string
    category?: StringFilter<"L1Function"> | string
    functionName?: StringFilter<"L1Function"> | string
    requirement?: StringFilter<"L1Function"> | string
    createdAt?: DateTimeFilter<"L1Function"> | Date | string
    updatedAt?: DateTimeFilter<"L1Function"> | Date | string
  }

  export type L1StructureCreateWithoutL2StructuresInput = {
    id?: string
    fmeaId: string
    name: string
    confirmed?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Functions?: L1FunctionCreateNestedManyWithoutL1StructureInput
  }

  export type L1StructureUncheckedCreateWithoutL2StructuresInput = {
    id?: string
    fmeaId: string
    name: string
    confirmed?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Functions?: L1FunctionUncheckedCreateNestedManyWithoutL1StructureInput
  }

  export type L1StructureCreateOrConnectWithoutL2StructuresInput = {
    where: L1StructureWhereUniqueInput
    create: XOR<L1StructureCreateWithoutL2StructuresInput, L1StructureUncheckedCreateWithoutL2StructuresInput>
  }

  export type L3StructureCreateWithoutL2StructureInput = {
    id?: string
    fmeaId: string
    l1Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Functions?: L3FunctionCreateNestedManyWithoutL3StructureInput
    failureCauses?: FailureCauseCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureUncheckedCreateWithoutL2StructureInput = {
    id?: string
    fmeaId: string
    l1Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Functions?: L3FunctionUncheckedCreateNestedManyWithoutL3StructureInput
    failureCauses?: FailureCauseUncheckedCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureCreateOrConnectWithoutL2StructureInput = {
    where: L3StructureWhereUniqueInput
    create: XOR<L3StructureCreateWithoutL2StructureInput, L3StructureUncheckedCreateWithoutL2StructureInput>
  }

  export type L3StructureCreateManyL2StructureInputEnvelope = {
    data: L3StructureCreateManyL2StructureInput | L3StructureCreateManyL2StructureInput[]
    skipDuplicates?: boolean
  }

  export type L2FunctionCreateWithoutL2StructureInput = {
    id?: string
    fmeaId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureModes?: FailureModeCreateNestedManyWithoutL2FunctionInput
  }

  export type L2FunctionUncheckedCreateWithoutL2StructureInput = {
    id?: string
    fmeaId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureModes?: FailureModeUncheckedCreateNestedManyWithoutL2FunctionInput
  }

  export type L2FunctionCreateOrConnectWithoutL2StructureInput = {
    where: L2FunctionWhereUniqueInput
    create: XOR<L2FunctionCreateWithoutL2StructureInput, L2FunctionUncheckedCreateWithoutL2StructureInput>
  }

  export type L2FunctionCreateManyL2StructureInputEnvelope = {
    data: L2FunctionCreateManyL2StructureInput | L2FunctionCreateManyL2StructureInput[]
    skipDuplicates?: boolean
  }

  export type FailureModeCreateWithoutL2StructureInput = {
    id?: string
    fmeaId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Function: L2FunctionCreateNestedOneWithoutFailureModesInput
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureModeInput
  }

  export type FailureModeUncheckedCreateWithoutL2StructureInput = {
    id?: string
    fmeaId: string
    l2FuncId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureModeInput
  }

  export type FailureModeCreateOrConnectWithoutL2StructureInput = {
    where: FailureModeWhereUniqueInput
    create: XOR<FailureModeCreateWithoutL2StructureInput, FailureModeUncheckedCreateWithoutL2StructureInput>
  }

  export type FailureModeCreateManyL2StructureInputEnvelope = {
    data: FailureModeCreateManyL2StructureInput | FailureModeCreateManyL2StructureInput[]
    skipDuplicates?: boolean
  }

  export type L1StructureUpsertWithoutL2StructuresInput = {
    update: XOR<L1StructureUpdateWithoutL2StructuresInput, L1StructureUncheckedUpdateWithoutL2StructuresInput>
    create: XOR<L1StructureCreateWithoutL2StructuresInput, L1StructureUncheckedCreateWithoutL2StructuresInput>
    where?: L1StructureWhereInput
  }

  export type L1StructureUpdateToOneWithWhereWithoutL2StructuresInput = {
    where?: L1StructureWhereInput
    data: XOR<L1StructureUpdateWithoutL2StructuresInput, L1StructureUncheckedUpdateWithoutL2StructuresInput>
  }

  export type L1StructureUpdateWithoutL2StructuresInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Functions?: L1FunctionUpdateManyWithoutL1StructureNestedInput
  }

  export type L1StructureUncheckedUpdateWithoutL2StructuresInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Functions?: L1FunctionUncheckedUpdateManyWithoutL1StructureNestedInput
  }

  export type L3StructureUpsertWithWhereUniqueWithoutL2StructureInput = {
    where: L3StructureWhereUniqueInput
    update: XOR<L3StructureUpdateWithoutL2StructureInput, L3StructureUncheckedUpdateWithoutL2StructureInput>
    create: XOR<L3StructureCreateWithoutL2StructureInput, L3StructureUncheckedCreateWithoutL2StructureInput>
  }

  export type L3StructureUpdateWithWhereUniqueWithoutL2StructureInput = {
    where: L3StructureWhereUniqueInput
    data: XOR<L3StructureUpdateWithoutL2StructureInput, L3StructureUncheckedUpdateWithoutL2StructureInput>
  }

  export type L3StructureUpdateManyWithWhereWithoutL2StructureInput = {
    where: L3StructureScalarWhereInput
    data: XOR<L3StructureUpdateManyMutationInput, L3StructureUncheckedUpdateManyWithoutL2StructureInput>
  }

  export type L3StructureScalarWhereInput = {
    AND?: L3StructureScalarWhereInput | L3StructureScalarWhereInput[]
    OR?: L3StructureScalarWhereInput[]
    NOT?: L3StructureScalarWhereInput | L3StructureScalarWhereInput[]
    id?: StringFilter<"L3Structure"> | string
    fmeaId?: StringFilter<"L3Structure"> | string
    l1Id?: StringFilter<"L3Structure"> | string
    l2Id?: StringFilter<"L3Structure"> | string
    m4?: StringNullableFilter<"L3Structure"> | string | null
    name?: StringFilter<"L3Structure"> | string
    order?: IntFilter<"L3Structure"> | number
    createdAt?: DateTimeFilter<"L3Structure"> | Date | string
    updatedAt?: DateTimeFilter<"L3Structure"> | Date | string
  }

  export type L2FunctionUpsertWithWhereUniqueWithoutL2StructureInput = {
    where: L2FunctionWhereUniqueInput
    update: XOR<L2FunctionUpdateWithoutL2StructureInput, L2FunctionUncheckedUpdateWithoutL2StructureInput>
    create: XOR<L2FunctionCreateWithoutL2StructureInput, L2FunctionUncheckedCreateWithoutL2StructureInput>
  }

  export type L2FunctionUpdateWithWhereUniqueWithoutL2StructureInput = {
    where: L2FunctionWhereUniqueInput
    data: XOR<L2FunctionUpdateWithoutL2StructureInput, L2FunctionUncheckedUpdateWithoutL2StructureInput>
  }

  export type L2FunctionUpdateManyWithWhereWithoutL2StructureInput = {
    where: L2FunctionScalarWhereInput
    data: XOR<L2FunctionUpdateManyMutationInput, L2FunctionUncheckedUpdateManyWithoutL2StructureInput>
  }

  export type L2FunctionScalarWhereInput = {
    AND?: L2FunctionScalarWhereInput | L2FunctionScalarWhereInput[]
    OR?: L2FunctionScalarWhereInput[]
    NOT?: L2FunctionScalarWhereInput | L2FunctionScalarWhereInput[]
    id?: StringFilter<"L2Function"> | string
    fmeaId?: StringFilter<"L2Function"> | string
    l2StructId?: StringFilter<"L2Function"> | string
    functionName?: StringFilter<"L2Function"> | string
    productChar?: StringFilter<"L2Function"> | string
    specialChar?: StringNullableFilter<"L2Function"> | string | null
    createdAt?: DateTimeFilter<"L2Function"> | Date | string
    updatedAt?: DateTimeFilter<"L2Function"> | Date | string
  }

  export type FailureModeUpsertWithWhereUniqueWithoutL2StructureInput = {
    where: FailureModeWhereUniqueInput
    update: XOR<FailureModeUpdateWithoutL2StructureInput, FailureModeUncheckedUpdateWithoutL2StructureInput>
    create: XOR<FailureModeCreateWithoutL2StructureInput, FailureModeUncheckedCreateWithoutL2StructureInput>
  }

  export type FailureModeUpdateWithWhereUniqueWithoutL2StructureInput = {
    where: FailureModeWhereUniqueInput
    data: XOR<FailureModeUpdateWithoutL2StructureInput, FailureModeUncheckedUpdateWithoutL2StructureInput>
  }

  export type FailureModeUpdateManyWithWhereWithoutL2StructureInput = {
    where: FailureModeScalarWhereInput
    data: XOR<FailureModeUpdateManyMutationInput, FailureModeUncheckedUpdateManyWithoutL2StructureInput>
  }

  export type FailureModeScalarWhereInput = {
    AND?: FailureModeScalarWhereInput | FailureModeScalarWhereInput[]
    OR?: FailureModeScalarWhereInput[]
    NOT?: FailureModeScalarWhereInput | FailureModeScalarWhereInput[]
    id?: StringFilter<"FailureMode"> | string
    fmeaId?: StringFilter<"FailureMode"> | string
    l2FuncId?: StringFilter<"FailureMode"> | string
    l2StructId?: StringFilter<"FailureMode"> | string
    productCharId?: StringNullableFilter<"FailureMode"> | string | null
    mode?: StringFilter<"FailureMode"> | string
    specialChar?: BoolNullableFilter<"FailureMode"> | boolean | null
    createdAt?: DateTimeFilter<"FailureMode"> | Date | string
    updatedAt?: DateTimeFilter<"FailureMode"> | Date | string
  }

  export type L2StructureCreateWithoutL3StructuresInput = {
    id?: string
    fmeaId: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Structure: L1StructureCreateNestedOneWithoutL2StructuresInput
    l2Functions?: L2FunctionCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureUncheckedCreateWithoutL3StructuresInput = {
    id?: string
    fmeaId: string
    l1Id: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Functions?: L2FunctionUncheckedCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeUncheckedCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureCreateOrConnectWithoutL3StructuresInput = {
    where: L2StructureWhereUniqueInput
    create: XOR<L2StructureCreateWithoutL3StructuresInput, L2StructureUncheckedCreateWithoutL3StructuresInput>
  }

  export type L3FunctionCreateWithoutL3StructureInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureCauses?: FailureCauseCreateNestedManyWithoutL3FunctionInput
  }

  export type L3FunctionUncheckedCreateWithoutL3StructureInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureCauses?: FailureCauseUncheckedCreateNestedManyWithoutL3FunctionInput
  }

  export type L3FunctionCreateOrConnectWithoutL3StructureInput = {
    where: L3FunctionWhereUniqueInput
    create: XOR<L3FunctionCreateWithoutL3StructureInput, L3FunctionUncheckedCreateWithoutL3StructureInput>
  }

  export type L3FunctionCreateManyL3StructureInputEnvelope = {
    data: L3FunctionCreateManyL3StructureInput | L3FunctionCreateManyL3StructureInput[]
    skipDuplicates?: boolean
  }

  export type FailureCauseCreateWithoutL3StructureInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Function: L3FunctionCreateNestedOneWithoutFailureCausesInput
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureCauseInput
  }

  export type FailureCauseUncheckedCreateWithoutL3StructureInput = {
    id?: string
    fmeaId: string
    l3FuncId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureCauseInput
  }

  export type FailureCauseCreateOrConnectWithoutL3StructureInput = {
    where: FailureCauseWhereUniqueInput
    create: XOR<FailureCauseCreateWithoutL3StructureInput, FailureCauseUncheckedCreateWithoutL3StructureInput>
  }

  export type FailureCauseCreateManyL3StructureInputEnvelope = {
    data: FailureCauseCreateManyL3StructureInput | FailureCauseCreateManyL3StructureInput[]
    skipDuplicates?: boolean
  }

  export type L2StructureUpsertWithoutL3StructuresInput = {
    update: XOR<L2StructureUpdateWithoutL3StructuresInput, L2StructureUncheckedUpdateWithoutL3StructuresInput>
    create: XOR<L2StructureCreateWithoutL3StructuresInput, L2StructureUncheckedCreateWithoutL3StructuresInput>
    where?: L2StructureWhereInput
  }

  export type L2StructureUpdateToOneWithWhereWithoutL3StructuresInput = {
    where?: L2StructureWhereInput
    data: XOR<L2StructureUpdateWithoutL3StructuresInput, L2StructureUncheckedUpdateWithoutL3StructuresInput>
  }

  export type L2StructureUpdateWithoutL3StructuresInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Structure?: L1StructureUpdateOneRequiredWithoutL2StructuresNestedInput
    l2Functions?: L2FunctionUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUpdateManyWithoutL2StructureNestedInput
  }

  export type L2StructureUncheckedUpdateWithoutL3StructuresInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Functions?: L2FunctionUncheckedUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUncheckedUpdateManyWithoutL2StructureNestedInput
  }

  export type L3FunctionUpsertWithWhereUniqueWithoutL3StructureInput = {
    where: L3FunctionWhereUniqueInput
    update: XOR<L3FunctionUpdateWithoutL3StructureInput, L3FunctionUncheckedUpdateWithoutL3StructureInput>
    create: XOR<L3FunctionCreateWithoutL3StructureInput, L3FunctionUncheckedCreateWithoutL3StructureInput>
  }

  export type L3FunctionUpdateWithWhereUniqueWithoutL3StructureInput = {
    where: L3FunctionWhereUniqueInput
    data: XOR<L3FunctionUpdateWithoutL3StructureInput, L3FunctionUncheckedUpdateWithoutL3StructureInput>
  }

  export type L3FunctionUpdateManyWithWhereWithoutL3StructureInput = {
    where: L3FunctionScalarWhereInput
    data: XOR<L3FunctionUpdateManyMutationInput, L3FunctionUncheckedUpdateManyWithoutL3StructureInput>
  }

  export type L3FunctionScalarWhereInput = {
    AND?: L3FunctionScalarWhereInput | L3FunctionScalarWhereInput[]
    OR?: L3FunctionScalarWhereInput[]
    NOT?: L3FunctionScalarWhereInput | L3FunctionScalarWhereInput[]
    id?: StringFilter<"L3Function"> | string
    fmeaId?: StringFilter<"L3Function"> | string
    l3StructId?: StringFilter<"L3Function"> | string
    l2StructId?: StringFilter<"L3Function"> | string
    functionName?: StringFilter<"L3Function"> | string
    processChar?: StringFilter<"L3Function"> | string
    specialChar?: StringNullableFilter<"L3Function"> | string | null
    createdAt?: DateTimeFilter<"L3Function"> | Date | string
    updatedAt?: DateTimeFilter<"L3Function"> | Date | string
  }

  export type FailureCauseUpsertWithWhereUniqueWithoutL3StructureInput = {
    where: FailureCauseWhereUniqueInput
    update: XOR<FailureCauseUpdateWithoutL3StructureInput, FailureCauseUncheckedUpdateWithoutL3StructureInput>
    create: XOR<FailureCauseCreateWithoutL3StructureInput, FailureCauseUncheckedCreateWithoutL3StructureInput>
  }

  export type FailureCauseUpdateWithWhereUniqueWithoutL3StructureInput = {
    where: FailureCauseWhereUniqueInput
    data: XOR<FailureCauseUpdateWithoutL3StructureInput, FailureCauseUncheckedUpdateWithoutL3StructureInput>
  }

  export type FailureCauseUpdateManyWithWhereWithoutL3StructureInput = {
    where: FailureCauseScalarWhereInput
    data: XOR<FailureCauseUpdateManyMutationInput, FailureCauseUncheckedUpdateManyWithoutL3StructureInput>
  }

  export type FailureCauseScalarWhereInput = {
    AND?: FailureCauseScalarWhereInput | FailureCauseScalarWhereInput[]
    OR?: FailureCauseScalarWhereInput[]
    NOT?: FailureCauseScalarWhereInput | FailureCauseScalarWhereInput[]
    id?: StringFilter<"FailureCause"> | string
    fmeaId?: StringFilter<"FailureCause"> | string
    l3FuncId?: StringFilter<"FailureCause"> | string
    l3StructId?: StringFilter<"FailureCause"> | string
    l2StructId?: StringFilter<"FailureCause"> | string
    cause?: StringFilter<"FailureCause"> | string
    occurrence?: IntNullableFilter<"FailureCause"> | number | null
    createdAt?: DateTimeFilter<"FailureCause"> | Date | string
    updatedAt?: DateTimeFilter<"FailureCause"> | Date | string
  }

  export type L1StructureCreateWithoutL1FunctionsInput = {
    id?: string
    fmeaId: string
    name: string
    confirmed?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structures?: L2StructureCreateNestedManyWithoutL1StructureInput
  }

  export type L1StructureUncheckedCreateWithoutL1FunctionsInput = {
    id?: string
    fmeaId: string
    name: string
    confirmed?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structures?: L2StructureUncheckedCreateNestedManyWithoutL1StructureInput
  }

  export type L1StructureCreateOrConnectWithoutL1FunctionsInput = {
    where: L1StructureWhereUniqueInput
    create: XOR<L1StructureCreateWithoutL1FunctionsInput, L1StructureUncheckedCreateWithoutL1FunctionsInput>
  }

  export type FailureEffectCreateWithoutL1FunctionInput = {
    id?: string
    fmeaId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureEffectInput
  }

  export type FailureEffectUncheckedCreateWithoutL1FunctionInput = {
    id?: string
    fmeaId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureEffectInput
  }

  export type FailureEffectCreateOrConnectWithoutL1FunctionInput = {
    where: FailureEffectWhereUniqueInput
    create: XOR<FailureEffectCreateWithoutL1FunctionInput, FailureEffectUncheckedCreateWithoutL1FunctionInput>
  }

  export type FailureEffectCreateManyL1FunctionInputEnvelope = {
    data: FailureEffectCreateManyL1FunctionInput | FailureEffectCreateManyL1FunctionInput[]
    skipDuplicates?: boolean
  }

  export type L1StructureUpsertWithoutL1FunctionsInput = {
    update: XOR<L1StructureUpdateWithoutL1FunctionsInput, L1StructureUncheckedUpdateWithoutL1FunctionsInput>
    create: XOR<L1StructureCreateWithoutL1FunctionsInput, L1StructureUncheckedCreateWithoutL1FunctionsInput>
    where?: L1StructureWhereInput
  }

  export type L1StructureUpdateToOneWithWhereWithoutL1FunctionsInput = {
    where?: L1StructureWhereInput
    data: XOR<L1StructureUpdateWithoutL1FunctionsInput, L1StructureUncheckedUpdateWithoutL1FunctionsInput>
  }

  export type L1StructureUpdateWithoutL1FunctionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structures?: L2StructureUpdateManyWithoutL1StructureNestedInput
  }

  export type L1StructureUncheckedUpdateWithoutL1FunctionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    confirmed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structures?: L2StructureUncheckedUpdateManyWithoutL1StructureNestedInput
  }

  export type FailureEffectUpsertWithWhereUniqueWithoutL1FunctionInput = {
    where: FailureEffectWhereUniqueInput
    update: XOR<FailureEffectUpdateWithoutL1FunctionInput, FailureEffectUncheckedUpdateWithoutL1FunctionInput>
    create: XOR<FailureEffectCreateWithoutL1FunctionInput, FailureEffectUncheckedCreateWithoutL1FunctionInput>
  }

  export type FailureEffectUpdateWithWhereUniqueWithoutL1FunctionInput = {
    where: FailureEffectWhereUniqueInput
    data: XOR<FailureEffectUpdateWithoutL1FunctionInput, FailureEffectUncheckedUpdateWithoutL1FunctionInput>
  }

  export type FailureEffectUpdateManyWithWhereWithoutL1FunctionInput = {
    where: FailureEffectScalarWhereInput
    data: XOR<FailureEffectUpdateManyMutationInput, FailureEffectUncheckedUpdateManyWithoutL1FunctionInput>
  }

  export type FailureEffectScalarWhereInput = {
    AND?: FailureEffectScalarWhereInput | FailureEffectScalarWhereInput[]
    OR?: FailureEffectScalarWhereInput[]
    NOT?: FailureEffectScalarWhereInput | FailureEffectScalarWhereInput[]
    id?: StringFilter<"FailureEffect"> | string
    fmeaId?: StringFilter<"FailureEffect"> | string
    l1FuncId?: StringFilter<"FailureEffect"> | string
    category?: StringFilter<"FailureEffect"> | string
    effect?: StringFilter<"FailureEffect"> | string
    severity?: IntFilter<"FailureEffect"> | number
    createdAt?: DateTimeFilter<"FailureEffect"> | Date | string
    updatedAt?: DateTimeFilter<"FailureEffect"> | Date | string
  }

  export type L2StructureCreateWithoutL2FunctionsInput = {
    id?: string
    fmeaId: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Structure: L1StructureCreateNestedOneWithoutL2StructuresInput
    l3Structures?: L3StructureCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureUncheckedCreateWithoutL2FunctionsInput = {
    id?: string
    fmeaId: string
    l1Id: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structures?: L3StructureUncheckedCreateNestedManyWithoutL2StructureInput
    failureModes?: FailureModeUncheckedCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureCreateOrConnectWithoutL2FunctionsInput = {
    where: L2StructureWhereUniqueInput
    create: XOR<L2StructureCreateWithoutL2FunctionsInput, L2StructureUncheckedCreateWithoutL2FunctionsInput>
  }

  export type FailureModeCreateWithoutL2FunctionInput = {
    id?: string
    fmeaId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structure: L2StructureCreateNestedOneWithoutFailureModesInput
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureModeInput
  }

  export type FailureModeUncheckedCreateWithoutL2FunctionInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureModeInput
  }

  export type FailureModeCreateOrConnectWithoutL2FunctionInput = {
    where: FailureModeWhereUniqueInput
    create: XOR<FailureModeCreateWithoutL2FunctionInput, FailureModeUncheckedCreateWithoutL2FunctionInput>
  }

  export type FailureModeCreateManyL2FunctionInputEnvelope = {
    data: FailureModeCreateManyL2FunctionInput | FailureModeCreateManyL2FunctionInput[]
    skipDuplicates?: boolean
  }

  export type L2StructureUpsertWithoutL2FunctionsInput = {
    update: XOR<L2StructureUpdateWithoutL2FunctionsInput, L2StructureUncheckedUpdateWithoutL2FunctionsInput>
    create: XOR<L2StructureCreateWithoutL2FunctionsInput, L2StructureUncheckedCreateWithoutL2FunctionsInput>
    where?: L2StructureWhereInput
  }

  export type L2StructureUpdateToOneWithWhereWithoutL2FunctionsInput = {
    where?: L2StructureWhereInput
    data: XOR<L2StructureUpdateWithoutL2FunctionsInput, L2StructureUncheckedUpdateWithoutL2FunctionsInput>
  }

  export type L2StructureUpdateWithoutL2FunctionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Structure?: L1StructureUpdateOneRequiredWithoutL2StructuresNestedInput
    l3Structures?: L3StructureUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUpdateManyWithoutL2StructureNestedInput
  }

  export type L2StructureUncheckedUpdateWithoutL2FunctionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structures?: L3StructureUncheckedUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUncheckedUpdateManyWithoutL2StructureNestedInput
  }

  export type FailureModeUpsertWithWhereUniqueWithoutL2FunctionInput = {
    where: FailureModeWhereUniqueInput
    update: XOR<FailureModeUpdateWithoutL2FunctionInput, FailureModeUncheckedUpdateWithoutL2FunctionInput>
    create: XOR<FailureModeCreateWithoutL2FunctionInput, FailureModeUncheckedCreateWithoutL2FunctionInput>
  }

  export type FailureModeUpdateWithWhereUniqueWithoutL2FunctionInput = {
    where: FailureModeWhereUniqueInput
    data: XOR<FailureModeUpdateWithoutL2FunctionInput, FailureModeUncheckedUpdateWithoutL2FunctionInput>
  }

  export type FailureModeUpdateManyWithWhereWithoutL2FunctionInput = {
    where: FailureModeScalarWhereInput
    data: XOR<FailureModeUpdateManyMutationInput, FailureModeUncheckedUpdateManyWithoutL2FunctionInput>
  }

  export type L3StructureCreateWithoutL3FunctionsInput = {
    id?: string
    fmeaId: string
    l1Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structure: L2StructureCreateNestedOneWithoutL3StructuresInput
    failureCauses?: FailureCauseCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureUncheckedCreateWithoutL3FunctionsInput = {
    id?: string
    fmeaId: string
    l1Id: string
    l2Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    failureCauses?: FailureCauseUncheckedCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureCreateOrConnectWithoutL3FunctionsInput = {
    where: L3StructureWhereUniqueInput
    create: XOR<L3StructureCreateWithoutL3FunctionsInput, L3StructureUncheckedCreateWithoutL3FunctionsInput>
  }

  export type FailureCauseCreateWithoutL3FunctionInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structure: L3StructureCreateNestedOneWithoutFailureCausesInput
    failureLinks?: FailureLinkCreateNestedManyWithoutFailureCauseInput
  }

  export type FailureCauseUncheckedCreateWithoutL3FunctionInput = {
    id?: string
    fmeaId: string
    l3StructId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLinks?: FailureLinkUncheckedCreateNestedManyWithoutFailureCauseInput
  }

  export type FailureCauseCreateOrConnectWithoutL3FunctionInput = {
    where: FailureCauseWhereUniqueInput
    create: XOR<FailureCauseCreateWithoutL3FunctionInput, FailureCauseUncheckedCreateWithoutL3FunctionInput>
  }

  export type FailureCauseCreateManyL3FunctionInputEnvelope = {
    data: FailureCauseCreateManyL3FunctionInput | FailureCauseCreateManyL3FunctionInput[]
    skipDuplicates?: boolean
  }

  export type L3StructureUpsertWithoutL3FunctionsInput = {
    update: XOR<L3StructureUpdateWithoutL3FunctionsInput, L3StructureUncheckedUpdateWithoutL3FunctionsInput>
    create: XOR<L3StructureCreateWithoutL3FunctionsInput, L3StructureUncheckedCreateWithoutL3FunctionsInput>
    where?: L3StructureWhereInput
  }

  export type L3StructureUpdateToOneWithWhereWithoutL3FunctionsInput = {
    where?: L3StructureWhereInput
    data: XOR<L3StructureUpdateWithoutL3FunctionsInput, L3StructureUncheckedUpdateWithoutL3FunctionsInput>
  }

  export type L3StructureUpdateWithoutL3FunctionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structure?: L2StructureUpdateOneRequiredWithoutL3StructuresNestedInput
    failureCauses?: FailureCauseUpdateManyWithoutL3StructureNestedInput
  }

  export type L3StructureUncheckedUpdateWithoutL3FunctionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    l2Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureCauses?: FailureCauseUncheckedUpdateManyWithoutL3StructureNestedInput
  }

  export type FailureCauseUpsertWithWhereUniqueWithoutL3FunctionInput = {
    where: FailureCauseWhereUniqueInput
    update: XOR<FailureCauseUpdateWithoutL3FunctionInput, FailureCauseUncheckedUpdateWithoutL3FunctionInput>
    create: XOR<FailureCauseCreateWithoutL3FunctionInput, FailureCauseUncheckedCreateWithoutL3FunctionInput>
  }

  export type FailureCauseUpdateWithWhereUniqueWithoutL3FunctionInput = {
    where: FailureCauseWhereUniqueInput
    data: XOR<FailureCauseUpdateWithoutL3FunctionInput, FailureCauseUncheckedUpdateWithoutL3FunctionInput>
  }

  export type FailureCauseUpdateManyWithWhereWithoutL3FunctionInput = {
    where: FailureCauseScalarWhereInput
    data: XOR<FailureCauseUpdateManyMutationInput, FailureCauseUncheckedUpdateManyWithoutL3FunctionInput>
  }

  export type L1FunctionCreateWithoutFailureEffectsInput = {
    id?: string
    fmeaId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Structure: L1StructureCreateNestedOneWithoutL1FunctionsInput
  }

  export type L1FunctionUncheckedCreateWithoutFailureEffectsInput = {
    id?: string
    fmeaId: string
    l1StructId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L1FunctionCreateOrConnectWithoutFailureEffectsInput = {
    where: L1FunctionWhereUniqueInput
    create: XOR<L1FunctionCreateWithoutFailureEffectsInput, L1FunctionUncheckedCreateWithoutFailureEffectsInput>
  }

  export type FailureLinkCreateWithoutFailureEffectInput = {
    id?: string
    fmeaId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureMode: FailureModeCreateNestedOneWithoutFailureLinksInput
    failureCause: FailureCauseCreateNestedOneWithoutFailureLinksInput
    riskAnalyses?: RiskAnalysisCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkUncheckedCreateWithoutFailureEffectInput = {
    id?: string
    fmeaId: string
    fmId: string
    fcId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    riskAnalyses?: RiskAnalysisUncheckedCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkCreateOrConnectWithoutFailureEffectInput = {
    where: FailureLinkWhereUniqueInput
    create: XOR<FailureLinkCreateWithoutFailureEffectInput, FailureLinkUncheckedCreateWithoutFailureEffectInput>
  }

  export type FailureLinkCreateManyFailureEffectInputEnvelope = {
    data: FailureLinkCreateManyFailureEffectInput | FailureLinkCreateManyFailureEffectInput[]
    skipDuplicates?: boolean
  }

  export type L1FunctionUpsertWithoutFailureEffectsInput = {
    update: XOR<L1FunctionUpdateWithoutFailureEffectsInput, L1FunctionUncheckedUpdateWithoutFailureEffectsInput>
    create: XOR<L1FunctionCreateWithoutFailureEffectsInput, L1FunctionUncheckedCreateWithoutFailureEffectsInput>
    where?: L1FunctionWhereInput
  }

  export type L1FunctionUpdateToOneWithWhereWithoutFailureEffectsInput = {
    where?: L1FunctionWhereInput
    data: XOR<L1FunctionUpdateWithoutFailureEffectsInput, L1FunctionUncheckedUpdateWithoutFailureEffectsInput>
  }

  export type L1FunctionUpdateWithoutFailureEffectsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Structure?: L1StructureUpdateOneRequiredWithoutL1FunctionsNestedInput
  }

  export type L1FunctionUncheckedUpdateWithoutFailureEffectsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1StructId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureLinkUpsertWithWhereUniqueWithoutFailureEffectInput = {
    where: FailureLinkWhereUniqueInput
    update: XOR<FailureLinkUpdateWithoutFailureEffectInput, FailureLinkUncheckedUpdateWithoutFailureEffectInput>
    create: XOR<FailureLinkCreateWithoutFailureEffectInput, FailureLinkUncheckedCreateWithoutFailureEffectInput>
  }

  export type FailureLinkUpdateWithWhereUniqueWithoutFailureEffectInput = {
    where: FailureLinkWhereUniqueInput
    data: XOR<FailureLinkUpdateWithoutFailureEffectInput, FailureLinkUncheckedUpdateWithoutFailureEffectInput>
  }

  export type FailureLinkUpdateManyWithWhereWithoutFailureEffectInput = {
    where: FailureLinkScalarWhereInput
    data: XOR<FailureLinkUpdateManyMutationInput, FailureLinkUncheckedUpdateManyWithoutFailureEffectInput>
  }

  export type FailureLinkScalarWhereInput = {
    AND?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
    OR?: FailureLinkScalarWhereInput[]
    NOT?: FailureLinkScalarWhereInput | FailureLinkScalarWhereInput[]
    id?: StringFilter<"FailureLink"> | string
    fmeaId?: StringFilter<"FailureLink"> | string
    fmId?: StringFilter<"FailureLink"> | string
    feId?: StringFilter<"FailureLink"> | string
    fcId?: StringFilter<"FailureLink"> | string
    createdAt?: DateTimeFilter<"FailureLink"> | Date | string
    updatedAt?: DateTimeFilter<"FailureLink"> | Date | string
  }

  export type L2FunctionCreateWithoutFailureModesInput = {
    id?: string
    fmeaId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structure: L2StructureCreateNestedOneWithoutL2FunctionsInput
  }

  export type L2FunctionUncheckedCreateWithoutFailureModesInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L2FunctionCreateOrConnectWithoutFailureModesInput = {
    where: L2FunctionWhereUniqueInput
    create: XOR<L2FunctionCreateWithoutFailureModesInput, L2FunctionUncheckedCreateWithoutFailureModesInput>
  }

  export type L2StructureCreateWithoutFailureModesInput = {
    id?: string
    fmeaId: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Structure: L1StructureCreateNestedOneWithoutL2StructuresInput
    l3Structures?: L3StructureCreateNestedManyWithoutL2StructureInput
    l2Functions?: L2FunctionCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureUncheckedCreateWithoutFailureModesInput = {
    id?: string
    fmeaId: string
    l1Id: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structures?: L3StructureUncheckedCreateNestedManyWithoutL2StructureInput
    l2Functions?: L2FunctionUncheckedCreateNestedManyWithoutL2StructureInput
  }

  export type L2StructureCreateOrConnectWithoutFailureModesInput = {
    where: L2StructureWhereUniqueInput
    create: XOR<L2StructureCreateWithoutFailureModesInput, L2StructureUncheckedCreateWithoutFailureModesInput>
  }

  export type FailureLinkCreateWithoutFailureModeInput = {
    id?: string
    fmeaId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureEffect: FailureEffectCreateNestedOneWithoutFailureLinksInput
    failureCause: FailureCauseCreateNestedOneWithoutFailureLinksInput
    riskAnalyses?: RiskAnalysisCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkUncheckedCreateWithoutFailureModeInput = {
    id?: string
    fmeaId: string
    feId: string
    fcId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    riskAnalyses?: RiskAnalysisUncheckedCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkCreateOrConnectWithoutFailureModeInput = {
    where: FailureLinkWhereUniqueInput
    create: XOR<FailureLinkCreateWithoutFailureModeInput, FailureLinkUncheckedCreateWithoutFailureModeInput>
  }

  export type FailureLinkCreateManyFailureModeInputEnvelope = {
    data: FailureLinkCreateManyFailureModeInput | FailureLinkCreateManyFailureModeInput[]
    skipDuplicates?: boolean
  }

  export type L2FunctionUpsertWithoutFailureModesInput = {
    update: XOR<L2FunctionUpdateWithoutFailureModesInput, L2FunctionUncheckedUpdateWithoutFailureModesInput>
    create: XOR<L2FunctionCreateWithoutFailureModesInput, L2FunctionUncheckedCreateWithoutFailureModesInput>
    where?: L2FunctionWhereInput
  }

  export type L2FunctionUpdateToOneWithWhereWithoutFailureModesInput = {
    where?: L2FunctionWhereInput
    data: XOR<L2FunctionUpdateWithoutFailureModesInput, L2FunctionUncheckedUpdateWithoutFailureModesInput>
  }

  export type L2FunctionUpdateWithoutFailureModesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structure?: L2StructureUpdateOneRequiredWithoutL2FunctionsNestedInput
  }

  export type L2FunctionUncheckedUpdateWithoutFailureModesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L2StructureUpsertWithoutFailureModesInput = {
    update: XOR<L2StructureUpdateWithoutFailureModesInput, L2StructureUncheckedUpdateWithoutFailureModesInput>
    create: XOR<L2StructureCreateWithoutFailureModesInput, L2StructureUncheckedCreateWithoutFailureModesInput>
    where?: L2StructureWhereInput
  }

  export type L2StructureUpdateToOneWithWhereWithoutFailureModesInput = {
    where?: L2StructureWhereInput
    data: XOR<L2StructureUpdateWithoutFailureModesInput, L2StructureUncheckedUpdateWithoutFailureModesInput>
  }

  export type L2StructureUpdateWithoutFailureModesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Structure?: L1StructureUpdateOneRequiredWithoutL2StructuresNestedInput
    l3Structures?: L3StructureUpdateManyWithoutL2StructureNestedInput
    l2Functions?: L2FunctionUpdateManyWithoutL2StructureNestedInput
  }

  export type L2StructureUncheckedUpdateWithoutFailureModesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structures?: L3StructureUncheckedUpdateManyWithoutL2StructureNestedInput
    l2Functions?: L2FunctionUncheckedUpdateManyWithoutL2StructureNestedInput
  }

  export type FailureLinkUpsertWithWhereUniqueWithoutFailureModeInput = {
    where: FailureLinkWhereUniqueInput
    update: XOR<FailureLinkUpdateWithoutFailureModeInput, FailureLinkUncheckedUpdateWithoutFailureModeInput>
    create: XOR<FailureLinkCreateWithoutFailureModeInput, FailureLinkUncheckedCreateWithoutFailureModeInput>
  }

  export type FailureLinkUpdateWithWhereUniqueWithoutFailureModeInput = {
    where: FailureLinkWhereUniqueInput
    data: XOR<FailureLinkUpdateWithoutFailureModeInput, FailureLinkUncheckedUpdateWithoutFailureModeInput>
  }

  export type FailureLinkUpdateManyWithWhereWithoutFailureModeInput = {
    where: FailureLinkScalarWhereInput
    data: XOR<FailureLinkUpdateManyMutationInput, FailureLinkUncheckedUpdateManyWithoutFailureModeInput>
  }

  export type L3FunctionCreateWithoutFailureCausesInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Structure: L3StructureCreateNestedOneWithoutL3FunctionsInput
  }

  export type L3FunctionUncheckedCreateWithoutFailureCausesInput = {
    id?: string
    fmeaId: string
    l3StructId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L3FunctionCreateOrConnectWithoutFailureCausesInput = {
    where: L3FunctionWhereUniqueInput
    create: XOR<L3FunctionCreateWithoutFailureCausesInput, L3FunctionUncheckedCreateWithoutFailureCausesInput>
  }

  export type L3StructureCreateWithoutFailureCausesInput = {
    id?: string
    fmeaId: string
    l1Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Structure: L2StructureCreateNestedOneWithoutL3StructuresInput
    l3Functions?: L3FunctionCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureUncheckedCreateWithoutFailureCausesInput = {
    id?: string
    fmeaId: string
    l1Id: string
    l2Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Functions?: L3FunctionUncheckedCreateNestedManyWithoutL3StructureInput
  }

  export type L3StructureCreateOrConnectWithoutFailureCausesInput = {
    where: L3StructureWhereUniqueInput
    create: XOR<L3StructureCreateWithoutFailureCausesInput, L3StructureUncheckedCreateWithoutFailureCausesInput>
  }

  export type FailureLinkCreateWithoutFailureCauseInput = {
    id?: string
    fmeaId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureMode: FailureModeCreateNestedOneWithoutFailureLinksInput
    failureEffect: FailureEffectCreateNestedOneWithoutFailureLinksInput
    riskAnalyses?: RiskAnalysisCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkUncheckedCreateWithoutFailureCauseInput = {
    id?: string
    fmeaId: string
    fmId: string
    feId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    riskAnalyses?: RiskAnalysisUncheckedCreateNestedManyWithoutFailureLinkInput
  }

  export type FailureLinkCreateOrConnectWithoutFailureCauseInput = {
    where: FailureLinkWhereUniqueInput
    create: XOR<FailureLinkCreateWithoutFailureCauseInput, FailureLinkUncheckedCreateWithoutFailureCauseInput>
  }

  export type FailureLinkCreateManyFailureCauseInputEnvelope = {
    data: FailureLinkCreateManyFailureCauseInput | FailureLinkCreateManyFailureCauseInput[]
    skipDuplicates?: boolean
  }

  export type L3FunctionUpsertWithoutFailureCausesInput = {
    update: XOR<L3FunctionUpdateWithoutFailureCausesInput, L3FunctionUncheckedUpdateWithoutFailureCausesInput>
    create: XOR<L3FunctionCreateWithoutFailureCausesInput, L3FunctionUncheckedCreateWithoutFailureCausesInput>
    where?: L3FunctionWhereInput
  }

  export type L3FunctionUpdateToOneWithWhereWithoutFailureCausesInput = {
    where?: L3FunctionWhereInput
    data: XOR<L3FunctionUpdateWithoutFailureCausesInput, L3FunctionUncheckedUpdateWithoutFailureCausesInput>
  }

  export type L3FunctionUpdateWithoutFailureCausesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structure?: L3StructureUpdateOneRequiredWithoutL3FunctionsNestedInput
  }

  export type L3FunctionUncheckedUpdateWithoutFailureCausesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L3StructureUpsertWithoutFailureCausesInput = {
    update: XOR<L3StructureUpdateWithoutFailureCausesInput, L3StructureUncheckedUpdateWithoutFailureCausesInput>
    create: XOR<L3StructureCreateWithoutFailureCausesInput, L3StructureUncheckedCreateWithoutFailureCausesInput>
    where?: L3StructureWhereInput
  }

  export type L3StructureUpdateToOneWithWhereWithoutFailureCausesInput = {
    where?: L3StructureWhereInput
    data: XOR<L3StructureUpdateWithoutFailureCausesInput, L3StructureUncheckedUpdateWithoutFailureCausesInput>
  }

  export type L3StructureUpdateWithoutFailureCausesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structure?: L2StructureUpdateOneRequiredWithoutL3StructuresNestedInput
    l3Functions?: L3FunctionUpdateManyWithoutL3StructureNestedInput
  }

  export type L3StructureUncheckedUpdateWithoutFailureCausesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    l2Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Functions?: L3FunctionUncheckedUpdateManyWithoutL3StructureNestedInput
  }

  export type FailureLinkUpsertWithWhereUniqueWithoutFailureCauseInput = {
    where: FailureLinkWhereUniqueInput
    update: XOR<FailureLinkUpdateWithoutFailureCauseInput, FailureLinkUncheckedUpdateWithoutFailureCauseInput>
    create: XOR<FailureLinkCreateWithoutFailureCauseInput, FailureLinkUncheckedCreateWithoutFailureCauseInput>
  }

  export type FailureLinkUpdateWithWhereUniqueWithoutFailureCauseInput = {
    where: FailureLinkWhereUniqueInput
    data: XOR<FailureLinkUpdateWithoutFailureCauseInput, FailureLinkUncheckedUpdateWithoutFailureCauseInput>
  }

  export type FailureLinkUpdateManyWithWhereWithoutFailureCauseInput = {
    where: FailureLinkScalarWhereInput
    data: XOR<FailureLinkUpdateManyMutationInput, FailureLinkUncheckedUpdateManyWithoutFailureCauseInput>
  }

  export type FailureModeCreateWithoutFailureLinksInput = {
    id?: string
    fmeaId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l2Function: L2FunctionCreateNestedOneWithoutFailureModesInput
    l2Structure: L2StructureCreateNestedOneWithoutFailureModesInput
  }

  export type FailureModeUncheckedCreateWithoutFailureLinksInput = {
    id?: string
    fmeaId: string
    l2FuncId: string
    l2StructId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureModeCreateOrConnectWithoutFailureLinksInput = {
    where: FailureModeWhereUniqueInput
    create: XOR<FailureModeCreateWithoutFailureLinksInput, FailureModeUncheckedCreateWithoutFailureLinksInput>
  }

  export type FailureEffectCreateWithoutFailureLinksInput = {
    id?: string
    fmeaId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
    l1Function: L1FunctionCreateNestedOneWithoutFailureEffectsInput
  }

  export type FailureEffectUncheckedCreateWithoutFailureLinksInput = {
    id?: string
    fmeaId: string
    l1FuncId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureEffectCreateOrConnectWithoutFailureLinksInput = {
    where: FailureEffectWhereUniqueInput
    create: XOR<FailureEffectCreateWithoutFailureLinksInput, FailureEffectUncheckedCreateWithoutFailureLinksInput>
  }

  export type FailureCauseCreateWithoutFailureLinksInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    l3Function: L3FunctionCreateNestedOneWithoutFailureCausesInput
    l3Structure: L3StructureCreateNestedOneWithoutFailureCausesInput
  }

  export type FailureCauseUncheckedCreateWithoutFailureLinksInput = {
    id?: string
    fmeaId: string
    l3FuncId: string
    l3StructId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureCauseCreateOrConnectWithoutFailureLinksInput = {
    where: FailureCauseWhereUniqueInput
    create: XOR<FailureCauseCreateWithoutFailureLinksInput, FailureCauseUncheckedCreateWithoutFailureLinksInput>
  }

  export type RiskAnalysisCreateWithoutFailureLinkInput = {
    id?: string
    fmeaId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    optimizations?: OptimizationCreateNestedManyWithoutRiskAnalysisInput
  }

  export type RiskAnalysisUncheckedCreateWithoutFailureLinkInput = {
    id?: string
    fmeaId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    optimizations?: OptimizationUncheckedCreateNestedManyWithoutRiskAnalysisInput
  }

  export type RiskAnalysisCreateOrConnectWithoutFailureLinkInput = {
    where: RiskAnalysisWhereUniqueInput
    create: XOR<RiskAnalysisCreateWithoutFailureLinkInput, RiskAnalysisUncheckedCreateWithoutFailureLinkInput>
  }

  export type RiskAnalysisCreateManyFailureLinkInputEnvelope = {
    data: RiskAnalysisCreateManyFailureLinkInput | RiskAnalysisCreateManyFailureLinkInput[]
    skipDuplicates?: boolean
  }

  export type FailureModeUpsertWithoutFailureLinksInput = {
    update: XOR<FailureModeUpdateWithoutFailureLinksInput, FailureModeUncheckedUpdateWithoutFailureLinksInput>
    create: XOR<FailureModeCreateWithoutFailureLinksInput, FailureModeUncheckedCreateWithoutFailureLinksInput>
    where?: FailureModeWhereInput
  }

  export type FailureModeUpdateToOneWithWhereWithoutFailureLinksInput = {
    where?: FailureModeWhereInput
    data: XOR<FailureModeUpdateWithoutFailureLinksInput, FailureModeUncheckedUpdateWithoutFailureLinksInput>
  }

  export type FailureModeUpdateWithoutFailureLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Function?: L2FunctionUpdateOneRequiredWithoutFailureModesNestedInput
    l2Structure?: L2StructureUpdateOneRequiredWithoutFailureModesNestedInput
  }

  export type FailureModeUncheckedUpdateWithoutFailureLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2FuncId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureEffectUpsertWithoutFailureLinksInput = {
    update: XOR<FailureEffectUpdateWithoutFailureLinksInput, FailureEffectUncheckedUpdateWithoutFailureLinksInput>
    create: XOR<FailureEffectCreateWithoutFailureLinksInput, FailureEffectUncheckedCreateWithoutFailureLinksInput>
    where?: FailureEffectWhereInput
  }

  export type FailureEffectUpdateToOneWithWhereWithoutFailureLinksInput = {
    where?: FailureEffectWhereInput
    data: XOR<FailureEffectUpdateWithoutFailureLinksInput, FailureEffectUncheckedUpdateWithoutFailureLinksInput>
  }

  export type FailureEffectUpdateWithoutFailureLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l1Function?: L1FunctionUpdateOneRequiredWithoutFailureEffectsNestedInput
  }

  export type FailureEffectUncheckedUpdateWithoutFailureLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1FuncId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureCauseUpsertWithoutFailureLinksInput = {
    update: XOR<FailureCauseUpdateWithoutFailureLinksInput, FailureCauseUncheckedUpdateWithoutFailureLinksInput>
    create: XOR<FailureCauseCreateWithoutFailureLinksInput, FailureCauseUncheckedCreateWithoutFailureLinksInput>
    where?: FailureCauseWhereInput
  }

  export type FailureCauseUpdateToOneWithWhereWithoutFailureLinksInput = {
    where?: FailureCauseWhereInput
    data: XOR<FailureCauseUpdateWithoutFailureLinksInput, FailureCauseUncheckedUpdateWithoutFailureLinksInput>
  }

  export type FailureCauseUpdateWithoutFailureLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Function?: L3FunctionUpdateOneRequiredWithoutFailureCausesNestedInput
    l3Structure?: L3StructureUpdateOneRequiredWithoutFailureCausesNestedInput
  }

  export type FailureCauseUncheckedUpdateWithoutFailureLinksInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3FuncId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RiskAnalysisUpsertWithWhereUniqueWithoutFailureLinkInput = {
    where: RiskAnalysisWhereUniqueInput
    update: XOR<RiskAnalysisUpdateWithoutFailureLinkInput, RiskAnalysisUncheckedUpdateWithoutFailureLinkInput>
    create: XOR<RiskAnalysisCreateWithoutFailureLinkInput, RiskAnalysisUncheckedCreateWithoutFailureLinkInput>
  }

  export type RiskAnalysisUpdateWithWhereUniqueWithoutFailureLinkInput = {
    where: RiskAnalysisWhereUniqueInput
    data: XOR<RiskAnalysisUpdateWithoutFailureLinkInput, RiskAnalysisUncheckedUpdateWithoutFailureLinkInput>
  }

  export type RiskAnalysisUpdateManyWithWhereWithoutFailureLinkInput = {
    where: RiskAnalysisScalarWhereInput
    data: XOR<RiskAnalysisUpdateManyMutationInput, RiskAnalysisUncheckedUpdateManyWithoutFailureLinkInput>
  }

  export type RiskAnalysisScalarWhereInput = {
    AND?: RiskAnalysisScalarWhereInput | RiskAnalysisScalarWhereInput[]
    OR?: RiskAnalysisScalarWhereInput[]
    NOT?: RiskAnalysisScalarWhereInput | RiskAnalysisScalarWhereInput[]
    id?: StringFilter<"RiskAnalysis"> | string
    fmeaId?: StringFilter<"RiskAnalysis"> | string
    linkId?: StringFilter<"RiskAnalysis"> | string
    severity?: IntFilter<"RiskAnalysis"> | number
    occurrence?: IntFilter<"RiskAnalysis"> | number
    detection?: IntFilter<"RiskAnalysis"> | number
    ap?: StringFilter<"RiskAnalysis"> | string
    preventionControl?: StringNullableFilter<"RiskAnalysis"> | string | null
    detectionControl?: StringNullableFilter<"RiskAnalysis"> | string | null
    createdAt?: DateTimeFilter<"RiskAnalysis"> | Date | string
    updatedAt?: DateTimeFilter<"RiskAnalysis"> | Date | string
  }

  export type FailureLinkCreateWithoutRiskAnalysesInput = {
    id?: string
    fmeaId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    failureMode: FailureModeCreateNestedOneWithoutFailureLinksInput
    failureEffect: FailureEffectCreateNestedOneWithoutFailureLinksInput
    failureCause: FailureCauseCreateNestedOneWithoutFailureLinksInput
  }

  export type FailureLinkUncheckedCreateWithoutRiskAnalysesInput = {
    id?: string
    fmeaId: string
    fmId: string
    feId: string
    fcId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureLinkCreateOrConnectWithoutRiskAnalysesInput = {
    where: FailureLinkWhereUniqueInput
    create: XOR<FailureLinkCreateWithoutRiskAnalysesInput, FailureLinkUncheckedCreateWithoutRiskAnalysesInput>
  }

  export type OptimizationCreateWithoutRiskAnalysisInput = {
    id?: string
    fmeaId: string
    recommendedAction: string
    responsible: string
    targetDate: string
    newSeverity?: number | null
    newOccurrence?: number | null
    newDetection?: number | null
    newAP?: string | null
    status: string
    completedDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OptimizationUncheckedCreateWithoutRiskAnalysisInput = {
    id?: string
    fmeaId: string
    recommendedAction: string
    responsible: string
    targetDate: string
    newSeverity?: number | null
    newOccurrence?: number | null
    newDetection?: number | null
    newAP?: string | null
    status: string
    completedDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OptimizationCreateOrConnectWithoutRiskAnalysisInput = {
    where: OptimizationWhereUniqueInput
    create: XOR<OptimizationCreateWithoutRiskAnalysisInput, OptimizationUncheckedCreateWithoutRiskAnalysisInput>
  }

  export type OptimizationCreateManyRiskAnalysisInputEnvelope = {
    data: OptimizationCreateManyRiskAnalysisInput | OptimizationCreateManyRiskAnalysisInput[]
    skipDuplicates?: boolean
  }

  export type FailureLinkUpsertWithoutRiskAnalysesInput = {
    update: XOR<FailureLinkUpdateWithoutRiskAnalysesInput, FailureLinkUncheckedUpdateWithoutRiskAnalysesInput>
    create: XOR<FailureLinkCreateWithoutRiskAnalysesInput, FailureLinkUncheckedCreateWithoutRiskAnalysesInput>
    where?: FailureLinkWhereInput
  }

  export type FailureLinkUpdateToOneWithWhereWithoutRiskAnalysesInput = {
    where?: FailureLinkWhereInput
    data: XOR<FailureLinkUpdateWithoutRiskAnalysesInput, FailureLinkUncheckedUpdateWithoutRiskAnalysesInput>
  }

  export type FailureLinkUpdateWithoutRiskAnalysesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureMode?: FailureModeUpdateOneRequiredWithoutFailureLinksNestedInput
    failureEffect?: FailureEffectUpdateOneRequiredWithoutFailureLinksNestedInput
    failureCause?: FailureCauseUpdateOneRequiredWithoutFailureLinksNestedInput
  }

  export type FailureLinkUncheckedUpdateWithoutRiskAnalysesInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    fmId?: StringFieldUpdateOperationsInput | string
    feId?: StringFieldUpdateOperationsInput | string
    fcId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OptimizationUpsertWithWhereUniqueWithoutRiskAnalysisInput = {
    where: OptimizationWhereUniqueInput
    update: XOR<OptimizationUpdateWithoutRiskAnalysisInput, OptimizationUncheckedUpdateWithoutRiskAnalysisInput>
    create: XOR<OptimizationCreateWithoutRiskAnalysisInput, OptimizationUncheckedCreateWithoutRiskAnalysisInput>
  }

  export type OptimizationUpdateWithWhereUniqueWithoutRiskAnalysisInput = {
    where: OptimizationWhereUniqueInput
    data: XOR<OptimizationUpdateWithoutRiskAnalysisInput, OptimizationUncheckedUpdateWithoutRiskAnalysisInput>
  }

  export type OptimizationUpdateManyWithWhereWithoutRiskAnalysisInput = {
    where: OptimizationScalarWhereInput
    data: XOR<OptimizationUpdateManyMutationInput, OptimizationUncheckedUpdateManyWithoutRiskAnalysisInput>
  }

  export type OptimizationScalarWhereInput = {
    AND?: OptimizationScalarWhereInput | OptimizationScalarWhereInput[]
    OR?: OptimizationScalarWhereInput[]
    NOT?: OptimizationScalarWhereInput | OptimizationScalarWhereInput[]
    id?: StringFilter<"Optimization"> | string
    fmeaId?: StringFilter<"Optimization"> | string
    riskId?: StringFilter<"Optimization"> | string
    recommendedAction?: StringFilter<"Optimization"> | string
    responsible?: StringFilter<"Optimization"> | string
    targetDate?: StringFilter<"Optimization"> | string
    newSeverity?: IntNullableFilter<"Optimization"> | number | null
    newOccurrence?: IntNullableFilter<"Optimization"> | number | null
    newDetection?: IntNullableFilter<"Optimization"> | number | null
    newAP?: StringNullableFilter<"Optimization"> | string | null
    status?: StringFilter<"Optimization"> | string
    completedDate?: StringNullableFilter<"Optimization"> | string | null
    createdAt?: DateTimeFilter<"Optimization"> | Date | string
    updatedAt?: DateTimeFilter<"Optimization"> | Date | string
  }

  export type RiskAnalysisCreateWithoutOptimizationsInput = {
    id?: string
    fmeaId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    failureLink: FailureLinkCreateNestedOneWithoutRiskAnalysesInput
  }

  export type RiskAnalysisUncheckedCreateWithoutOptimizationsInput = {
    id?: string
    fmeaId: string
    linkId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RiskAnalysisCreateOrConnectWithoutOptimizationsInput = {
    where: RiskAnalysisWhereUniqueInput
    create: XOR<RiskAnalysisCreateWithoutOptimizationsInput, RiskAnalysisUncheckedCreateWithoutOptimizationsInput>
  }

  export type RiskAnalysisUpsertWithoutOptimizationsInput = {
    update: XOR<RiskAnalysisUpdateWithoutOptimizationsInput, RiskAnalysisUncheckedUpdateWithoutOptimizationsInput>
    create: XOR<RiskAnalysisCreateWithoutOptimizationsInput, RiskAnalysisUncheckedCreateWithoutOptimizationsInput>
    where?: RiskAnalysisWhereInput
  }

  export type RiskAnalysisUpdateToOneWithWhereWithoutOptimizationsInput = {
    where?: RiskAnalysisWhereInput
    data: XOR<RiskAnalysisUpdateWithoutOptimizationsInput, RiskAnalysisUncheckedUpdateWithoutOptimizationsInput>
  }

  export type RiskAnalysisUpdateWithoutOptimizationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLink?: FailureLinkUpdateOneRequiredWithoutRiskAnalysesNestedInput
  }

  export type RiskAnalysisUncheckedUpdateWithoutOptimizationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    linkId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L2StructureCreateManyL1StructureInput = {
    id?: string
    fmeaId: string
    no: string
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L1FunctionCreateManyL1StructureInput = {
    id?: string
    fmeaId: string
    category: string
    functionName: string
    requirement: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L2StructureUpdateWithoutL1StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structures?: L3StructureUpdateManyWithoutL2StructureNestedInput
    l2Functions?: L2FunctionUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUpdateManyWithoutL2StructureNestedInput
  }

  export type L2StructureUncheckedUpdateWithoutL1StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structures?: L3StructureUncheckedUpdateManyWithoutL2StructureNestedInput
    l2Functions?: L2FunctionUncheckedUpdateManyWithoutL2StructureNestedInput
    failureModes?: FailureModeUncheckedUpdateManyWithoutL2StructureNestedInput
  }

  export type L2StructureUncheckedUpdateManyWithoutL1StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    no?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L1FunctionUpdateWithoutL1StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureEffects?: FailureEffectUpdateManyWithoutL1FunctionNestedInput
  }

  export type L1FunctionUncheckedUpdateWithoutL1StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureEffects?: FailureEffectUncheckedUpdateManyWithoutL1FunctionNestedInput
  }

  export type L1FunctionUncheckedUpdateManyWithoutL1StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    requirement?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L3StructureCreateManyL2StructureInput = {
    id?: string
    fmeaId: string
    l1Id: string
    m4?: string | null
    name: string
    order: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L2FunctionCreateManyL2StructureInput = {
    id?: string
    fmeaId: string
    functionName: string
    productChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureModeCreateManyL2StructureInput = {
    id?: string
    fmeaId: string
    l2FuncId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L3StructureUpdateWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Functions?: L3FunctionUpdateManyWithoutL3StructureNestedInput
    failureCauses?: FailureCauseUpdateManyWithoutL3StructureNestedInput
  }

  export type L3StructureUncheckedUpdateWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Functions?: L3FunctionUncheckedUpdateManyWithoutL3StructureNestedInput
    failureCauses?: FailureCauseUncheckedUpdateManyWithoutL3StructureNestedInput
  }

  export type L3StructureUncheckedUpdateManyWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l1Id?: StringFieldUpdateOperationsInput | string
    m4?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    order?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L2FunctionUpdateWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureModes?: FailureModeUpdateManyWithoutL2FunctionNestedInput
  }

  export type L2FunctionUncheckedUpdateWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureModes?: FailureModeUncheckedUpdateManyWithoutL2FunctionNestedInput
  }

  export type L2FunctionUncheckedUpdateManyWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    productChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureModeUpdateWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Function?: L2FunctionUpdateOneRequiredWithoutFailureModesNestedInput
    failureLinks?: FailureLinkUpdateManyWithoutFailureModeNestedInput
  }

  export type FailureModeUncheckedUpdateWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2FuncId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureModeNestedInput
  }

  export type FailureModeUncheckedUpdateManyWithoutL2StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2FuncId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type L3FunctionCreateManyL3StructureInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    functionName: string
    processChar: string
    specialChar?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureCauseCreateManyL3StructureInput = {
    id?: string
    fmeaId: string
    l3FuncId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type L3FunctionUpdateWithoutL3StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureCauses?: FailureCauseUpdateManyWithoutL3FunctionNestedInput
  }

  export type L3FunctionUncheckedUpdateWithoutL3StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureCauses?: FailureCauseUncheckedUpdateManyWithoutL3FunctionNestedInput
  }

  export type L3FunctionUncheckedUpdateManyWithoutL3StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    functionName?: StringFieldUpdateOperationsInput | string
    processChar?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureCauseUpdateWithoutL3StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Function?: L3FunctionUpdateOneRequiredWithoutFailureCausesNestedInput
    failureLinks?: FailureLinkUpdateManyWithoutFailureCauseNestedInput
  }

  export type FailureCauseUncheckedUpdateWithoutL3StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3FuncId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureCauseNestedInput
  }

  export type FailureCauseUncheckedUpdateManyWithoutL3StructureInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3FuncId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureEffectCreateManyL1FunctionInput = {
    id?: string
    fmeaId: string
    category: string
    effect: string
    severity: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureEffectUpdateWithoutL1FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUpdateManyWithoutFailureEffectNestedInput
  }

  export type FailureEffectUncheckedUpdateWithoutL1FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureEffectNestedInput
  }

  export type FailureEffectUncheckedUpdateManyWithoutL1FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    effect?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureModeCreateManyL2FunctionInput = {
    id?: string
    fmeaId: string
    l2StructId: string
    productCharId?: string | null
    mode: string
    specialChar?: boolean | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureModeUpdateWithoutL2FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l2Structure?: L2StructureUpdateOneRequiredWithoutFailureModesNestedInput
    failureLinks?: FailureLinkUpdateManyWithoutFailureModeNestedInput
  }

  export type FailureModeUncheckedUpdateWithoutL2FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureModeNestedInput
  }

  export type FailureModeUncheckedUpdateManyWithoutL2FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    productCharId?: NullableStringFieldUpdateOperationsInput | string | null
    mode?: StringFieldUpdateOperationsInput | string
    specialChar?: NullableBoolFieldUpdateOperationsInput | boolean | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureCauseCreateManyL3FunctionInput = {
    id?: string
    fmeaId: string
    l3StructId: string
    l2StructId: string
    cause: string
    occurrence?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureCauseUpdateWithoutL3FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    l3Structure?: L3StructureUpdateOneRequiredWithoutFailureCausesNestedInput
    failureLinks?: FailureLinkUpdateManyWithoutFailureCauseNestedInput
  }

  export type FailureCauseUncheckedUpdateWithoutL3FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureLinks?: FailureLinkUncheckedUpdateManyWithoutFailureCauseNestedInput
  }

  export type FailureCauseUncheckedUpdateManyWithoutL3FunctionInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    l3StructId?: StringFieldUpdateOperationsInput | string
    l2StructId?: StringFieldUpdateOperationsInput | string
    cause?: StringFieldUpdateOperationsInput | string
    occurrence?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureLinkCreateManyFailureEffectInput = {
    id?: string
    fmeaId: string
    fmId: string
    fcId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureLinkUpdateWithoutFailureEffectInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureMode?: FailureModeUpdateOneRequiredWithoutFailureLinksNestedInput
    failureCause?: FailureCauseUpdateOneRequiredWithoutFailureLinksNestedInput
    riskAnalyses?: RiskAnalysisUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkUncheckedUpdateWithoutFailureEffectInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    fmId?: StringFieldUpdateOperationsInput | string
    fcId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    riskAnalyses?: RiskAnalysisUncheckedUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkUncheckedUpdateManyWithoutFailureEffectInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    fmId?: StringFieldUpdateOperationsInput | string
    fcId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureLinkCreateManyFailureModeInput = {
    id?: string
    fmeaId: string
    feId: string
    fcId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureLinkUpdateWithoutFailureModeInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureEffect?: FailureEffectUpdateOneRequiredWithoutFailureLinksNestedInput
    failureCause?: FailureCauseUpdateOneRequiredWithoutFailureLinksNestedInput
    riskAnalyses?: RiskAnalysisUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkUncheckedUpdateWithoutFailureModeInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    feId?: StringFieldUpdateOperationsInput | string
    fcId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    riskAnalyses?: RiskAnalysisUncheckedUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkUncheckedUpdateManyWithoutFailureModeInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    feId?: StringFieldUpdateOperationsInput | string
    fcId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FailureLinkCreateManyFailureCauseInput = {
    id?: string
    fmeaId: string
    fmId: string
    feId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FailureLinkUpdateWithoutFailureCauseInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    failureMode?: FailureModeUpdateOneRequiredWithoutFailureLinksNestedInput
    failureEffect?: FailureEffectUpdateOneRequiredWithoutFailureLinksNestedInput
    riskAnalyses?: RiskAnalysisUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkUncheckedUpdateWithoutFailureCauseInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    fmId?: StringFieldUpdateOperationsInput | string
    feId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    riskAnalyses?: RiskAnalysisUncheckedUpdateManyWithoutFailureLinkNestedInput
  }

  export type FailureLinkUncheckedUpdateManyWithoutFailureCauseInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    fmId?: StringFieldUpdateOperationsInput | string
    feId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RiskAnalysisCreateManyFailureLinkInput = {
    id?: string
    fmeaId: string
    severity: number
    occurrence: number
    detection: number
    ap: string
    preventionControl?: string | null
    detectionControl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RiskAnalysisUpdateWithoutFailureLinkInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    optimizations?: OptimizationUpdateManyWithoutRiskAnalysisNestedInput
  }

  export type RiskAnalysisUncheckedUpdateWithoutFailureLinkInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    optimizations?: OptimizationUncheckedUpdateManyWithoutRiskAnalysisNestedInput
  }

  export type RiskAnalysisUncheckedUpdateManyWithoutFailureLinkInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    severity?: IntFieldUpdateOperationsInput | number
    occurrence?: IntFieldUpdateOperationsInput | number
    detection?: IntFieldUpdateOperationsInput | number
    ap?: StringFieldUpdateOperationsInput | string
    preventionControl?: NullableStringFieldUpdateOperationsInput | string | null
    detectionControl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OptimizationCreateManyRiskAnalysisInput = {
    id?: string
    fmeaId: string
    recommendedAction: string
    responsible: string
    targetDate: string
    newSeverity?: number | null
    newOccurrence?: number | null
    newDetection?: number | null
    newAP?: string | null
    status: string
    completedDate?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OptimizationUpdateWithoutRiskAnalysisInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    recommendedAction?: StringFieldUpdateOperationsInput | string
    responsible?: StringFieldUpdateOperationsInput | string
    targetDate?: StringFieldUpdateOperationsInput | string
    newSeverity?: NullableIntFieldUpdateOperationsInput | number | null
    newOccurrence?: NullableIntFieldUpdateOperationsInput | number | null
    newDetection?: NullableIntFieldUpdateOperationsInput | number | null
    newAP?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    completedDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OptimizationUncheckedUpdateWithoutRiskAnalysisInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    recommendedAction?: StringFieldUpdateOperationsInput | string
    responsible?: StringFieldUpdateOperationsInput | string
    targetDate?: StringFieldUpdateOperationsInput | string
    newSeverity?: NullableIntFieldUpdateOperationsInput | number | null
    newOccurrence?: NullableIntFieldUpdateOperationsInput | number | null
    newDetection?: NullableIntFieldUpdateOperationsInput | number | null
    newAP?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    completedDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OptimizationUncheckedUpdateManyWithoutRiskAnalysisInput = {
    id?: StringFieldUpdateOperationsInput | string
    fmeaId?: StringFieldUpdateOperationsInput | string
    recommendedAction?: StringFieldUpdateOperationsInput | string
    responsible?: StringFieldUpdateOperationsInput | string
    targetDate?: StringFieldUpdateOperationsInput | string
    newSeverity?: NullableIntFieldUpdateOperationsInput | number | null
    newOccurrence?: NullableIntFieldUpdateOperationsInput | number | null
    newDetection?: NullableIntFieldUpdateOperationsInput | number | null
    newAP?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    completedDate?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}