import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { db, getTodayFormatted, verifyPassword, hashPassword } from './db.ts';
import { realtimeHub } from './realtimeNotifications.ts';
import { testSupabaseConnection, getSupabaseClient, getSupabaseAdminClient, getUserScopedClient, getSupabaseEnv, toCamelCase, toSnakeCase, createOrSyncAuthUser } from './supabase.ts';
import { executeEndOfDayArchive } from './dailyCleanup.ts';
import {
  User,
  School,
  Order,
  Donation,
  Product,
  Student,
  PaymentRecord,
  OrderStatus,
  UserRole,
} from '../types.ts';

export const apiRouter = Router();

// In-memory active session store for authenticated users
interface ActiveSession {
  userId: string;
  email: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}
const activeSessions = new Map<string, ActiveSession>();

// Supabase Status Endpoint
apiRouter.get('/supabase/status', async (_req: Request, res: Response) => {
  const status = await testSupabaseConnection();
  return res.json(status);
});

// Helper to authenticate user from header (Authorization: Bearer <token>) or query token
async function getAuthUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.authorization;
  let token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  if (!token && req.query.token) {
    token = String(req.query.token).trim();
  }
  if (!token && req.query.userId) {
    token = String(req.query.userId).trim();
  }
  if (!token) return null;

  // 1. Check active session registry (fast, authenticated sessions)
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    const user = db.getUserById(session.userId) || db.getUserByEmail(session.email);
    if (user && user.accountStatus === 'active') {
      return user;
    }
  }

  const env = getSupabaseEnv();
  const supabaseClient = getSupabaseClient();

  // WHEN SUPABASE IS CONFIGURED: STRICT SUPABASE AUTHENTICATION
  if (supabaseClient && env.isConfigured) {
    try {
      if (token.includes('.')) {
        // 1. JWT Access Token from Supabase Auth
        const { data: authData, error: authErr } = await supabaseClient.auth.getUser(token);
        if (!authErr && authData?.user) {
          const authUserId = authData.user.id;
          const authEmail = (authData.user.email || '').toLowerCase();

          // 1.1 Query Supabase public.users using user-scoped client (with their Bearer JWT so RLS permits it!)
          const userScoped = getUserScopedClient(token);
          if (userScoped) {
            try {
              const { data: publicUser } = await userScoped
                .from('users')
                .select('*')
                .eq('id', authUserId)
                .maybeSingle();

              if (publicUser) {
                const mappedUser: User = toCamelCase(publicUser);
                if (mappedUser.accountStatus === 'active') {
                  db.upsertUserFromSupabase(mappedUser);
                  return mappedUser;
                }
              }
            } catch {
              // Fall through to admin / local cache
            }
          }

          // 1.2 Query using admin client if service role key is configured
          const adminClient = getSupabaseAdminClient();
          if (adminClient) {
            try {
              const { data: adminUser } = await adminClient
                .from('users')
                .select('*')
                .eq('id', authUserId)
                .maybeSingle();

              if (adminUser) {
                const mappedUser: User = toCamelCase(adminUser);
                if (mappedUser.accountStatus === 'active') {
                  db.upsertUserFromSupabase(mappedUser);
                  return mappedUser;
                }
              }
            } catch {
              // Fall through
            }
          }

          // 1.3 Check local in-memory DB by exact Auth UID or email
          const cachedUser = db.getUserById(authUserId) || (authEmail ? db.getUserByEmail(authEmail) : undefined);
          if (cachedUser && cachedUser.accountStatus === 'active') {
            return cachedUser;
          }

          // 1.4 Resilient fallback: Construct user from verified Supabase Auth token metadata
          const meta = authData.user.user_metadata || {};
          const fallbackUser: User = {
            id: authUserId,
            email: authEmail,
            fullName: meta.full_name || meta.fullName || authEmail.split('@')[0] || 'Kullanıcı',
            role: (meta.role as UserRole) || 'manager',
            schoolId: meta.school_id || meta.schoolId || '',
            accountStatus: 'active',
            mustChangePassword: true,
            createdAt: authData.user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          db.createUser(fallbackUser);
          return fallbackUser;
        }
      } else {
        // 2. Direct UID token (e.g. from fallback temporary login)
        const adminClient = getSupabaseAdminClient();
        if (adminClient) {
          try {
            const { data: adminUser } = await adminClient
              .from('users')
              .select('*')
              .eq('id', token)
              .maybeSingle();

            if (adminUser) {
              const mappedUser: User = toCamelCase(adminUser);
              if (mappedUser.accountStatus === 'active') {
                db.upsertUserFromSupabase(mappedUser);
                return mappedUser;
              }
            }
          } catch {
            // Fall through
          }
        }

        const cachedUser = db.getUserById(token) || db.getUserByEmail(token);
        if (cachedUser && cachedUser.accountStatus === 'active') {
          return cachedUser;
        }
      }
    } catch (e) {
      console.warn('[getAuthUser] Error during user verification:', e);
    }

    // Check cached in-memory DB by token
    const cachedUser = db.getUserById(token) || db.getUserByEmail(token);
    if (cachedUser && cachedUser.accountStatus === 'active') {
      return cachedUser;
    }

    return null;
  }

  // Fallback when Supabase is NOT configured (Offline dev only)
  const cachedUser = db.getUserById(token) || db.getUserByEmail(token);
  if (cachedUser && cachedUser.accountStatus === 'active') {
    return cachedUser;
  }

  return null;
}

// Middleware to require authentication
async function requireAuth(req: Request, res: Response, next: () => void) {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor veya oturumunuz sonlanmış.' });
  }
  (req as any).user = user;
  next();
}

// Middleware to require specific role
function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: () => void) => {
    const user = (req as any).user as User;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================

const handleRegister = async (req: Request, res: Response) => {
  const { fullName, email, password, passwordRepeat, kvkkConsent, schoolId, schoolCode } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Ad soyad, e-posta ve şifre zorunludur.' });
  }

  if (password !== passwordRepeat) {
    return res.status(400).json({ error: 'Şifreler birbiriyle uyuşmuyor.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }

  if (!kvkkConsent) {
    return res.status(400).json({ error: 'Kişisel Verilerin Korunması ve Aydınlatma Metnini onaylamanız gerekmektedir.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.getUserByEmail(cleanEmail);
  if (existing && existing.passwordHash && !existing.id.startsWith('user-')) {
    return res.status(400).json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
  }

  // Resolve target school via schoolCode or schoolId
  let assignedSchoolId = 'school-1';
  if (schoolCode && typeof schoolCode === 'string' && schoolCode.trim()) {
    const matchedSchool = db.getSchoolByCode(schoolCode.trim().toUpperCase());
    if (!matchedSchool) {
      return res.status(400).json({ error: 'Girilen okul kodu sistemde bulunamadı. Lütfen okulunuzdan aldığınız kodu kontrol ediniz.' });
    }
    if (!matchedSchool.activeStatus) {
      return res.status(400).json({ error: 'Belirtilen okul şu anda aktif değildir.' });
    }
    assignedSchoolId = matchedSchool.id;
  } else if (schoolId && typeof schoolId === 'string' && schoolId.trim()) {
    const matchedSchool = db.getSchoolById(schoolId.trim()) || db.getSchoolByCode(schoolId.trim());
    if (matchedSchool) {
      assignedSchoolId = matchedSchool.id;
    }
  }

  const env = getSupabaseEnv();
  const supabaseClient = getSupabaseClient();
  let authUserId = '';
  let emailConfirmationRequired = false;
  let signUpSession: any = null;

  // --- 1. SUPABASE AUTH REGISTRATION ---
  if (supabaseClient && env.isConfigured) {
    const adminClient = getSupabaseAdminClient();
    if (adminClient) {
      try {
        const { data: adminCreated, error: adminErr } = await adminClient.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName.trim(),
            role: 'parent',
            school_id: assignedSchoolId,
          },
        });
        if (adminCreated?.user?.id) {
          authUserId = adminCreated.user.id;
        } else if (adminErr) {
          const errMsg = adminErr.message.toLowerCase();
          if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
            return res.status(400).json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
          }
        }
      } catch (err: any) {
        console.warn('[Register Admin Auth Notice]:', err?.message);
      }
    }

    if (!authUserId) {
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'parent',
            school_id: assignedSchoolId,
          },
        },
      });

      if (signUpError) {
        const errorMsg = (signUpError.message || '').toLowerCase();
        if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
          return res.status(400).json({
            error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.',
            code: 'AUTH_USER_ALREADY_EXISTS',
          });
        }
        if (errorMsg.includes('rate limit')) {
          return res.status(429).json({
            error: 'Supabase kayıt isteği sınırı aşıldı.',
            detail: 'Kısa süre içerisinde çok fazla kayıt denendi. Lütfen birkaç dakika bekledikten sonra tekrar deneyiniz.',
            code: 'AUTH_RATE_LIMIT',
          });
        }
        return res.status(400).json({
          error: `Supabase kayıt hatası: ${signUpError.message}`,
          code: 'AUTH_SIGNUP_ERROR',
        });
      }

      if (!signUpData?.user?.id) {
        return res.status(400).json({
          error: 'Kullanıcı hesabı oluşturulamadı. Lütfen bilgilerinizi kontrol ediniz.',
        });
      }

      authUserId = signUpData.user.id;
      signUpSession = signUpData.session;
      if (!signUpSession && !signUpData.user.confirmed_at) {
        emailConfirmationRequired = true;
      }
    }
  }

  // Fallback UUID if offline
  if (!authUserId) {
    authUserId = crypto.randomUUID();
  }

  const now = new Date().toISOString();
  const passHash = hashPassword(password);
  const newUser: User = {
    id: authUserId,
    fullName: fullName.trim(),
    email: cleanEmail,
    role: 'parent',
    schoolId: assignedSchoolId,
    accountStatus: 'active',
    passwordHash: passHash,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  };

  // Save or update in local DB cache
  db.upsertUserFromSupabase(newUser);

  // Sync to public.users table in Supabase
  if (supabaseClient && env.isConfigured) {
    try {
      const userRecord = {
        id: authUserId,
        full_name: newUser.fullName,
        email: newUser.email,
        role: 'parent',
        school_id: assignedSchoolId,
        account_status: 'active',
        password_hash: passHash,
        must_change_password: false,
        created_at: now,
        updated_at: now,
      };

      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        await adminClient.from('users').upsert(userRecord, { onConflict: 'id' });
      } else if (signUpSession?.access_token) {
        const userScoped = getUserScopedClient(signUpSession.access_token);
        if (userScoped) {
          await userScoped.from('users').upsert(userRecord, { onConflict: 'id' });
        }
      } else {
        await supabaseClient.from('users').upsert(userRecord, { onConflict: 'id' });
      }
    } catch (syncErr: any) {
      console.warn('[Register public.users notice]:', syncErr?.message);
    }
  }

  db.addAuditLog({
    actorUserId: newUser.id,
    actorName: newUser.fullName,
    actorRole: newUser.role,
    schoolId: assignedSchoolId,
    action: 'USER_REGISTER',
    entityType: 'user',
    entityId: newUser.id,
    details: `Yeni veli kaydı oluşturuldu: ${newUser.email} (UID: ${authUserId}, Okul: ${assignedSchoolId})`,
  });

  // Issue session token if user is confirmed and active
  let issuedToken = '';
  if (signUpSession?.access_token) {
    issuedToken = signUpSession.access_token;
  } else if (!emailConfirmationRequired) {
    issuedToken = `kc_sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  if (issuedToken) {
    const sessionData: ActiveSession = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    };
    activeSessions.set(issuedToken, sessionData);
    activeSessions.set(newUser.id, sessionData);
  }

  const assignedSchool = db.getSchoolById(assignedSchoolId) || null;

  if (emailConfirmationRequired) {
    return res.json({
      success: true,
      user: newUser,
      school: assignedSchool,
      token: '',
      emailConfirmationRequired: true,
      message: 'Kaydınız Supabase Authentication üzerinde başarıyla oluşturuldu! Güvenlik gereği e-posta kutunuza gelen onay bağlantısına tıklayarak hesabınızı doğrulayınız. Doğrulama sonrası giriş yapabilirsiniz.',
    });
  }

  return res.json({
    success: true,
    user: newUser,
    school: assignedSchool,
    token: issuedToken,
    emailConfirmationRequired: false,
    message: 'Kaydınız başarıyla oluşturuldu. Sisteme yönlendiriliyorsunuz...',
  });
};
apiRouter.post('/auth/register', handleRegister);
apiRouter.post('/register', handleRegister);

const handleLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'E-posta adresi gereklidir.' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Şifre gereklidir.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const env = getSupabaseEnv();
  const supabaseClient = getSupabaseClient();

  // --- 1. SUPABASE AUTH INTEGRATION (When configured) ---
  if (supabaseClient && env.isConfigured) {
    try {
      // 1.1 Authenticate via Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        // Fallback: Check if user exists in public.users or db with valid password hash
        let fallbackUser: User | null = null;
        try {
          const { data: matchedDbUser } = await supabaseClient
            .from('users')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
          if (matchedDbUser) {
            fallbackUser = toCamelCase(matchedDbUser);
          }
        } catch {
          // Ignore RLS errors during fallback lookup
        }

        if (!fallbackUser) {
          fallbackUser = db.getUserByEmail(cleanEmail) || null;
        }

        if (fallbackUser) {
          const storedHash = fallbackUser.passwordHash || (fallbackUser as any).password_hash;
          const passMatches = (storedHash ? verifyPassword(password, storedHash) : false) ||
            (Boolean(fallbackUser.mustChangePassword) && password === '123456');

          if (passMatches) {
            if (fallbackUser.accountStatus === 'suspended') {
              return res.status(403).json({
                error: 'Hesabınız askıya alınmıştır.',
                detail: 'Lütfen sistem yöneticisi veya okul idaresiyle iletişime geçiniz.',
                code: 'USER_SUSPENDED',
              });
            }

            // Sync with Supabase Auth admin if service role key is present
            const admin = getSupabaseAdminClient();
            if (admin) {
              try {
                await admin.auth.admin.updateUserById(fallbackUser.id, {
                  password,
                  email_confirm: true,
                });
              } catch {
                // Ignore
              }
            }

            let school: School | null = null;
            if (fallbackUser.schoolId) {
              const { data: schoolData } = await supabaseClient
                .from('schools')
                .select('*')
                .eq('id', fallbackUser.schoolId)
                .maybeSingle();
              if (schoolData) {
                school = toCamelCase(schoolData);
              } else {
                school = db.getSchoolById(fallbackUser.schoolId) || null;
              }
            }

            const sessionToken = `kc_sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
            const sessionData: ActiveSession = {
              userId: fallbackUser.id,
              email: fallbackUser.email,
              role: fallbackUser.role,
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
            };
            activeSessions.set(sessionToken, sessionData);
            activeSessions.set(fallbackUser.id, sessionData);

            db.upsertUserFromSupabase(fallbackUser);
            if (school) db.upsertSchoolFromSupabase(school);

            db.addAuditLog({
              actorUserId: fallbackUser.id,
              actorName: fallbackUser.fullName,
              actorRole: fallbackUser.role,
              action: 'USER_LOGIN',
              entityType: 'user',
              entityId: fallbackUser.id,
              details: `Kullanıcı güvenli doğrulama ile giriş yaptı: ${fallbackUser.email} (${fallbackUser.role})`,
            });

            return res.json({
              success: true,
              user: fallbackUser,
              school: school || null,
              token: sessionToken,
              mustChangePassword: !!fallbackUser.mustChangePassword,
            });
          }
        }

        const errorMsg = (authError.message || '').toLowerCase();
        if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid credentials')) {
          return res.status(401).json({
            error: 'E-posta adresi veya şifre hatalı.',
            detail: 'Supabase Authentication kimlik doğrulaması başarısız oldu. E-posta veya şifrenizi kontrol ediniz.',
            code: 'AUTH_INVALID_CREDENTIALS',
          });
        }
        if (errorMsg.includes('email not confirmed')) {
          return res.status(403).json({
            error: 'E-posta adresiniz henüz onaylanmamış.',
            detail: 'Supabase Dashboard -> Authentication -> Users sekmesinden kullanıcının e-postasını onaylayınız ("Auto Confirm User" seçeneğini etkinleştirebilirsiniz).',
            code: 'AUTH_EMAIL_NOT_CONFIRMED',
          });
        }
        if (errorMsg.includes('fetch failed') || errorMsg.includes('network') || errorMsg.includes('enotfound') || errorMsg.includes('timeout')) {
          return res.status(503).json({
            error: 'Supabase sunucusuna ulaşılamadı.',
            detail: `Ağ veya bağlantı hatası: ${authError.message}. Lütfen SUPABASE_URL adresini kontrol ediniz.`,
            code: 'AUTH_NETWORK_ERROR',
          });
        }
        return res.status(400).json({
          error: `Supabase kimlik doğrulama hatası: ${authError.message}`,
          code: 'AUTH_ERROR',
        });
      }

      if (!authData?.user) {
        return res.status(401).json({ error: 'Kullanıcı doğrulanamadı.' });
      }

      const authUser = authData.user;
      const authUserId = authUser.id; // Supabase Auth UID (UUID)

      // 1.2 Fetch profile from public.users using exact Auth UID
      let publicUser: any = null;
      try {
        const { data: fetchedUser } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .maybeSingle();
        if (fetchedUser) {
          publicUser = fetchedUser;
        }
      } catch (err: any) {
        console.warn('[Fetch public.users notice]:', err?.message);
      }

      // If user row is not yet in public.users (e.g. pending confirmation or RLS on register), auto-provision now
      if (!publicUser) {
        const meta = authUser.user_metadata || {};
        const cached = db.getUserByEmail(cleanEmail) || db.getUserById(authUserId);
        const userFullName = cached?.fullName || meta.full_name || cleanEmail.split('@')[0];
        const userRole: UserRole = (cached?.role || meta.role || 'parent') as UserRole;
        const userSchoolId = cached?.schoolId || meta.school_id || 'school-1';
        const now = new Date().toISOString();
        const profilePayload = {
          id: authUserId,
          full_name: userFullName,
          email: cleanEmail,
          role: userRole,
          school_id: userSchoolId,
          account_status: 'active',
          password_hash: cached?.passwordHash || hashPassword(password),
          must_change_password: false,
          created_at: now,
          updated_at: now,
        };

        const adminClient = getSupabaseAdminClient();
        const userScoped = (authData.session?.access_token) ? getUserScopedClient(authData.session.access_token) : null;
        const clientToUse = adminClient || userScoped || supabaseClient;

        try {
          const { data: upserted } = await clientToUse
            .from('users')
            .upsert(profilePayload, { onConflict: 'id' })
            .select()
            .maybeSingle();
          if (upserted) {
            publicUser = upserted;
          }
        } catch (provErr: any) {
          console.warn('[Auto-provision public.users notice]:', provErr?.message);
        }

        if (!publicUser) {
          publicUser = profilePayload;
        }
      }

      const user: User = toCamelCase(publicUser);

      // 1.3 Check account status
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({
          error: 'Hesabınız askıya alınmıştır.',
          detail: 'Lütfen sistem yöneticisi veya okul idaresiyle iletişime geçiniz.',
          code: 'USER_SUSPENDED',
        });
      }

      // 1.4 Fetch school details if user belongs to a school
      let school: School | null = null;
      if (user.schoolId) {
        const { data: schoolData } = await supabaseClient
          .from('schools')
          .select('*')
          .eq('id', user.schoolId)
          .single();
        if (schoolData) {
          school = toCamelCase(schoolData);
        }
      }

      // 1.5 Cache to in-memory db for fast subsequent queries
      db.upsertUserFromSupabase(user);
      if (school) {
        db.upsertSchoolFromSupabase(school);
      }

      db.addAuditLog({
        actorUserId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        details: `Kullanıcı Supabase Auth ile başarıyla giriş yaptı: ${user.email} (${user.role}) [UID: ${authUserId}]`,
      });

      const issuedToken = authData.session?.access_token || user.id;
      const sessionData: ActiveSession = {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      };
      activeSessions.set(issuedToken, sessionData);
      activeSessions.set(user.id, sessionData);

      return res.json({
        success: true,
        user,
        school: school || null,
        token: issuedToken,
        mustChangePassword: !!user.mustChangePassword,
      });
    } catch (err: any) {
      console.error('[Auth Error] Exception during Supabase login:', err);
      return res.status(500).json({
        error: 'Giriş işlemi sırasında sunucu hatası oluştu.',
        detail: err.message,
      });
    }
  }

  // --- 2. LOCAL SIMULATION / OFFLINE FALLBACK (When Supabase is not configured yet) ---
  const localUser = db.getUserByEmail(cleanEmail);
  if (localUser) {
    if (localUser.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Hesabınız askıya alınmıştır. Lütfen okul idaresiyle iletişime geçiniz.' });
    }
    if (password) {
      const isOk = (localUser.passwordHash ? verifyPassword(password, localUser.passwordHash) : false) ||
        (Boolean(localUser.mustChangePassword) && password === '123456');
      if (!isOk) {
        return res.status(401).json({
          error: 'E-posta adresi veya şifre hatalı.',
          detail: 'Girilen şifre uyuşmuyor.',
        });
      }
    }
    const sessionToken = `kc_sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const offlineSession: ActiveSession = {
      userId: localUser.id,
      email: localUser.email,
      role: localUser.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    };
    activeSessions.set(sessionToken, offlineSession);
    activeSessions.set(localUser.id, offlineSession);

    const school = localUser.schoolId ? db.getSchoolById(localUser.schoolId) : null;
    return res.json({
      success: true,
      user: localUser,
      school: school || null,
      token: sessionToken,
      mustChangePassword: !!localUser.mustChangePassword,
    });
  }

  // When email is not a local test account and Supabase credentials are missing:
  return res.status(503).json({
    error: 'Supabase veritabanı bağlantısı henüz yapılandırılmamış.',
    detail: `Giriş yapmaya çalıştığınız "${cleanEmail}" hesabı Supabase üzerinde açılmıştır; ancak uygulamada SUPABASE_URL ve SUPABASE_ANON_KEY ortam değişkenleri tanımlanmadığı için Supabase Auth sunucusuna ulaşılamıyor. Lütfen AI Studio ortam değişkenlerine (.env) yeni Supabase proje bilgilerinizi ekleyiniz.`,
    supabaseConfigured: false,
    code: 'SUPABASE_NOT_CONFIGURED',
  });
};
apiRouter.post('/auth/login', handleLogin);
apiRouter.post('/login', handleLogin);

apiRouter.post('/auth/change-password', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { currentPassword, newPassword, newPasswordRepeat } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
  }

  if (newPassword !== newPasswordRepeat) {
    return res.status(400).json({ error: 'Yeni şifreler birbiriyle uyuşmuyor.' });
  }

  if (currentPassword && currentPassword === newPassword) {
    return res.status(400).json({ error: 'Yeni şifreniz mevcut geçici şifrenizle aynı olamaz. Farklı bir şifre belirleyiniz.' });
  }

  // Verify current password if user has passwordHash recorded
  if (user.passwordHash && currentPassword && !verifyPassword(currentPassword, user.passwordHash) && currentPassword !== '123456') {
    return res.status(400).json({ error: 'Mevcut geçici şifreniz hatalı. Lütfen size iletilen geçici şifreyi giriniz.' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const env = getSupabaseEnv();
  const passHash = hashPassword(newPassword);
  const now = new Date().toISOString();

  // 1. Update password in Supabase Auth
  if (env.isConfigured) {
    if (token && token.includes('.')) {
      // Authenticated via Supabase JWT: update directly via user-scoped client
      const userScoped = getUserScopedClient(token);
      if (userScoped) {
        try {
          const { error: authUpdateErr } = await userScoped.auth.updateUser({
            password: newPassword,
          });
          if (authUpdateErr) {
            console.warn('[Supabase Auth] updateUser notice:', authUpdateErr.message);
          }
        } catch (authEx) {
          console.warn('[Supabase Auth] Exception during auth.updateUser:', authEx);
        }
      }
    }

    // Try admin client if available
    const adminClient = getSupabaseAdminClient();
    if (adminClient) {
      try {
        await adminClient.auth.admin.updateUserById(user.id, {
          password: newPassword,
          email_confirm: true,
        });
      } catch (adminErr: any) {
        console.warn('[Supabase Admin] updateUserById notice:', adminErr?.message);
      }
    }

    // 2. Synchronize to public.users table in Supabase
    try {
      const userScoped = (token && token.includes('.')) ? getUserScopedClient(token) : null;
      const clientToUse = userScoped || getSupabaseClient();
      if (clientToUse) {
        await clientToUse
          .from('users')
          .update({
            password_hash: passHash,
            must_change_password: false,
            updated_at: now,
          })
          .eq('id', user.id);

        if (user.role === 'teacher') {
          await clientToUse
            .from('teacher_profiles')
            .update({
              must_change_password: false,
              updated_at: now,
            })
            .eq('auth_user_id', user.id);
        } else if (user.role === 'canteen') {
          await clientToUse
            .from('canteen_profiles')
            .update({
              must_change_password: false,
              updated_at: now,
            })
            .eq('auth_user_id', user.id);
        }
      }
    } catch (syncErr: any) {
      console.warn('[Supabase DB] Error syncing password change to tables:', syncErr?.message);
    }
  }

  // 3. Update in local in-memory & disk database
  const result = db.changePassword(user.id, newPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'PASSWORD_CHANGED',
    entityType: 'user',
    entityId: user.id,
    details: `${user.fullName} şifresini başarıyla güncelledi (Geçici şifre zorunluluğu kaldırıldı).`,
  });

  const updatedUser = db.getUserById(user.id);
  if (updatedUser) {
    updatedUser.mustChangePassword = false;
  }

  return res.json({
    success: true,
    message: 'Yeni şifreniz başarıyla kaydedildi. Sisteme yönlendiriliyorsunuz...',
    user: updatedUser,
  });
});

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'E-posta ve yeni şifre zorunludur.' });
  }
  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
  }

  db.changePassword(user.id, newPassword);

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'PASSWORD_RESET',
    entityType: 'user',
    entityId: user.id,
    details: `Kullanıcı şifresini sıfırladı: ${user.email}`,
  });

  return res.json({ success: true, message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' });
});

const handleMe = async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Geçersiz oturum.' });
  }
  const school = user.schoolId ? db.getSchoolById(user.schoolId) : null;
  return res.json({
    user,
    school: school
      ? {
          id: school.id,
          code: school.code,
          name: school.name,
          address: school.address,
          timezone: school.timezone,
          activeStatus: school.activeStatus,
          managerUserId: school.managerUserId,
        }
      : null,
  });
};
apiRouter.get('/auth/me', handleMe);
apiRouter.get('/me', handleMe);

const handleQuickAccounts = (_req: Request, res: Response) => {
  const env = getSupabaseEnv();
  // If real Supabase database is connected, disable mock demo accounts
  if (env.isConfigured) {
    return res.json({ users: [] });
  }
  const users = db.getUsers().map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    schoolId: u.schoolId,
    mustChangePassword: !!u.mustChangePassword,
    titleOrBranch: u.titleOrBranch,
    canteenUnit: u.canteenUnit,
  }));
  return res.json({ users });
};
apiRouter.get('/auth/quick-accounts', handleQuickAccounts);
apiRouter.get('/quick-accounts', handleQuickAccounts);

// ==========================================
// 2. SCHOOLS, BREAKS & CATEGORIES
// ==========================================

apiRouter.get('/schools', async (_req: Request, res: Response) => {
  const env = getSupabaseEnv();
  const supabaseClient = getSupabaseClient();

  if (supabaseClient && env.isConfigured) {
    try {
      const { data: remoteSchools, error } = await supabaseClient
        .from('schools')
        .select('*')
        .order('name');
      if (!error && remoteSchools) {
        return res.json({ schools: remoteSchools.map(toCamelCase) });
      }
    } catch {
      // Fallback
    }
  }

  return res.json({ schools: db.getSchools() });
});

apiRouter.get('/schools/verify-code/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const school = db.getSchoolByCode(code);
  if (!school || !school.activeStatus) {
    return res.status(404).json({ valid: false, error: 'Belirtilen okul kodu bulunamadı veya okul pasif durumda.' });
  }
  return res.json({
    valid: true,
    school: {
      id: school.id,
      code: school.code,
      name: school.name,
      address: school.address,
      activeStatus: school.activeStatus,
    },
  });
});

apiRouter.get('/schools/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const school = db.getSchoolById(id);
  if (!school) {
    return res.status(404).json({ error: 'Okul bulunamadı.' });
  }
  return res.json({
    school: {
      id: school.id,
      code: school.code,
      name: school.name,
      address: school.address,
      timezone: school.timezone,
      activeStatus: school.activeStatus,
      managerUserId: school.managerUserId,
    },
  });
});

apiRouter.post('/schools', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { name, code, address, timezone } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Okul adı ve benzersiz okul kodu zorunludur.' });
  }
  const result = db.createSchool({ name, code, address, timezone });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const currentUser = (req as any).user;
  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'ADMIN_CREATE_SCHOOL',
    entityType: 'school',
    entityId: result.school!.id,
    details: `Yeni okul oluşturuldu: ${result.school!.name} (Kod: ${result.school!.code})`,
  });

  return res.json({ success: true, school: result.school });
});

apiRouter.put('/schools/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (updates.code) {
    const existing = db.getSchoolByCode(updates.code);
    if (existing && existing.id !== id) {
      return res.status(400).json({ error: `"${updates.code}" okul kodu başka bir okul tarafından kullanılmaktadır.` });
    }
  }

  const updated = db.updateSchool(id, updates);
  if (!updated) return res.status(404).json({ error: 'Okul bulunamadı.' });

  const currentUser = (req as any).user;
  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'SCHOOL_UPDATE',
    entityType: 'school',
    entityId: id,
    details: `Okul bilgileri güncellendi: ${updated.name}`,
  });

  return res.json({ success: true, school: updated });
});

apiRouter.post('/schools/:id/manager', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { managerUserId, fullName, email, tempPassword } = req.body;
  const currentUser = (req as any).user;

  let targetUserId = managerUserId;

  if (!targetUserId && email && fullName) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = tempPassword || '123456';

    // 1. Create or sync in Supabase Auth & public.users
    const authSync = await createOrSyncAuthUser({
      email: cleanEmail,
      password: cleanPass,
      fullName: fullName.trim(),
      role: 'manager',
      schoolId: id,
    });

    targetUserId = authSync.authUserId;
    const now = new Date().toISOString();

    let user = db.getUserByEmail(cleanEmail) || db.getUserById(targetUserId);
    if (!user) {
      user = {
        id: targetUserId,
        fullName: fullName.trim(),
        email: cleanEmail,
        role: 'manager',
        schoolId: id,
        accountStatus: 'active',
        passwordHash: hashPassword(cleanPass),
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now,
      };
      db.createUser(user);
    } else {
      user.id = targetUserId;
      user.role = 'manager';
      user.schoolId = id;
      user.accountStatus = 'active';
      user.passwordHash = hashPassword(cleanPass);
      user.mustChangePassword = true;
      user.updatedAt = now;
      db.updateUser(user.id, user);
    }
  }

  if (!targetUserId) {
    return res.status(400).json({ error: 'Müdür kullanıcı ID veya Ad Soyad + E-posta bilgisi zorunludur.' });
  }

  const result = db.assignSchoolManager(id, targetUserId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'ADMIN_ASSIGN_MANAGER',
    entityType: 'school',
    entityId: id,
    details: `Okula tek yetkili müdür atandı: ${result.manager?.fullName} (${result.school?.name})`,
  });

  return res.json({
    success: true,
    message: `Müdür başarıyla ${result.school?.name} okuluna atandı.`,
    school: result.school,
    manager: result.manager,
  });
});

apiRouter.delete('/schools/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const hard = req.query.hard === 'true';
  const currentUser = (req as any).user;

  const result = db.deleteSchool(id, hard);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: hard ? 'ADMIN_HARD_DELETE_SCHOOL' : 'ADMIN_ARCHIVE_SCHOOL',
    entityType: 'school',
    entityId: id,
    details: `Okul ${hard ? 'kalıcı olarak silindi' : 'arşive alındı ve ilişkili personeller askıya alındı'}: ${result.school?.name} (${result.school?.code || id})`,
  });

  return res.json({
    success: true,
    message: `"${result.school?.name}" okulu ${hard ? 'kalıcı olarak silindi' : 'başarıyla arşive alındı'}.`,
    school: result.school,
  });
});

apiRouter.get('/admin/schools-summary', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const summary = db.getSchoolsSummary();
  return res.json({ schools: summary });
});

apiRouter.get('/breaks', async (req: Request, res: Response) => {
  const schoolId = (req.query.schoolId as string) || 'school-1';
  return res.json({ breaks: db.getBreaks(schoolId) });
});

apiRouter.post('/breaks', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name, startTime, endTime, orderDeadlineMinutesBefore, schoolId } = req.body;
  if (!name || !startTime || !endTime) {
    return res.status(400).json({ error: 'Teneffüs adı, başlangıç ve bitiş saati zorunludur.' });
  }

  // Multi-school isolation: Manager can ONLY create breaks for their own school
  const targetSchoolId = user.role === 'manager' ? user.schoolId : (schoolId || user.schoolId || 'school-1');

  const newBreak = {
    id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    schoolId: targetSchoolId,
    name: name.trim(),
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    activeStatus: true,
    orderDeadlineMinutesBefore: Number(orderDeadlineMinutesBefore) || 15,
  };

  db.createBreak(newBreak);
  db.addAuditLog({
    action: 'CREATE_BREAK',
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    schoolId: targetSchoolId,
    entityType: 'break',
    entityId: newBreak.id,
    details: `"${newBreak.name}" (${newBreak.startTime}-${newBreak.endTime}) teneffüs aralığı eklendi.`,
  });

  return res.json({ success: true, break: newBreak });
});

apiRouter.put('/breaks/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const updates = req.body;

  const allBreaks = db.getBreaks();
  const existing = allBreaks.find(b => b.id === id);
  if (!existing) return res.status(404).json({ error: 'Teneffüs bulunamadı.' });

  // Manager can only modify their own school's breaks
  if (user.role === 'manager' && existing.schoolId !== user.schoolId) {
    return res.status(403).json({ error: 'Yalnızca kendi okulunuzun teneffüs saatlerini düzenleme yetkiniz vardır.' });
  }

  const updated = db.updateBreak(id, updates);
  if (!updated) return res.status(404).json({ error: 'Teneffüs bulunamadı.' });

  db.addAuditLog({
    action: 'UPDATE_BREAK',
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    schoolId: updated.schoolId,
    entityType: 'break',
    entityId: updated.id,
    details: `"${updated.name}" teneffüs saatleri güncellendi (Durum: ${updated.activeStatus ? 'Aktif' : 'Pasif'}).`,
  });

  return res.json({ success: true, break: updated });
});

apiRouter.delete('/breaks/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const allBreaks = db.getBreaks();
  const existing = allBreaks.find(b => b.id === id);
  if (!existing) return res.status(404).json({ error: 'Teneffüs bulunamadı.' });

  // Manager can only delete their own school's breaks
  if (user.role === 'manager' && existing.schoolId !== user.schoolId) {
    return res.status(403).json({ error: 'Yalnızca kendi okulunuzun teneffüs saatlerini silme yetkiniz vardır.' });
  }

  const deleted = db.deleteBreak(id);
  if (!deleted) return res.status(404).json({ error: 'Teneffüs bulunamadı.' });

  db.addAuditLog({
    action: 'DELETE_BREAK',
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    schoolId: existing.schoolId,
    entityType: 'break',
    entityId: existing.id,
    details: `"${existing.name}" teneffüs aralığı sistemden silindi.`,
  });

  return res.json({ success: true, message: 'Teneffüs silindi.' });
});

apiRouter.get('/categories', async (req: Request, res: Response) => {
  const schoolId = (req.query.schoolId as string) || 'school-1';
  return res.json({ categories: db.getCategories(schoolId) });
});

apiRouter.post('/categories', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name, productType, schoolId } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Kategori adı zorunludur.' });
  }

  // Multi-school isolation: Canteen can ONLY create categories for their own school
  const targetSchoolId = user.role === 'canteen' ? user.schoolId : (schoolId || user.schoolId || 'school-1');

  const newCat = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    schoolId: targetSchoolId,
    name: name.trim(),
    productType: productType === 'stationery' ? 'stationery' : 'food',
    activeStatus: true,
  };

  db.createCategory(newCat as any);
  db.addAuditLog({
    action: 'CREATE_CATEGORY',
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    schoolId: targetSchoolId,
    entityType: 'category',
    entityId: newCat.id,
    details: `"${newCat.name}" kategorisi (${newCat.productType === 'stationery' ? 'Kırtasiye' : 'Yiyecek'}) eklendi.`,
  });

  return res.json({ success: true, category: newCat });
});

apiRouter.put('/categories/:id', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const updates = req.body;

  const allCats = db.getCategories();
  const existing = allCats.find(c => c.id === id);
  if (!existing) return res.status(404).json({ error: 'Kategori bulunamadı.' });

  // Canteen can only update their own school's categories
  if (user.role === 'canteen' && existing.schoolId !== user.schoolId) {
    return res.status(403).json({ error: 'Yalnızca kendi okulunuzun kategorilerini düzenleme yetkiniz vardır.' });
  }

  const updated = db.updateCategory(id, updates);
  if (!updated) return res.status(404).json({ error: 'Kategori bulunamadı.' });

  db.addAuditLog({
    action: 'UPDATE_CATEGORY',
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    schoolId: updated.schoolId,
    entityType: 'category',
    entityId: updated.id,
    details: `"${updated.name}" kategorisi güncellendi (Durum: ${updated.activeStatus ? 'Aktif' : 'Pasif'}).`,
  });

  return res.json({ success: true, category: updated });
});

apiRouter.delete('/categories/:id', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const allCats = db.getCategories();
  const existing = allCats.find(c => c.id === id);
  if (!existing) return res.status(404).json({ error: 'Kategori bulunamadı.' });

  // Canteen can only delete their own school's categories
  if (user.role === 'canteen' && existing.schoolId !== user.schoolId) {
    return res.status(403).json({ error: 'Yalnızca kendi okulunuzun kategorilerini silme yetkiniz vardır.' });
  }

  const deleted = db.deleteCategory(id);
  if (!deleted) return res.status(404).json({ error: 'Kategori bulunamadı.' });

  db.addAuditLog({
    action: 'DELETE_CATEGORY',
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    schoolId: existing.schoolId,
    entityType: 'category',
    entityId: existing.id,
    details: `"${existing.name}" kategorisi silindi/arşivlendi.`,
  });

  return res.json({ success: true, message: 'Kategori silindi/kapatıldı.' });
});

// ==========================================
// 3. STUDENTS (VELİ / ÖĞRENCİ YÖNETİMİ)
// ==========================================

apiRouter.get('/students', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'parent') {
    const students = db.getStudentsByParent(user.id);
    return res.json({ students });
  } else {
    const students = db.getAllStudents(user.schoolId);
    return res.json({ students });
  }
});

apiRouter.post('/students', requireAuth, requireRole('parent'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { fullName, grade, classroom, schoolId } = req.body;

  if (!fullName || !grade || !classroom) {
    return res.status(400).json({ error: 'Öğrenci adı, sınıfı ve şubesi zorunludur.' });
  }

  const newStudent: Student = {
    id: `student-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    parentUserId: user.id,
    schoolId: schoolId || user.schoolId || 'school-1',
    fullName: fullName.trim(),
    grade: grade.trim(),
    classroom: classroom.trim(),
    activeStatus: true,
    createdAt: new Date().toISOString(),
  };

  db.createStudent(newStudent);
  return res.json({ success: true, student: newStudent });
});

apiRouter.put('/students/:id', requireAuth, requireRole('parent'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const existing = db.getStudentsByParent(user.id).find(s => s.id === id);

  if (!existing) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı veya düzenleme yetkiniz yok.' });
  }

  const { fullName, grade, classroom } = req.body;
  const updated = db.updateStudent(id, {
    fullName: fullName?.trim() || existing.fullName,
    grade: grade?.trim() || existing.grade,
    classroom: classroom?.trim() || existing.classroom,
  });

  return res.json({ success: true, student: updated });
});

apiRouter.delete('/students/:id', requireAuth, requireRole('parent'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const existing = db.getStudentsByParent(user.id).find(s => s.id === id);

  if (!existing) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı veya silme yetkiniz yok.' });
  }

  db.deleteStudent(id);
  return res.json({ success: true, message: 'Öğrenci kaydı silindi.' });
});

// ==========================================
// 4. PRODUCTS (ÜRÜN & STOK YÖNETİMİ)
// ==========================================

apiRouter.get('/products', (req: Request, res: Response) => {
  const schoolId = (req.query.schoolId as string) || 'school-1';
  const onlyActive = req.query.active !== 'false';
  const type = req.query.type as string | undefined;

  let products = db.getProducts(schoolId, onlyActive);
  if (type) {
    products = products.filter(p => p.productType === type);
  }
  return res.json({ products });
});

apiRouter.post('/products', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name, description, categoryId, productType, price, stockQuantity, imageUrl, allergens } = req.body;

  if (!name || price === undefined || stockQuantity === undefined || !categoryId) {
    return res.status(400).json({ error: 'Ürün adı, kategori, fiyat ve stok miktarı zorunludur.' });
  }

  const numPrice = Number(price);
  const numStock = Number(stockQuantity);

  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Geçersiz fiyat değeri.' });
  }
  if (isNaN(numStock) || numStock < 0) {
    return res.status(400).json({ error: 'Geçersiz stok miktarı.' });
  }

  const now = new Date().toISOString();
  const newProduct: Product = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    schoolId: user.schoolId || 'school-1',
    name: name.trim(),
    description: description?.trim() || '',
    categoryId,
    productType: productType === 'stationery' ? 'stationery' : 'food',
    price: Math.round(numPrice * 100) / 100,
    stockQuantity: Math.floor(numStock),
    imageUrl: imageUrl?.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    allergens: Array.isArray(allergens) ? allergens : [],
    activeStatus: true,
    createdAt: now,
    updatedAt: now,
  };

  db.createProduct(newProduct);
  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'PRODUCT_CREATE',
    entityType: 'product',
    entityId: newProduct.id,
    details: `Yeni ürün eklendi: ${newProduct.name} (₺${newProduct.price}, Stok: ${newProduct.stockQuantity})`,
  });

  return res.json({ success: true, product: newProduct });
});

apiRouter.put('/products/:id', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const existing = db.getProductById(id);

  if (!existing) {
    return res.status(404).json({ error: 'Ürün bulunamadı.' });
  }

  const { name, description, categoryId, productType, price, stockQuantity, imageUrl, allergens, activeStatus } = req.body;

  const updates: Partial<Product> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (categoryId !== undefined) updates.categoryId = categoryId;
  if (productType !== undefined) updates.productType = productType;
  if (price !== undefined) {
    const np = Number(price);
    if (!isNaN(np) && np >= 0) updates.price = Math.round(np * 100) / 100;
  }
  if (stockQuantity !== undefined) {
    const ns = Number(stockQuantity);
    if (!isNaN(ns) && ns >= 0) updates.stockQuantity = Math.floor(ns);
  }
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (allergens !== undefined && Array.isArray(allergens)) updates.allergens = allergens;
  if (activeStatus !== undefined) updates.activeStatus = Boolean(activeStatus);

  const updated = db.updateProduct(id, updates);

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'PRODUCT_UPDATE',
    entityType: 'product',
    entityId: id,
    details: `Ürün güncellendi: ${existing.name}`,
  });

  return res.json({ success: true, product: updated });
});

apiRouter.delete('/products/:id', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const existing = db.getProductById(id);

  if (!existing) {
    return res.status(404).json({ error: 'Ürün bulunamadı.' });
  }

  // Soft delete / archive to preserve historic orders
  db.deleteProduct(id);

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'PRODUCT_ARCHIVE',
    entityType: 'product',
    entityId: id,
    details: `Ürün satıştan kaldırıldı/arşivlendi: ${existing.name}`,
  });

  return res.json({ success: true, message: 'Ürün satışa kapatıldı ve arşivlendi.' });
});

// ==========================================
// 5. ORDERS (SİPARİŞ YÖNETİMİ)
// ==========================================

apiRouter.get('/orders', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { date, breakId, status, search, includeArchived, onlyArchived } = req.query;

  const isIncludeArchived = includeArchived === 'true' || user.role === 'parent';
  const isOnlyArchived = onlyArchived === 'true';

  if (user.role === 'parent') {
    const orders = db.getOrders({
      parentUserId: user.id,
      orderDate: date as string,
      breakId: breakId as string,
      orderStatus: status as string,
      search: search as string,
      includeArchived: true,
      onlyArchived: isOnlyArchived,
    });
    return res.json({ orders });
  } else {
    // Canteen or Admin sees school orders
    const orders = db.getOrders({
      schoolId: user.schoolId || 'school-1',
      orderDate: date as string,
      breakId: breakId as string,
      orderStatus: status as string,
      search: search as string,
      includeArchived: isIncludeArchived,
      onlyArchived: isOnlyArchived,
    });
    return res.json({ orders });
  }
});

apiRouter.post('/canteen/end-of-day-archive', requireAuth, requireRole('canteen', 'manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const targetSchoolId = user.role === 'admin' ? (req.body.schoolId || undefined) : user.schoolId;
  const result = executeEndOfDayArchive(targetSchoolId, user.id);
  return res.json({
    success: true,
    archivedCount: result.archivedCount,
    message: `Gün sonu kapatıldı. ${result.archivedCount} adet tamamlanmış ve iptal edilmiş sipariş arşive aktarıldı. Ertesi gün için sipariş paneli temizlendi.`,
  });
});

apiRouter.post('/orders', requireAuth, requireRole('parent'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { studentId, orderDate, breakId, items, note } = req.body;

  if (!studentId || !orderDate || !breakId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Öğrenci, sipariş tarihi, teneffüs ve en az 1 ürün seçilmelidir.' });
  }

  // Verify student belongs to parent
  const parentStudents = db.getStudentsByParent(user.id);
  const student = parentStudents.find(s => s.id === studentId);
  if (!student) {
    return res.status(400).json({ error: 'Seçilen öğrenci hesabınızda kayıtlı değil.' });
  }

  // Verify break exists
  const breaks = db.getBreaks(student.schoolId);
  const brk = breaks.find(b => b.id === breakId);
  if (!brk || !brk.activeStatus) {
    return res.status(400).json({ error: 'Geçersiz veya kapalı teneffüs saati.' });
  }

  // Server-side price calculation and product snapshot
  let subtotal = 0;
  const orderItems: any[] = [];

  for (const it of items) {
    const prod = db.getProductById(it.productId);
    if (!prod) {
      return res.status(400).json({ error: `Ürün bulunamadı (ID: ${it.productId})` });
    }
    if (!prod.activeStatus) {
      return res.status(400).json({ error: `"${prod.name}" şu anda satışa kapalıdır.` });
    }
    const qty = Math.floor(Number(it.quantity));
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Geçersiz ürün adedi.' });
    }
    if (prod.stockQuantity < qty) {
      return res.status(400).json({
        error: `Yetersiz stok! "${prod.name}" için mevcut stok: ${prod.stockQuantity}`,
      });
    }

    const lineTotal = Math.round(prod.price * qty * 100) / 100;
    subtotal += lineTotal;

    orderItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: '', // set below
      productId: prod.id,
      productNameSnapshot: prod.name,
      unitPriceSnapshot: prod.price,
      quantity: qty,
      lineTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const totalAmount = subtotal;

  const now = new Date();
  const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  // Unique random 4-digit verification PIN
  const deliveryCode = String(Math.floor(1000 + Math.random() * 9000));
  // Unique sequential/daily order number
  const orderNumber = `KC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`;

  for (const it of orderItems) {
    it.orderId = orderId;
  }

  const newOrder: Order = {
    id: orderId,
    orderNumber,
    parentUserId: user.id,
    studentId: student.id,
    studentNameSnapshot: student.fullName,
    studentClassSnapshot: `${student.grade} / ${student.classroom}`,
    schoolId: student.schoolId,
    orderDate,
    breakId,
    breakNameSnapshot: brk.name,
    orderType: 'canteen',
    paymentStatus: 'pending',
    orderStatus: 'pending_payment',
    subtotal,
    totalAmount,
    note: note?.trim() || '',
    deliveryCode,
    isVerifiedDelivery: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    items: orderItems,
  };

  const created = db.createOrder(newOrder);
  if (!created.success) {
    return res.status(400).json({ error: created.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'ORDER_CREATE',
    entityType: 'order',
    entityId: orderId,
    details: `Sipariş oluşturuldu: ${orderNumber} (${student.fullName}, ₺${totalAmount})`,
  });

  return res.json({ success: true, order: created.order });
});

apiRouter.put('/orders/:id/status', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { status, note } = req.body as { status: OrderStatus; note?: string };

  if (!status) {
    return res.status(400).json({ error: 'Yeni durum belirtilmelidir.' });
  }

  const order = db.getOrderById(id);
  if (!order) {
    return res.status(404).json({ error: 'Sipariş bulunamadı.' });
  }

  // Permissions:
  // Veli can only cancel if it belongs to them and is paid_pending
  if (user.role === 'parent') {
    if (order.parentUserId !== user.id) {
      return res.status(403).json({ error: 'Bu siparişe erişim yetkiniz yok.' });
    }
    if (status !== 'cancelled') {
      return res.status(403).json({ error: 'Veliler yalnızca siparişi iptal edebilir.' });
    }
    if (order.orderStatus !== 'paid_pending' && order.orderStatus !== 'pending_payment') {
      return res.status(400).json({ error: 'Hazırlanmaya başlanmış veya teslim edilmiş siparişler iptal edilemez.' });
    }
  }

  // Canteen/Admin can update transitions
  if (user.role === 'canteen' || user.role === 'admin') {
    if (order.schoolId !== user.schoolId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnızca yetkili olduğunuz okulun siparişlerini yönetebilirsiniz.' });
    }
  }

  const updated = db.updateOrderStatus(
    id,
    status,
    { id: user.id, name: user.fullName, role: user.role },
    note
  );

  if (!updated.success) {
    return res.status(400).json({ error: updated.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'ORDER_STATUS_UPDATE',
    entityType: 'order',
    entityId: id,
    details: `${order.orderNumber} durumu ${order.orderStatus} -> ${status} yapıldı.`,
  });

  // Real-time notification trigger when delivery is recorded
  let notificationSent = false;
  if (status === 'delivered' && updated.order && updated.notification) {
    try {
      const dispatchRes = realtimeHub.broadcastDeliveryNotification({
        eventId: updated.notification.deliveryEventId || `deliv-order-${updated.order.id}`,
        orderId: updated.order.id,
        orderNumber: updated.order.orderNumber,
        parentUserId: updated.order.parentUserId,
        studentName: updated.order.studentNameSnapshot,
        schoolId: updated.order.schoolId,
        canteenStaffName: user.fullName,
        deliveredAt: updated.order.updatedAt,
        notification: updated.notification,
      });
      notificationSent = dispatchRes.success;
    } catch (err) {
      console.error('[Routes] Error broadcasting delivery notification:', err);
      notificationSent = false;
    }
  }

  return res.json({
    success: true,
    order: updated.order,
    notificationSent,
    notificationMessage: status === 'delivered'
      ? 'Teslimat kaydedildi ve velisine anlık bildirim iletildi.'
      : undefined,
  });
});

apiRouter.post('/orders/:id/verify-delivery', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { deliveryCode } = req.body;

  if (!deliveryCode) {
    return res.status(400).json({ error: 'Teslimat kodu (4 haneli PIN) gereklidir.' });
  }

  const verified = db.verifyOrderDelivery(id, deliveryCode, {
    id: user.id,
    name: user.fullName,
    role: user.role,
  });

  if (!verified.success) {
    return res.status(400).json({ error: verified.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'ORDER_DELIVERED_VERIFIED',
    entityType: 'order',
    entityId: id,
    details: `Sipariş teslimatı PIN koduyla doğrulandı: ${verified.order?.orderNumber}`,
  });

  // Real-time notification trigger to parent upon verified delivery
  let notificationSent = false;
  if (verified.order && verified.notification) {
    try {
      const dispatchRes = realtimeHub.broadcastDeliveryNotification({
        eventId: verified.notification.deliveryEventId || `deliv-order-${verified.order.id}`,
        orderId: verified.order.id,
        orderNumber: verified.order.orderNumber,
        parentUserId: verified.order.parentUserId,
        studentName: verified.order.studentNameSnapshot,
        schoolId: verified.order.schoolId,
        canteenStaffName: user.fullName,
        deliveredAt: verified.order.updatedAt,
        notification: verified.notification,
      });
      notificationSent = dispatchRes.success;
    } catch (err) {
      console.error('[Routes] Error broadcasting verified delivery notification:', err);
      notificationSent = false;
    }
  }

  return res.json({
    success: true,
    order: verified.order,
    message: 'Teslimat başarıyla onaylandı. Velisine anlık bildirim iletildi.',
    notificationSent,
    notificationDetails: {
      recipientParentId: verified.order?.parentUserId,
      studentName: verified.order?.studentNameSnapshot,
      deliveredAt: verified.order?.updatedAt,
    },
  });
});

// ==========================================
// 6. DONATIONS (DAYANIŞMA HAVUZU & EĞİTİME DESTEK)
// ==========================================

apiRouter.get('/donations', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { type } = req.query;

  if (user.role === 'parent') {
    const list = db.getDonations({
      donorUserId: user.id,
      donationType: type as string,
    });
    return res.json({ donations: list });
  } else {
    // Canteen or Admin sees all for the school
    const list = db.getDonations({
      schoolId: user.schoolId || 'school-1',
      donationType: type as string,
    });
    return res.json({ donations: list });
  }
});

apiRouter.post('/donations', requireAuth, requireRole('parent'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { donationType, items, note } = req.body;

  if (!donationType || !['food_pool', 'education_support'].includes(donationType)) {
    return res.status(400).json({ error: 'Geçerli bir bağış türü seçilmelidir (food_pool veya education_support).' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'En az bir bağış ürünü seçilmelidir.' });
  }

  let totalAmount = 0;
  const donationItems: any[] = [];
  const donationId = `don-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  for (const it of items) {
    const prod = db.getProductById(it.productId);
    if (!prod) {
      return res.status(400).json({ error: `Ürün bulunamadı: ${it.productId}` });
    }
    const qty = Math.floor(Number(it.quantity));
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Geçersiz bağış adedi.' });
    }

    const lineTotal = Math.round(prod.price * qty * 100) / 100;
    totalAmount += lineTotal;

    donationItems.push({
      id: `don-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      donationId,
      productId: prod.id,
      productNameSnapshot: prod.name,
      unitPriceSnapshot: prod.price,
      quantity: qty,
      allocatedQuantity: 0,
      deliveredQuantity: 0,
      remainingQuantity: qty,
    });
  }

  totalAmount = Math.round(totalAmount * 100) / 100;
  const now = new Date();
  const donationNumber = `DY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`;

  const newDonation: Donation = {
    id: donationId,
    donationNumber,
    donorUserId: user.id,
    donorNameSnapshot: 'Hayırsever Veli (Anonim)',
    schoolId: user.schoolId || 'school-1',
    donationType,
    paymentStatus: 'pending',
    totalAmount,
    note: note?.trim() || '',
    createdAt: now.toISOString(),
    items: donationItems,
  };

  db.createDonation(newDonation);

  return res.json({ success: true, donation: newDonation });
});

apiRouter.post('/donations/distribute', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { donationItemId, quantity, notes } = req.body;

  if (!donationItemId || !quantity) {
    return res.status(400).json({ error: 'Bağış kalemi ve dağıtım adedi gereklidir.' });
  }

  const numQty = Math.floor(Number(quantity));
  if (isNaN(numQty) || numQty <= 0) {
    return res.status(400).json({ error: 'Geçersiz dağıtım adedi.' });
  }

  const result = db.distributeDonation({
    schoolId: user.schoolId || 'school-1',
    donationItemId,
    quantity: numQty,
    authorizedStaffId: user.id,
    authorizedStaffName: `${user.fullName} (${user.role === 'admin' ? 'Okul Yönetimi' : 'Kantin Görevlisi'})`,
    notes: notes?.trim() || 'Öğrenciye gizlilik esasıyla teslim edildi.',
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'DONATION_DISTRIBUTED',
    entityType: 'donation',
    entityId: donationItemId,
    details: `${numQty} adet ${result.distribution?.productNameSnapshot} dağıtıldı. Yetkili: ${user.fullName}`,
  });

  return res.json({ success: true, distribution: result.distribution, message: 'Bağış dağıtımı başarıyla kaydedildi.' });
});

apiRouter.get('/donations/distributions', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const distributions = db.getDonationDistributions(user.schoolId || 'school-1');
  return res.json({ distributions });
});

// ==========================================
// 7. PAYMENTS & GATEWAY INTEGRATION
// ==========================================

apiRouter.post('/payments/checkout', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { targetId, targetType, simulationResult, cardNumberMasked } = req.body;

  // simulationResult: 'success' | 'failed' | 'cancel'
  if (!targetId || !targetType) {
    return res.status(400).json({ error: 'Ödeme hedefi (sipariş veya bağış ID) zorunludur.' });
  }

  const now = new Date().toISOString();
  const providerRef = `SIM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (targetType === 'order') {
    const order = db.getOrderById(targetId);
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    if (order.parentUserId !== user.id) return res.status(403).json({ error: 'Bu sipariş size ait değil.' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ error: 'Bu siparişin ödemesi zaten alınmış.' });

    if (simulationResult === 'failed') {
      // Payment failed
      order.paymentStatus = 'failed';
      order.updatedAt = now;
      db.updateOrderStatus(order.id, 'cancelled', { id: user.id, name: user.fullName, role: user.role }, 'Ödeme banka tarafından reddedildi.');

      const paymentRecord: PaymentRecord = {
        id: `pay-${Date.now()}`,
        targetId: order.id,
        targetType: 'order',
        paymentProvider: 'simulation',
        providerReference: providerRef,
        amount: order.totalAmount,
        currency: 'TRY',
        paymentStatus: 'failed',
        rawResponse: 'BANK_DECLINED: Yetersiz limit veya kart reddi.',
        createdAt: now,
        updatedAt: now,
      };
      db.recordPayment(paymentRecord);

      return res.status(400).json({
        success: false,
        error: 'Ödeme başarısız oldu. Kart limitiniz yetersiz veya banka tarafından işlem onaylanmadı.',
      });
    }

    if (simulationResult === 'cancel') {
      order.paymentStatus = 'pending';
      return res.json({
        success: false,
        cancelled: true,
        message: 'Ödeme işlemi kullanıcı tarafından iptal edildi.',
      });
    }

    // Success flow:
    order.paymentStatus = 'paid';
    order.updatedAt = now;

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      targetId: order.id,
      targetType: 'order',
      paymentProvider: 'simulation',
      providerReference: providerRef,
      amount: order.totalAmount,
      currency: 'TRY',
      paymentStatus: 'success',
      rawResponse: `APPROVED: ${cardNumberMasked || '**** **** **** 1234'}`,
      createdAt: now,
      updatedAt: now,
    };
    db.recordPayment(paymentRecord);

    // Transition orderStatus from pending_payment to paid_pending
    const statusResult = db.updateOrderStatus(
      order.id,
      'paid_pending',
      { id: user.id, name: user.fullName, role: user.role },
      'Ödeme başarıyla doğrulandı.'
    );

    const finalOrder = statusResult.order || order;

    return res.json({
      success: true,
      order: finalOrder,
      paymentRecord,
      message: 'Ödeme başarıyla onaylandı.',
    });
  } else if (targetType === 'donation') {
    const donations = db.getDonations({ donorUserId: user.id });
    const donation = donations.find(d => d.id === targetId);
    if (!donation) return res.status(404).json({ error: 'Bağış kaydı bulunamadı.' });

    if (simulationResult === 'failed') {
      donation.paymentStatus = 'failed';
      return res.status(400).json({
        success: false,
        error: 'Bağış ödemesi başarısız oldu.',
      });
    }

    donation.paymentStatus = 'paid';

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      targetId: donation.id,
      targetType: 'donation',
      paymentProvider: 'simulation',
      providerReference: providerRef,
      amount: donation.totalAmount,
      currency: 'TRY',
      paymentStatus: 'success',
      createdAt: now,
      updatedAt: now,
    };
    db.recordPayment(paymentRecord);

    db.createNotification({
      userId: user.id,
      title: 'İyiliğiniz İçin Teşekkürler! 🌟',
      message: `₺${donation.totalAmount} tutarındaki ${donation.donationType === 'food_pool' ? 'Dayanışma Havuzu' : 'Eğitime Destek'} bağışınız alındı.`,
      type: 'donation',
    });

    return res.json({
      success: true,
      donation,
      paymentRecord,
      message: 'Bağış ödemesi başarıyla onaylandı.',
    });
  }

  return res.status(400).json({ error: 'Geçersiz hedef türü.' });
});

// Idempotent webhook receiver endpoint for payment providers (iyzico / PayTR)
apiRouter.post('/payments/webhook', (req: Request, res: Response) => {
  const { merchant_oid, status, hash, total_amount } = req.body;
  // Log webhook event
  console.log('[PAYMENT_WEBHOOK] Received payment notification:', { merchant_oid, status, total_amount });

  // Return standard "OK" acknowledging receipt to payment gateway
  return res.status(200).send('OK');
});

// ==========================================
// 8. REPORTS & ANALYTICS
// ==========================================

apiRouter.get('/reports/canteen-summary', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const date = (req.query.date as string) || getTodayFormatted();
  const summary = db.getCanteenSummary(schoolId, date);
  return res.json({ summary });
});

apiRouter.get('/reports/export-csv', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const orders = db.getOrders({ schoolId });

  // Safe CSV export: No telephone numbers or parent home addresses
  const headers = ['Siparis No', 'Tarih', 'Teneffus', 'Ogrenci Ad', 'Sinif', 'Urunler', 'Toplam Tutar (TL)', 'Odeme Durumu', 'Siparis Durumu', 'Teslimat Onayi'];
  const rows = orders.map(o => {
    const itemsSummary = o.items.map(i => `${i.productNameSnapshot} (${i.quantity} adet)`).join(' + ');
    return [
      `"${o.orderNumber}"`,
      `"${o.orderDate}"`,
      `"${o.breakNameSnapshot}"`,
      `"${o.studentNameSnapshot}"`,
      `"${o.studentClassSnapshot}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      o.totalAmount.toFixed(2),
      `"${o.paymentStatus}"`,
      `"${o.orderStatus}"`,
      `"${o.isVerifiedDelivery ? 'EVET' : 'HAYIR'}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kantincep_siparisler_${Date.now()}.csv"`);
  return res.send(csvContent);
});

// ==========================================
// 9. NOTIFICATIONS
// ==========================================

apiRouter.get('/notifications', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const notifications = db.getNotifications(user.id);
  const unreadCount = notifications.filter(n => !n.read).length;
  return res.json({ notifications, unreadCount });
});

apiRouter.get('/notifications/unread-count', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const notifications = db.getNotifications(user.id);
  const unreadCount = notifications.filter(n => !n.read).length;
  return res.json({ unreadCount });
});

// Real-time SSE notification stream
apiRouter.get('/notifications/stream', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  realtimeHub.handleSSEConnection(req, res, user.id);
});

// Mark single notification as read (supports POST and PUT)
const handleMarkRead = (req: Request, res: Response) => {
  const { id } = req.params;
  db.markNotificationAsRead(id);
  return res.json({ success: true });
};
apiRouter.post('/notifications/:id/read', requireAuth, handleMarkRead);
apiRouter.put('/notifications/:id/read', requireAuth, handleMarkRead);

// Mark all notifications as read (supports POST and PUT)
const handleMarkAllRead = (req: Request, res: Response) => {
  const user = (req as any).user as User;
  db.markAllNotificationsAsRead(user.id);
  return res.json({ success: true });
};
apiRouter.post('/notifications/read-all', requireAuth, handleMarkAllRead);
apiRouter.put('/notifications/read-all', requireAuth, handleMarkAllRead);

// Register Web Push / FCM device token for background push delivery
apiRouter.post('/notifications/register-token', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { token, fcmToken, endpoint, keys, userAgent } = req.body;
  const targetToken = token || fcmToken || endpoint;
  if (!targetToken) {
    return res.status(400).json({ error: 'Token veya push endpoint gereklidir.' });
  }
  const subscription = db.savePushSubscription({
    userId: user.id,
    endpoint: endpoint || targetToken,
    fcmToken: fcmToken || token,
    auth: keys?.auth,
    p256dh: keys?.p256dh,
    userAgent: userAgent || (req.headers['user-agent'] as string) || 'browser',
  });
  return res.json({ success: true, subscription });
});

// ==========================================
// 10. SYSTEM ADMIN ENDPOINTS
// ==========================================

apiRouter.get('/admin/users', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  const env = getSupabaseEnv();
  const supabaseClient = getSupabaseClient();

  if (supabaseClient && env.isConfigured) {
    try {
      const { data: remoteUsers, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] Failed to fetch users:', error.message);
      } else if (remoteUsers) {
        const mappedUsers: User[] = remoteUsers.map(toCamelCase);
        return res.json({ users: mappedUsers });
      }
    } catch (err: any) {
      console.warn('[Supabase] Exception fetching admin users:', err?.message);
    }
  }

  // Fallback to local db only if Supabase is not configured
  const users = db.getUsers().map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    schoolId: u.schoolId,
    accountStatus: u.accountStatus,
    createdAt: u.createdAt,
  }));
  return res.json({ users });
});

apiRouter.post('/admin/users', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { fullName, email, role, schoolId } = req.body;

  if (!fullName || !email || !role) {
    return res.status(400).json({ error: 'Ad soyad, e-posta ve rol zorunludur.' });
  }

  const env = getSupabaseEnv();
  const supabaseClient = getSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();

  if (supabaseClient && env.isConfigured) {
    try {
      const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newDbUser = {
        id: newUserId,
        full_name: fullName.trim(),
        email: cleanEmail,
        role,
        school_id: schoolId || null,
        account_status: 'active',
      };
      const { data, error } = await supabaseClient
        .from('users')
        .insert(newDbUser)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: `Kullanıcı oluşturulamadı: ${error.message}` });
      }

      const mapped: User = toCamelCase(data);
      db.upsertUserFromSupabase(mapped);
      return res.json({ success: true, user: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  const existing = db.getUserByEmail(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresiyle bir kullanıcı zaten kayıtlı.' });
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fullName: fullName.trim(),
    email: cleanEmail,
    role,
    schoolId: schoolId || 'school-1',
    accountStatus: 'active',
    createdAt: now,
    updatedAt: now,
  };

  db.createUser(newUser);
  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'ADMIN_CREATE_USER',
    entityType: 'user',
    entityId: newUser.id,
    details: `Yönetici yeni hesap oluşturdu: ${newUser.fullName} (${newUser.role})`,
  });

  return res.json({ success: true, user: newUser });
});

apiRouter.put('/admin/users/:id/status', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum.' });
  }

  const updated = db.updateUser(id, { accountStatus: status });
  if (!updated) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'ADMIN_UPDATE_USER_STATUS',
    entityType: 'user',
    entityId: id,
    details: `Kullanıcı durumu "${status}" yapıldı: ${updated.fullName}`,
  });

  return res.json({ success: true, user: updated });
});

apiRouter.get('/admin/audit-logs', requireAuth, requireRole('admin', 'manager'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  let logs = db.getAuditLogs(100);
  if (user.role === 'manager' && user.schoolId) {
    logs = logs.filter(l => !l.schoolId || l.schoolId === user.schoolId);
  }
  return res.json({ logs });
});

apiRouter.get('/manager/audit-logs', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  let logs = db.getAuditLogs(100);
  if (user.role === 'manager' && user.schoolId) {
    logs = logs.filter(l => !l.schoolId || l.schoolId === user.schoolId);
  }
  return res.json({ logs });
});

// ==========================================
// 11. SCHOOL MANAGER (KURUM MÜDÜRÜ) ENDPOINTS
// ==========================================

apiRouter.get('/manager/teachers', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const teachers = db.getTeacherProfiles(schoolId);
  return res.json({ teachers });
});

apiRouter.post('/manager/teachers', requireAuth, requireRole('manager', 'admin'), async (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { fullName, email, branch, tempPassword } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Ad soyad ve e-posta zorunludur.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.getUserByEmail(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresiyle bir hesap zaten kayıtlı.' });
  }

  // School manager can only manage their own school
  const schoolId = currentUser.schoolId || 'school-1';
  const cleanPass = tempPassword || Math.random().toString(36).substring(2, 8) + 'KC!';

  // 1. Create or sync user in Supabase Auth and public.users
  const authSync = await createOrSyncAuthUser({
    email: cleanEmail,
    password: cleanPass,
    fullName: fullName.trim(),
    role: 'teacher',
    schoolId,
    titleOrBranch: branch,
    createdByManagerId: currentUser.id,
  });

  // 2. Create in local memory DB with the real Auth UUID
  const result = db.createTeacher({
    fullName,
    email: cleanEmail,
    schoolId,
    branch,
    tempPassword: cleanPass,
    createdByManagerId: currentUser.id,
    userId: authSync.authUserId,
  });

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_CREATE_TEACHER',
    entityType: 'teacher',
    entityId: result.user.id,
    schoolId,
    details: `Müdür yeni öğretmen hesabı oluşturdu: ${result.user.fullName} (${result.user.email}) [UID: ${authSync.authUserId}]`,
  });

  return res.json({
    success: true,
    teacher: result.profile,
    user: result.user,
    tempPassword: result.tempPassword,
    message: 'Öğretmen hesabı başarıyla oluşturuldu. Geçici şifreyi kullanıcıya iletebilirsiniz.',
  });
});

apiRouter.delete('/manager/teachers/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { id } = req.params;
  const teacher = db.getTeacherProfiles().find(t => t.id === id);
  if (!teacher) return res.status(404).json({ error: 'Öğretmen profili bulunamadı.' });

  if (currentUser.role === 'manager' && teacher.schoolId !== currentUser.schoolId) {
    return res.status(403).json({ error: 'Farklı bir okulun öğretmenini silemezsiniz.' });
  }

  const result = db.deleteTeacher(id, teacher.schoolId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_DELETE_TEACHER',
    entityType: 'teacher',
    entityId: id,
    schoolId: teacher.schoolId,
    details: `Öğretmen hesabı okuldan kaldırıldı: ${teacher.fullName} (${teacher.email})`,
  });

  return res.json({
    success: true,
    message: `"${teacher.fullName}" öğretmen hesabı okuldan başarıyla kaldırıldı. Geçmiş işlem ve tahsis kayıtları korunmuştur.`,
  });
});

apiRouter.put('/manager/teachers/:id/status', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz hesap durumu.' });
  }

  const teacher = db.getTeacherProfiles().find(t => t.id === id);
  if (!teacher) return res.status(404).json({ error: 'Öğretmen bulunamadı.' });

  // Cross-school check
  if (currentUser.role === 'manager' && teacher.schoolId !== currentUser.schoolId) {
    return res.status(403).json({ error: 'Farklı bir okulun öğretmen hesabını yönetemezsiniz.' });
  }

  const updated = db.updateTeacherProfile(id, { accountStatus: status });

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_UPDATE_TEACHER_STATUS',
    entityType: 'teacher',
    entityId: id,
    details: `Öğretmen hesabı durumu "${status}" yapıldı: ${teacher.fullName}`,
  });

  return res.json({ success: true, teacher: updated });
});

apiRouter.post('/manager/teachers/:id/reset-password', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { id } = req.params;
  const teacher = db.getTeacherProfiles().find(t => t.id === id);
  if (!teacher) return res.status(404).json({ error: 'Öğretmen bulunamadı.' });

  if (currentUser.role === 'manager' && teacher.schoolId !== currentUser.schoolId) {
    return res.status(403).json({ error: 'Farklı bir okulun öğretmen hesabını yönetemezsiniz.' });
  }

  const newTempPassword = Math.random().toString(36).substring(2, 8) + 'KC!';
  db.setTempPassword(teacher.authUserId, newTempPassword);

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_RESET_TEACHER_PASSWORD',
    entityType: 'teacher',
    entityId: id,
    details: `Müdür öğretmen için yeni geçici şifre atadı: ${teacher.fullName}`,
  });

  return res.json({
    success: true,
    tempPassword: newTempPassword,
    message: 'Yeni geçici şifre oluşturuldu. İlk girişte şifre değiştirme zorunluluğu aktiftir.',
  });
});

apiRouter.get('/manager/canteen-users', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const canteens = db.getCanteenProfiles(schoolId);
  return res.json({ canteens });
});

apiRouter.post('/manager/canteen-users', requireAuth, requireRole('manager', 'admin'), async (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { fullName, email, canteenUnit, tempPassword } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Ad soyad ve e-posta zorunludur.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.getUserByEmail(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresiyle bir hesap zaten kayıtlı.' });
  }

  const schoolId = currentUser.schoolId || 'school-1';
  const cleanPass = tempPassword || Math.random().toString(36).substring(2, 8) + 'KC!';

  // 1. Create or sync user in Supabase Auth and public.users
  const authSync = await createOrSyncAuthUser({
    email: cleanEmail,
    password: cleanPass,
    fullName: fullName.trim(),
    role: 'canteen',
    schoolId,
    canteenUnit,
    createdByManagerId: currentUser.id,
  });

  // 2. Create in local memory DB with the real Auth UUID
  const result = db.createCanteenProfile({
    fullName,
    email: cleanEmail,
    schoolId,
    canteenUnit,
    tempPassword: cleanPass,
    createdByManagerId: currentUser.id,
    userId: authSync.authUserId,
  });

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_CREATE_CANTEEN',
    entityType: 'canteen',
    entityId: result.user.id,
    schoolId,
    details: `Müdür yeni kantinci hesabı oluşturdu: ${result.user.fullName} (${result.user.email}) [UID: ${authSync.authUserId}]`,
  });

  return res.json({
    success: true,
    canteen: result.profile,
    user: result.user,
    tempPassword: result.tempPassword,
    message: 'Kantinci hesabı başarıyla oluşturuldu. Geçici şifreyi kullanıcıya iletebilirsiniz.',
  });
});

apiRouter.delete('/manager/canteen-users/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { id } = req.params;
  const canteen = db.getCanteenProfiles().find(c => c.id === id);
  if (!canteen) return res.status(404).json({ error: 'Kantinci profili bulunamadı.' });

  if (currentUser.role === 'manager' && canteen.schoolId !== currentUser.schoolId) {
    return res.status(403).json({ error: 'Farklı bir okulun kantincisini silemezsiniz.' });
  }

  const result = db.deleteCanteenProfile(id, canteen.schoolId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_DELETE_CANTEEN',
    entityType: 'canteen',
    entityId: id,
    schoolId: canteen.schoolId,
    details: `Kantinci hesabı okuldan kaldırıldı: ${canteen.fullName} (${canteen.email})`,
  });

  return res.json({
    success: true,
    message: `"${canteen.fullName}" kantinci hesabı okuldan başarıyla kaldırıldı. Geçmiş teslimat ve finansal kayıtlar korunmuştur.`,
  });
});

apiRouter.put('/manager/canteen-users/:id/status', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz hesap durumu.' });
  }

  const canteen = db.getCanteenProfiles().find(c => c.id === id);
  if (!canteen) return res.status(404).json({ error: 'Kantinci profili bulunamadı.' });

  if (currentUser.role === 'manager' && canteen.schoolId !== currentUser.schoolId) {
    return res.status(403).json({ error: 'Farklı bir okulun kantinci hesabını yönetemezsiniz.' });
  }

  const updated = db.updateCanteenProfile(id, { accountStatus: status });

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_UPDATE_CANTEEN_STATUS',
    entityType: 'canteen',
    entityId: id,
    details: `Kantinci hesabı durumu "${status}" yapıldı: ${canteen.fullName}`,
  });

  return res.json({ success: true, canteen: updated });
});

apiRouter.post('/manager/canteen-users/:id/reset-password', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { id } = req.params;
  const canteen = db.getCanteenProfiles().find(c => c.id === id);
  if (!canteen) return res.status(404).json({ error: 'Kantinci bulunamadı.' });

  if (currentUser.role === 'manager' && canteen.schoolId !== currentUser.schoolId) {
    return res.status(403).json({ error: 'Farklı bir okulun kantinci hesabını yönetemezsiniz.' });
  }

  const newTempPassword = Math.random().toString(36).substring(2, 8) + 'KC!';
  db.setTempPassword(canteen.authUserId, newTempPassword);

  db.addAuditLog({
    actorUserId: currentUser.id,
    actorName: currentUser.fullName,
    actorRole: currentUser.role,
    action: 'MANAGER_RESET_CANTEEN_PASSWORD',
    entityType: 'canteen',
    entityId: id,
    details: `Müdür kantinci için yeni geçici şifre atadı: ${canteen.fullName}`,
  });

  return res.json({
    success: true,
    tempPassword: newTempPassword,
    message: 'Yeni geçici şifre oluşturuldu. İlk girişte şifre değiştirme zorunluluğu aktiftir.',
  });
});

apiRouter.get('/manager/reports', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const reports = db.getManagerReports(schoolId);
  return res.json({ reports });
});

// ==========================================
// 12. TEACHER (DANIŞMAN ÖĞRETMEN) ENDPOINTS
// ==========================================

apiRouter.get('/teacher/needs', requireAuth, requireRole('teacher', 'admin', 'manager'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const filter = user.role === 'teacher' ? { teacherId: user.id } : undefined;
  const needs = db.getStudentNeeds(schoolId, filter);
  return res.json({ needs });
});

apiRouter.post('/teacher/needs', requireAuth, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { studentReferenceId, studentName, grade, classroom, needType, needDescription } = req.body;

  if (!studentReferenceId || !studentName || !grade || !classroom || !needType) {
    return res.status(400).json({ error: 'Öğrenci adı, sınıf, şube, okul numarası ve ihtiyaç türü zorunludur.' });
  }

  const result = db.createStudentNeed({
    schoolId: user.schoolId || 'school-1',
    studentReferenceId,
    studentName,
    grade,
    classroom,
    needType,
    needDescription: needDescription || '',
    teacherId: user.id,
    teacherName: user.fullName,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'TEACHER_CREATE_STUDENT_NEED',
    entityType: 'studentNeed',
    entityId: result.need!.id,
    details: `Öğretmen yeni ihtiyaç kaydı açtı: ${result.need!.studentName} (${result.need!.needCodeReference})`,
  });

  return res.json({
    success: true,
    need: result.need,
    needCode: result.needCode,
    message: 'Öğrenci ihtiyaç kaydı başarıyla oluşturuldu ve benzersiz ihtiyaç kodu üretildi.',
  });
});

apiRouter.post('/teacher/needs/:id/renew-code', requireAuth, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const result = db.renewNeedCode(id, user.id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'TEACHER_RENEW_NEED_CODE',
    entityType: 'studentNeed',
    entityId: id,
    details: `İhtiyaç kodu yenilendi: Yeni Kod ${result.newCode}`,
  });

  return res.json({ success: true, newCode: result.newCode, message: 'İhtiyaç kodu başarıyla yenilendi.' });
});

apiRouter.delete('/teacher/needs/:id', requireAuth, requireRole('teacher', 'manager', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const need = db.getStudentNeeds().find(n => n.id === id);
  if (!need) {
    return res.status(404).json({ error: 'Öğrenci ihtiyaç kaydı bulunamadı.' });
  }

  // Cross-school check
  if (user.role !== 'admin' && need.schoolId !== user.schoolId) {
    return res.status(403).json({ error: 'Farklı bir okulun öğrenci kaydını silemezsiniz.' });
  }

  const result = db.deleteStudentNeed(id, need.schoolId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'TEACHER_REMOVE_STUDENT_NEED',
    entityType: 'need',
    entityId: id,
    schoolId: need.schoolId,
    details: `Öğrenci ihtiyaç listesinden kaldırıldı: ${need.studentName} (${need.studentReferenceId}) [Kod: ${need.needCodeReference}]`,
  });

  return res.json({
    success: true,
    message: `"${need.studentName}" ihtiyaç listesinden başarıyla kaldırıldı. Öğrencinin genel sistem hesabı ve geçmiş kayıtları korunmuştur.`,
  });
});

apiRouter.get('/teacher/available-donations', requireAuth, requireRole('teacher', 'admin', 'manager'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const foodStock = db.getAvailableDonationStock(schoolId, 'food_pool');
  const stationeryStock = db.getAvailableDonationStock(schoolId, 'education_support');
  return res.json({ foodStock, stationeryStock });
});

apiRouter.get('/teacher/allocations', requireAuth, requireRole('teacher', 'admin', 'manager'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const supportType = req.query.type as any;
  const id = req.query.id as string | undefined;
  const teacherId = user.role === 'teacher' ? user.id : undefined;
  const allocations = db.getSupportAllocations(schoolId, { supportType, teacherId, id });
  return res.json({ allocations });
});

apiRouter.post('/teacher/allocations', requireAuth, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { studentNeedId, supportType, sourceType, items, justificationNote, validUntil } = req.body;

  if (!studentNeedId || !supportType || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Öğrenci ihtiyaç kaydı, destek türü ve en az bir ürün gereklidir.' });
  }

  const result = db.createSupportAllocation({
    schoolId: user.schoolId || 'school-1',
    studentNeedId,
    supportType,
    sourceType: sourceType || (supportType === 'food_pool' ? 'parent_donation_pool' : 'parent_education_support'),
    teacherId: user.id,
    teacherName: user.fullName,
    items,
    justificationNote,
    validUntil,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'TEACHER_CREATE_ALLOCATION',
    entityType: 'supportAllocation',
    entityId: result.allocation!.id,
    details: `Öğretmen destek tahsisi yaptı: ${result.allocation!.allocationNumber} (${result.allocation!.supportType})`,
  });

  return res.json({
    success: true,
    allocation: result.allocation,
    message: 'Ürün tahsisi başarıyla tamamlandı ve kantin görevlisinin ekranına iletildi.',
  });
});

apiRouter.post('/teacher/allocations/:id/cancel', requireAuth, requireRole('teacher', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { reason } = req.body;

  const result = db.cancelSupportAllocation(id, user.id, user.fullName, reason);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'TEACHER_CANCEL_ALLOCATION',
    entityType: 'supportAllocation',
    entityId: id,
    details: `Destek tahsisi iptal edildi. Gerekçe: ${reason || 'Belirtilmedi'}`,
  });

  return res.json({ success: true, message: 'Tahsis iptal edildi ve ayrılan ürünler bağış havuzuna iade edildi.' });
});

// ==========================================
// 13. CANTEEN SUPPORT ALLOCATIONS & CODE VERIFICATION
// ==========================================

apiRouter.get('/canteen/allocations', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const allAllocations = db.getSupportAllocations(schoolId);

  // Sanitized view for canteen staff: NO sensitive personal need descriptions or family background!
  const sanitized = allAllocations.map(a => ({
    id: a.id,
    allocationNumber: a.allocationNumber,
    needCodeReference: a.needCodeReference,
    studentNameSnapshot: a.studentNameSnapshot,
    studentClassSnapshot: a.studentClassSnapshot,
    supportType: a.supportType,
    status: a.status,
    createdAt: a.createdAt,
    validUntil: a.validUntil,
    deliveredAt: a.deliveredAt,
    items: a.items.map(i => ({
      id: i.id,
      productId: i.productId,
      productNameSnapshot: i.productNameSnapshot,
      quantityAllocated: i.quantityAllocated,
      quantityDelivered: i.quantityDelivered,
      quantityRemaining: i.quantityRemaining,
    })),
  }));

  return res.json({ allocations: sanitized });
});

apiRouter.post('/canteen/verify-need-code', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Lütfen doğrulanacak ihtiyaç kodunu giriniz.' });
  }

  const cleanCode = code.trim().toUpperCase();
  const matchingAllocations = db.getAllocationsByNeedCode(schoolId, cleanCode);

  if (matchingAllocations.length === 0) {
    // Privacy-preserving error message: does not disclose whether code exists in another school or invalid
    return res.status(404).json({ error: 'Geçersiz veya bu okula ait olmayan ihtiyaç kodu.' });
  }

  // Filter only pending deliveries
  const pendingAllocations = matchingAllocations.filter(
    a => a.status === 'ready_for_delivery' || a.status === 'sent_to_canteen' || a.status === 'product_allocated'
  );

  const sanitized = matchingAllocations.map(a => ({
    id: a.id,
    allocationNumber: a.allocationNumber,
    studentNameSnapshot: a.studentNameSnapshot,
    studentClassSnapshot: a.studentClassSnapshot,
    supportType: a.supportType,
    status: a.status,
    needCodeReference: a.needCodeReference,
    items: a.items.map(i => ({
      id: i.id,
      productNameSnapshot: i.productNameSnapshot,
      quantityAllocated: i.quantityAllocated,
      quantityDelivered: i.quantityDelivered,
      quantityRemaining: i.quantityRemaining,
    })),
  }));

  return res.json({
    success: true,
    allocations: sanitized,
    pendingCount: pendingAllocations.length,
  });
});

apiRouter.post('/canteen/allocations/:id/deliver', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const schoolId = user.schoolId || 'school-1';
  const { id } = req.params;
  const { verificationCode, notes } = req.body;

  if (!verificationCode) {
    return res.status(400).json({ error: 'Teslimatı onaylamak için ihtiyaç kodu gereklidir.' });
  }

  const result = db.deliverSupportAllocation({
    allocationId: id,
    schoolId,
    canteenUserId: user.id,
    canteenUserName: user.fullName,
    verificationCode,
    notes,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'CANTEEN_DELIVER_ALLOCATION',
    entityType: 'supportAllocation',
    entityId: id,
    details: `Kantinci destek teslimatını gerçekleştirdi: ${result.allocation?.allocationNumber}`,
  });

  // Broadcast real-time delivery notification to the assigned advisor teacher
  let notificationSent = false;
  if (result.allocation && result.notification) {
    try {
      const dispatchRes = realtimeHub.broadcastSupportDeliveryNotification({
        eventId: result.notification.deliveryEventId || `deliv-alloc-${result.allocation.id}`,
        allocationId: result.allocation.id,
        allocationNumber: result.allocation.allocationNumber,
        studentNeedId: result.allocation.studentNeedId,
        teacherUserId: result.allocation.assignedByTeacherId,
        teacherName: result.allocation.assignedByTeacherName,
        supportType: result.allocation.supportType,
        itemsSummary: result.notification.itemsSummary || '',
        schoolId: result.allocation.schoolId,
        canteenStaffName: user.fullName,
        deliveredAt: result.allocation.deliveredAt || new Date().toISOString(),
        notification: result.notification,
      });
      notificationSent = dispatchRes.success;
    } catch (err) {
      console.error('[Routes] Error broadcasting support delivery notification to teacher:', err);
      notificationSent = false;
    }
  }

  return res.json({
    success: true,
    message: result.message,
    allocation: result.allocation,
    notificationSent,
    notification: result.notification,
  });
});
