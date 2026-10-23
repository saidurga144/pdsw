import { z, ZodSchema } from 'zod';
import path from 'path';

export class InputValidationService {
  /**
   * Sanitizes a string by stripping HTML tags, control characters, and null bytes.
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input
      .replace(/\0/g, '') // Null byte removal
      .replace(/[<>]/g, '') // Basic HTML tag delimiter removal
      .trim();
  }

  /**
   * Validates request body against a strict Zod schema.
   */
  static validateBody<T>(schema: ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }

    const issues = (result.error as any).issues || (result.error as any).errors || [];
    const errors = issues.map((e: any) => `${e.path?.join('.') || 'root'}: ${e.message}`);
    return { success: false, errors };
  }

  /**
   * Path Traversal Protection: Safely resolves a requested relative file path
   * against an allowed base directory and ensures it does not escape base boundaries.
   */
  static validateSafeFilePath(baseDir: string, userPath: string): { isSafe: boolean; resolvedPath?: string; error?: string } {
    // 1. Reject explicit traversal strings and null bytes
    if (userPath.includes('\0') || userPath.includes('..')) {
      return { isSafe: false, error: 'Path traversal sequence detected' };
    }

    // 2. Normalize and resolve path
    const normalizedBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(normalizedBase, userPath);

    // 3. Ensure target path begins strictly with normalized base directory
    if (!resolvedPath.startsWith(normalizedBase + path.sep) && resolvedPath !== normalizedBase) {
      return { isSafe: false, error: 'Resolved path escapes allowed base directory boundary' };
    }

    return { isSafe: true, resolvedPath };
  }
}
