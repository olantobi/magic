
/*
 * Copyright(c) Thomas Hansen thomas@servergardens.com, all right reserved
 */

// Application specific imports.
import { Verb } from "./verb.model";
import { ColumnEx } from "./column-ex.model";

/**
 * Table class containing meta information about
 * a single table in a single database.
 */
export class TableEx {

  /**
   * Name of table.
   */
  name: string;

  /**
   * Name of module to generate.
   */
  moduleName?: string;

  /**
   * Name of module to generate.
   */
  moduleUrl?: string;

  /**
   * Number of seconds to cache results of
   * read and count endpoint.
   */
  cache?: number;

  /**
   * Whether or not cache should be public or not, implying
   * proxies can cache result.
   */
  publicCache?: boolean;

  /**
   * Columns in table.
   */
  columns: ColumnEx[];

  /**
   * HTTP verbs to generate for table.
   */
  verbs: Verb[];

  /**
   * Whether or not delete invocations should be logged.
   */
  logDelete: boolean;

  /**
   * Whether or not put invocations should be logged.
   */
  logPut: boolean;

  /**
   * Authentication requirements for invoking POST endpoint.
   */
  authPost: string;

  /**
   * Authentication requirements for invoking GET endpoint.
   */
  authGet: string;

  /**
   * Authentication requirements for invoking PUT endpoint.
   */
  authPut: string;

  /**
   * Authentication requirements for invoking DELETE endpoint.
   */
  authDelete: string;

  /**
   * Additional validators, injectables and transformers for endpoint.
   */
  validators: string;

  /**
   * Whether or not to turn on the CQRS pattern for table or not.
   */
  cqrs: boolean;

  /**
   * If CQRS is turned on, this declares what type of authorisation requirements
   * the messages will be published with. Legal values are.
   * 
   * - none
   * - inherited
   * - roles
   * 
   * If type is 'roles' the cqrsAuthorisationValues should be a comma separated
   * list of which roles messages are published to.
   */
   cqrsAuthorisation?: string;

   /**
    * Only relevant if above field is 'roles', at which point this should be
    * the comma separated list of which roles messages are published to.
    */
   cqrsAuthorisationValues?: string;
 }
