interface SuccessResponse<T> {
    data: T;
    count?: number;
    error?: undefined;
}
interface ErrorResponse {
    data: null;
    error: string;
    validation_errors?: string[];
    code?: string;
}
type Response<T> = SuccessResponse<T> | ErrorResponse;
export declare function dbListTables(): Promise<Response<{
    tables: Array<{
        name: string;
        description: string;
        columns: Array<{
            name: string;
            type: string;
            required: boolean;
        }>;
    }>;
}>>;
export interface DbQueryInput {
    table: string;
    select?: string;
    filter?: Record<string, any>;
    filter_in?: Record<string, any[]>;
    filter_like?: Record<string, string>;
    order_by?: {
        column: string;
        ascending?: boolean;
    };
    limit?: number;
    offset?: number;
}
export declare function dbQuery(input: DbQueryInput): Promise<Response<Record<string, any>[]>>;
export interface DbGetInput {
    table: string;
    id?: string;
    slug?: string;
}
export declare function dbGet(input: DbGetInput): Promise<Response<Record<string, any> | null>>;
export interface DbCreateInput {
    table: string;
    data: Record<string, any>;
}
export declare function dbCreate(input: DbCreateInput): Promise<Response<Record<string, any>>>;
export interface DbUpdateInput {
    table: string;
    id: string;
    data: Record<string, any>;
}
export declare function dbUpdate(input: DbUpdateInput): Promise<Response<Record<string, any>>>;
export interface DbDeleteInput {
    table: string;
    id: string;
}
export declare function dbDelete(input: DbDeleteInput): Promise<Response<{
    success: boolean;
}>>;
export {};
