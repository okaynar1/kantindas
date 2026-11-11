import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from '../types.ts';

export function getSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  const effectiveKey = serviceRoleKey || anonKey;
  return {
    url,
    anonKey,
    serviceRoleKey,
    effectiveKey,
    isConfigured: Boolean(url && effectiveKey),
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedAdminClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseAdminClient(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env.url || !env.serviceRoleKey) return null;
  if (cachedAdminClient) return cachedAdminClient;
  try {
    cachedAdminClient = createClient(env.url, env.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return cachedAdminClient;
  } catch (err) {
    console.error('[Supabase Admin] Failed to initialize admin client:', err);
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env.isConfigured) {
    return null;
  }
  if (cachedClient && lastUsedUrl === env.url && lastUsedKey === env.effectiveKey) {
    return cachedClient;
  }
  try {
    cachedClient = createClient(env.url, env.effectiveKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUsedUrl = env.url;
    lastUsedKey = env.effectiveKey;
    console.log(`[Supabase] Client initialized for URL: ${env.url} (Service Role: ${Boolean(env.serviceRoleKey)})`);
    return cachedClient;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err);
    return null;
  }
}

export const isSupabaseConfigured = Boolean(getSupabaseEnv().isConfigured);

/**
 * Creates or retrieves a Supabase client scoped to a user's JWT access token.
 * This ensures that PostgreSQL RLS policies evaluate `auth.uid()` correctly.
 */
export function getUserScopedClient(token: string): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env.isConfigured || !token) return null;
  try {
    return createClient(env.url, env.anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialize user scoped client:', err);
    return null;
  }
}

// Initial bootstrap
export const supabase: SupabaseClient | null = getSupabaseClient();

export interface SupabaseStatus {
  configured: boolean;
  projectUrl: string;
  connected: boolean;
  tablesFound: boolean;
  missingTables: string[];
  message: string;
  hasAnonKey?: boolean;
  hasServiceRoleKey?: boolean;
}

/**
 * Helper to convert top-level object keys from camelCase to snake_case for PostgreSQL
 */
export function toSnakeCase(record: any): any {
  if (!record || typeof record !== 'object') return record;
  if (Array.isArray(record)) return record.map(toSnakeCase);
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(record)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = val;
  }
  return result;
}

/**
 * Helper to convert top-level object keys from snake_case to camelCase for TypeScript
 */
export function toCamelCase(record: any): any {
  if (!record || typeof record !== 'object') return record;
  if (Array.isArray(record)) return record.map(toCamelCase);
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(record)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, p1) => p1.toUpperCase());
    result[camelKey] = val;
  }
  return result;
}

/**
 * Normalize table name to lowercase snake_case
 */
function normalizeTableName(table: string): string {
  return table.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export async function testSupabaseConnection(): Promise<SupabaseStatus> {
  const env = getSupabaseEnv();
  const client = getSupabaseClient();

  if (!client || !env.isConfigured) {
    return {
      configured: false,
      projectUrl: '',
      connected: false,
      tablesFound: false,
      missingTables: [],
      hasAnonKey: Boolean(env.anonKey),
      hasServiceRoleKey: Boolean(env.serviceRoleKey),
      message: 'Yeni Supabase bağlantı bilgileri (SUPABASE_URL ve SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY) henüz ortam değişkenlerinde tanımlanmamış. .env dosyasında yapılandırınız.',
    };
  }

  try {
    const { data: _data, error, status } = await client.from('schools').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table') || error.message.includes('relation "public.schools" does not exist')) {
        return {
          configured: true,
          projectUrl: env.url,
          connected: true,
          tablesFound: false,
          missingTables: ['schools', 'users', 'students', 'products', 'orders', '...'],
          hasAnonKey: Boolean(env.anonKey),
          hasServiceRoleKey: Boolean(env.serviceRoleKey),
          message: 'Supabase bağlantısı başarılı ancak tablolar henüz oluşturulmamış. Lütfen 001_complete_schema.sql dosyasını Supabase SQL Editor alanında çalıştırın.',
        };
      }
      return {
        configured: true,
        projectUrl: env.url,
        connected: false,
        tablesFound: false,
        missingTables: [],
        hasAnonKey: Boolean(env.anonKey),
        hasServiceRoleKey: Boolean(env.serviceRoleKey),
        message: `Supabase hatası: ${error.message} (${error.code || status})`,
      };
    }

    return {
      configured: true,
      projectUrl: env.url,
      connected: true,
      tablesFound: true,
      missingTables: [],
      hasAnonKey: Boolean(env.anonKey),
      hasServiceRoleKey: Boolean(env.serviceRoleKey),
      message: 'Supabase veritabanı bağlantısı ve çok okullu tablolar hazır ve senkronize!',
    };
  } catch (err: any) {
    return {
      configured: true,
      projectUrl: env.url,
      connected: false,
      tablesFound: false,
      missingTables: [],
      message: `Bağlantı hatası: ${err.message}`,
    };
  }
}

/**
 * Asynchronously upsert a record into Supabase without blocking local responses
 */
export async function syncToSupabase(table: string, record: any): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const targetTable = normalizeTableName(table);
    const snakeRecord = toSnakeCase(record);
    const { error } = await client.from(targetTable).upsert(snakeRecord, { onConflict: 'id' });
    if (error) {
      // If table doesn't exist yet, do not spam with errors
      if (error.code !== 'PGRST205') {
        console.warn(`[Supabase Sync] Upsert to ${targetTable} error:`, error.message);
      }
    }
  } catch (err: any) {
    console.warn(`[Supabase Sync] Exception during sync to ${table}:`, err?.message);
  }
}

/**
 * Asynchronously delete a record from Supabase
 */
export async function deleteFromSupabase(table: string, id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const targetTable = normalizeTableName(table);
    const { error } = await client.from(targetTable).delete().eq('id', id);
    if (error && error.code !== 'PGRST205') {
      console.warn(`[Supabase Sync] Delete from ${targetTable} error:`, error.message);
    }
  } catch (err: any) {
    console.warn(`[Supabase Sync] Exception deleting from ${table}:`, err?.message);
  }
}

/**
 * Load initial data from Supabase if tables exist
 */
export async function loadAllFromSupabase(): Promise<Record<string, any[]> | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const tables = [
      'schools',
      'users',
      'students',
      'categories',
      'breaks',
      'products',
      'orders',
      'donations',
      'payments',
      'order_status_history',
      'donation_distributions',
      'audit_logs',
      'notifications',
      'teacher_profiles',
      'canteen_profiles',
      'manager_profiles',
      'student_needs',
      'student_need_codes',
      'support_allocations',
      'support_deliveries',
      'support_status_history',
      'inventory_movements',
      'push_subscriptions',
    ];

    const results: Record<string, any[]> = {};
    for (const tbl of tables) {
      const { data, error } = await client.from(tbl).select('*');
      if (error) {
        if (error.code === 'PGRST205') {
          // Table doesn't exist yet
          return null;
        }
        console.warn(`[Supabase Load] Error loading ${tbl}:`, error.message);
        continue;
      }
      results[tbl] = (data || []).map(toCamelCase);
    }

    return results;
  } catch (err: any) {
    console.warn('[Supabase Load] Failed to load data from Supabase:', err?.message);
    return null;
  }
}

export interface CreateAuthUserOptions {
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  titleOrBranch?: string;
  canteenUnit?: string;
  createdByManagerId?: string;
}

/**
 * Creates or synchronizes an authenticated user across Supabase Auth and public.users
 */
export async function createOrSyncAuthUser(
  options: CreateAuthUserOptions
): Promise<{ authUserId: string; success: boolean; error?: string }> {
  const cleanEmail = options.email.trim().toLowerCase();
  const cleanPass = options.password || '123456';
  const env = getSupabaseEnv();
  const adminClient = getSupabaseAdminClient();
  const client = getSupabaseClient();

  let authUserId = '';

  // 1. Try Supabase Admin Auth if Service Role / Secret Key is configured
  if (adminClient) {
    try {
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPass,
        email_confirm: true,
        user_metadata: {
          role: options.role,
          full_name: options.fullName,
          school_id: options.schoolId,
        },
      });

      if (createData?.user?.id) {
        authUserId = createData.user.id;
      } else if (createError) {
        // User might already exist in auth.users
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existing = listData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          authUserId = existing.id;
          await adminClient.auth.admin.updateUserById(authUserId, {
            password: cleanPass,
            email_confirm: true,
            user_metadata: {
              role: options.role,
              full_name: options.fullName,
              school_id: options.schoolId,
            },
          });
        }
      }
    } catch (e: any) {
      console.warn('[Supabase Admin Auth] Notice creating auth user:', e?.message);
    }
  }

  // 2. If no admin client or couldn't get authUserId, try signUp with regular client
  if (!authUserId && client && env.isConfigured) {
    try {
      const { data: signUpData } = await client.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            role: options.role,
            full_name: options.fullName,
            school_id: options.schoolId,
          },
        },
      });
      if (signUpData?.user?.id) {
        authUserId = signUpData.user.id;
      }
    } catch (e: any) {
      console.warn('[Supabase Client Auth] Notice signing up auth user:', e?.message);
    }
  }

  // 3. Fallback standard UUID if still empty (ensures ID is always a valid PostgreSQL UUID)
  if (!authUserId) {
    authUserId = crypto.randomUUID();
  }

  // 4. Upsert into public.users in Supabase
  const passHash = crypto.createHash('sha256').update(cleanPass + '_kantincep_salt_2026').digest('hex');
  const now = new Date().toISOString();

  if (client) {
    try {
      const userRecord = {
        id: authUserId,
        full_name: options.fullName.trim(),
        email: cleanEmail,
        role: options.role,
        school_id: options.schoolId,
        account_status: 'active',
        password_hash: passHash,
        must_change_password: true,
        title_or_branch: options.titleOrBranch || null,
        canteen_unit: options.canteenUnit || null,
        created_by_manager_id: options.createdByManagerId || null,
        created_at: now,
        updated_at: now,
      };

      await client.from('users').upsert(userRecord, { onConflict: 'id' });

      // Role specific table synchronizations
      if (options.role === 'manager') {
        await client.from('schools').update({ manager_user_id: authUserId }).eq('id', options.schoolId);
      } else if (options.role === 'teacher') {
        await client.from('teacher_profiles').upsert(
          {
            auth_user_id: authUserId,
            school_id: options.schoolId,
            full_name: options.fullName.trim(),
            email: cleanEmail,
            branch: options.titleOrBranch || 'Danışman Öğretmen',
            account_status: 'active',
            must_change_password: true,
            created_by_manager_id: options.createdByManagerId || null,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'auth_user_id' }
        );
      } else if (options.role === 'canteen') {
        await client.from('canteen_profiles').upsert(
          {
            auth_user_id: authUserId,
            school_id: options.schoolId,
            full_name: options.fullName.trim(),
            email: cleanEmail,
            canteen_unit: options.canteenUnit || 'Merkez Okul Kantini',
            account_status: 'active',
            must_change_password: true,
            created_by_manager_id: options.createdByManagerId || null,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'auth_user_id' }
        );
      }
    } catch (err: any) {
      console.warn('[Supabase Sync User] Error during sync:', err?.message);
    }
  }

  return { authUserId, success: true };
}
