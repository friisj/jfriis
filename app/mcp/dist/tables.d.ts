import { z } from 'zod';
export interface TableDefinition {
    description: string;
    schema: z.ZodObject<any>;
    createSchema: z.ZodObject<any>;
    updateSchema: z.ZodObject<any>;
    hasSlug?: boolean;
}
export declare const tables: Record<string, TableDefinition>;
export declare function getTableColumns(tableName: string): Array<{
    name: string;
    type: string;
    required: boolean;
}>;
export declare function isValidTable(tableName: string): boolean;
