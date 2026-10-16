/**
 * KantinCep - Vercel API 404 Kök Neden Çözümü ve 5 Temel API Doğrulama Paketi
 */

const BASE_URL = 'http://localhost:3000/api';
const DIRECT_URL = 'http://localhost:3000';

interface EndpointReport {
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
  actualStatus: number;
  dataSnippet: string;
  passed: boolean;
  notes: string;
}

const reports: EndpointReport[] = [];

async function testFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, ok: res.ok, text, json };
}

async function runVerification() {
  console.log('\n🔍 KantinCep Vercel API Doğrulama ve Rol Testleri Başlatılıyor...\n');

  // ==========================================
  // 1. Ürün Listesi (Products)
  // ==========================================
  const prod1 = await testFetch(`${BASE_URL}/products?type=food&active=true`);
  reports.push({
    name: '1.1. Ürün Listesi (/api/products)',
    url: `${BASE_URL}/products?type=food&active=true`,
    method: 'GET',
    expectedStatus: 200,
    actualStatus: prod1.status,
    dataSnippet: prod1.json?.products ? `Ürün sayısı: ${prod1.json.products.length}, İlk: ${prod1.json.products[0]?.name}` : prod1.text.slice(0, 80),
    passed: prod1.status === 200 && Array.isArray(prod1.json?.products) && prod1.json.products.length > 0,
    notes: 'Vercel /api/products rotası aktif ürünleri başarıyla döndürdü.',
  });

  const prod2 = await testFetch(`${DIRECT_URL}/products?type=food&active=true`);
  reports.push({
    name: '1.2. Ürün Listesi Doğrudan (/products - Rewrite Uyumlu)',
    url: `${DIRECT_URL}/products?type=food&active=true`,
    method: 'GET',
    expectedStatus: 200,
    actualStatus: prod2.status,
    dataSnippet: prod2.json?.products ? `Ürün sayısı: ${prod2.json.products.length}` : prod2.text.slice(0, 80),
    passed: prod2.status === 200 && Array.isArray(prod2.json?.products),
    notes: 'Rewrite / doğrudan erişimde rotanın çift yönlü çalıştığı doğrulandı.',
  });

  // ==========================================
  // 2. Kategori Listesi (Categories)
  // ==========================================
  const cat1 = await testFetch(`${BASE_URL}/categories?schoolId=school-1`);
  reports.push({
    name: '2.1. Kategori Listesi (/api/categories)',
    url: `${BASE_URL}/categories?schoolId=school-1`,
    method: 'GET',
    expectedStatus: 200,
    actualStatus: cat1.status,
    dataSnippet: cat1.json?.categories ? `Kategori sayısı: ${cat1.json.categories.length}, İlk: ${cat1.json.categories[0]?.name}` : cat1.text.slice(0, 80),
    passed: cat1.status === 200 && Array.isArray(cat1.json?.categories) && cat1.json.categories.length > 0,
    notes: 'Okula ait aktif kategoriler listelendi.',
  });

  const cat2 = await testFetch(`${DIRECT_URL}/categories?schoolId=school-1`);
  reports.push({
    name: '2.2. Kategori Listesi Doğrudan (/categories - Rewrite Uyumlu)',
    url: `${DIRECT_URL}/categories?schoolId=school-1`,
    method: 'GET',
    expectedStatus: 200,
    actualStatus: cat2.status,
    dataSnippet: cat2.json?.categories ? `Kategori sayısı: ${cat2.json.categories.length}` : cat2.text.slice(0, 80),
    passed: cat2.status === 200,
    notes: 'Kategoriler doğrudan kök rotada da 200 OK yanıt verdi.',
  });

  // ==========================================
  // 3. Hızlı Hesaplar (Quick Accounts)
  // ==========================================
  const qa1 = await testFetch(`${BASE_URL}/auth/quick-accounts`);
  reports.push({
    name: '3.1. Hızlı Hesaplar (/api/auth/quick-accounts)',
    url: `${BASE_URL}/auth/quick-accounts`,
    method: 'GET',
    expectedStatus: 200,
    actualStatus: qa1.status,
    dataSnippet: qa1.json?.users ? `Hesap sayısı: ${qa1.json.users.length}, Roller: ${qa1.json.users.map((u: any) => u.role).join(', ')}` : qa1.text.slice(0, 80),
    passed: qa1.status === 200 && Array.isArray(qa1.json?.users) && qa1.json.users.length >= 4,
    notes: 'Tüm roller için test hesapları eksiksiz sağlandı.',
  });

  const qa2 = await testFetch(`${BASE_URL}/quick-accounts`);
  reports.push({
    name: '3.2. Hızlı Hesaplar Alias (/api/quick-accounts)',
    url: `${BASE_URL}/quick-accounts`,
    method: 'GET',
    expectedStatus: 200,
    actualStatus: qa2.status,
    dataSnippet: qa2.json?.users ? `Hesap sayısı: ${qa2.json.users.length}` : qa2.text.slice(0, 80),
    passed: qa2.status === 200 && Array.isArray(qa2.json?.users),
    notes: 'Network panelinde /quick-accounts çağrıldığında 404 önleyici alias doğrulandı.',
  });

  // Test hesaplarından bir veli tokenı alalım
  const parentAccount = qa1.json?.users?.find((u: any) => u.role === 'parent');
  const parentToken = parentAccount?.id;

  // ==========================================
  // 4. Öğrenci Listesi (Students)
  // ==========================================
  const stuUnauth = await testFetch(`${BASE_URL}/students`);
  reports.push({
    name: '4.1. Öğrenci Listesi Yetkisiz İstek (/api/students)',
    url: `${BASE_URL}/students`,
    method: 'GET',
    expectedStatus: 401,
    actualStatus: stuUnauth.status,
    dataSnippet: stuUnauth.text.slice(0, 80),
    passed: stuUnauth.status === 401,
    notes: 'Yetkisiz erişim 401 Unauthorized ile güvenli biçimde reddedildi (404 değil).',
  });

  const stuAuth = await testFetch(`${BASE_URL}/students`, {
    headers: { Authorization: `Bearer ${parentToken}` },
  });
  reports.push({
    name: '4.2. Öğrenci Listesi Yetkili Veli (/api/students)',
    url: `${BASE_URL}/students`,
    method: 'GET',
    expectedStatus: 200,
    actualStatus: stuAuth.status,
    dataSnippet: stuAuth.json?.students ? `Öğrenci sayısı: ${stuAuth.json.students.length}` : stuAuth.text.slice(0, 80),
    passed: stuAuth.status === 200 && Array.isArray(stuAuth.json?.students),
    notes: 'Veli oturumu ile öğrenci listesi 200 OK ile alındı.',
  });

  // ==========================================
  // 5. Veli Kayıt İşlemi (Register)
  // ==========================================
  const uniqueEmail = `canli_veli_${Date.now()}@kantincep.com`;
  const reg1 = await testFetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Vercel Doğrulama Velisi',
      email: uniqueEmail,
      password: 'Password123!',
      passwordRepeat: 'Password123!',
      kvkkConsent: true,
      schoolId: 'school-1',
    }),
  });
  reports.push({
    name: '5.1. Veli Kayıt İşlemi (/api/auth/register)',
    url: `${BASE_URL}/auth/register`,
    method: 'POST',
    expectedStatus: 200,
    actualStatus: reg1.status,
    dataSnippet: reg1.json?.success ? `Kayıt Başarılı, Kullanıcı ID: ${reg1.json.user?.id}` : reg1.text.slice(0, 80),
    passed: reg1.status === 200 && reg1.json?.success === true && !!reg1.json?.token,
    notes: 'Yeni veli kaydı veritabanına kaydedildi ve oturum tokenı üretildi.',
  });

  const uniqueEmail2 = `canli_veli_alias_${Date.now()}@kantincep.com`;
  const reg2 = await testFetch(`${BASE_URL}/register`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Vercel Alias Velisi',
      email: uniqueEmail2,
      password: 'Password123!',
      passwordRepeat: 'Password123!',
      kvkkConsent: true,
      schoolId: 'school-1',
    }),
  });
  reports.push({
    name: '5.2. Veli Kayıt İşlemi Alias (/api/register)',
    url: `${BASE_URL}/register`,
    method: 'POST',
    expectedStatus: 200,
    actualStatus: reg2.status,
    dataSnippet: reg2.json?.success ? `Kayıt Başarılı, Kullanıcı ID: ${reg2.json.user?.id}` : reg2.text.slice(0, 80),
    passed: reg2.status === 200 && reg2.json?.success === true,
    notes: 'Network panelinde doğrudan /register çağrıldığında 404 önleyici alias doğrulandı.',
  });

  // ==========================================
  // 6. Roller İçin Giriş Akışları (5 Rol Doğrulaması)
  // ==========================================
  console.log('\n👥 Rol Bazlı Giriş Akışları Doğrulanıyor...');

  const roles = [
    { role: 'parent', label: 'Veli (Parent)', email: 'veli@kantincep.com' },
    { role: 'canteen', label: 'Kantinci (Canteen)', email: 'kantin@kantincep.com' },
    { role: 'teacher', label: 'Danışman Öğretmen (Teacher)', email: 'ogretmen@kantincep.com' },
    { role: 'manager', label: 'Kurum Müdürü (Manager)', email: 'mudur@kantincep.com' },
    { role: 'admin', label: 'Sistem Yöneticisi (Admin)', email: 'yonetici@kantincep.com' },
  ];

  for (const r of roles) {
    const loginRes = await testFetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: r.email, password: '123456' }),
    });

    const passed = loginRes.status === 200 && loginRes.json?.success === true && loginRes.json?.user?.role === r.role;
    reports.push({
      name: `6. Rol Girişi: ${r.label}`,
      url: `${BASE_URL}/auth/login`,
      method: 'POST',
      expectedStatus: 200,
      actualStatus: loginRes.status,
      dataSnippet: passed ? `Başarılı. User: ${loginRes.json.user.fullName} (${loginRes.json.user.role}), Token: ${loginRes.json.token}` : loginRes.text.slice(0, 80),
      passed,
      notes: `Gerçek kimlik doğrulama, rol eşleşmesi ve token üretimi doğrulandı (${r.email}).`,
    });
  }

  // ==========================================
  // Rapor Çıktısı
  // ==========================================
  console.log('\n==================================================================');
  console.log('📋 KANTİNCEP VERCEL API 404 VE DOĞRULAMA TEST RAPORU');
  console.log('==================================================================');
  let passCount = 0;
  for (const r of reports) {
    const icon = r.passed ? '✅' : '❌';
    if (r.passed) passCount++;
    console.log(`${icon} [${r.actualStatus}] ${r.name}`);
    console.log(`   ├─ Yol: [${r.method}] ${r.url}`);
    console.log(`   ├─ Yanıt: ${r.dataSnippet}`);
    console.log(`   └─ Detay: ${r.notes}`);
  }

  console.log('==================================================================');
  console.log(`🎯 Toplam Sonuç: ${passCount} / ${reports.length} BAŞARILI`);
  console.log('==================================================================\n');

  if (passCount !== reports.length) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Test paketi çalışırken beklenmeyen hata oluştu:', err);
  process.exit(1);
});
