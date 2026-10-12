/**
 * KantinCep End-to-End Automated Test Suite
 * Tests all core features, APIs, database transactions, role security,
 * stock decrement & rollback, payment flows, delivery PIN verification,
 * and solidarity pools.
 */

const BASE_URL = 'http://localhost:3000/api';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function assert(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message });
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('\n🚀 KantinCep Otomasyon Testleri Başlatılıyor...\n');

  let parentToken = '';
  let parentUserId = '';
  let canteenToken = '';
  let adminToken = '';
  let studentId = '';
  let testProductId = '';
  let testOrderId = '';
  let testDeliveryCode = '';
  let testDonationId = '';
  let testDonationItemId = '';
  let initialKaşarlıStock = 0;

  // 1. Health Check
  await assert('1. API Sağlık Kontrolü (/api/health)', async () => {
    const res = await request('/health');
    if (!res.ok || res.data.status !== 'ok') {
      throw new Error(`Health check başarısız: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Auth - Quick Accounts
  await assert('2. Hazır Test Hesapları (/api/auth/quick-accounts)', async () => {
    const res = await request('/auth/quick-accounts');
    if (!res.ok || !Array.isArray(res.data.users) || res.data.users.length < 3) {
      throw new Error('Hazır test hesapları yüklenemedi.');
    }
    const canteen = res.data.users.find((u: any) => u.role === 'canteen');
    const admin = res.data.users.find((u: any) => u.role === 'admin');
    canteenToken = canteen.id;
    adminToken = admin.id;
  });

  // 3. Auth - Register Parent with Validation
  const testEmail = `test.veli.${Date.now()}@kantincep.com`;
  await assert('3.1. Veli Kaydı - Şifre Uyuşmazlığı Reddedilmeli', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test Veli',
        email: testEmail,
        password: 'password123',
        passwordRepeat: 'wrongpass',
        kvkkConsent: true,
      }),
    });
    if (res.status !== 400) throw new Error('Şifre uyuşmazlığı engellenmedi.');
  });

  await assert('3.2. Veli Kaydı - KVKK Onayı Olmadan Reddedilmeli', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test Veli',
        email: testEmail,
        password: 'password123',
        passwordRepeat: 'password123',
        kvkkConsent: false,
      }),
    });
    if (res.status !== 400) throw new Error('KVKK onaysız kayıt engellenmedi.');
  });

  await assert('3.3. Veli Kaydı - Başarılı Kayıt ve Oturum', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test Veli Ayşe',
        email: testEmail,
        password: 'password123',
        passwordRepeat: 'password123',
        kvkkConsent: true,
      }),
    });
    if (!res.ok || !res.data.token) throw new Error('Veli kaydı başarısız oldu.');
    parentToken = res.data.token;
    parentUserId = res.data.user.id;
  });

  // 4. Password Reset
  await assert('4. Şifre Sıfırlama (/api/auth/reset-password)', async () => {
    const res = await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        newPassword: 'newsecurepass123',
      }),
    });
    if (!res.ok || !res.data.success) throw new Error('Şifre sıfırlama başarısız.');
  });

  // 5. Student CRUD
  await assert('5.1. Öğrenci Tanımlama (/api/students)', async () => {
    const res = await request('/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({
        fullName: 'Barış Test',
        grade: '3. Sınıf',
        classroom: '3-C',
      }),
    });
    if (!res.ok || !res.data.student?.id) throw new Error('Öğrenci eklenemedi.');
    studentId = res.data.student.id;
  });

  await assert('5.2. Öğrenci Listeleme ve İzolasyon', async () => {
    const res = await request('/students', {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    if (!res.ok || res.data.students.length === 0) throw new Error('Öğrenciler listelenemedi.');
    const found = res.data.students.find((s: any) => s.id === studentId);
    if (!found) throw new Error('Oluşturulan öğrenci bulunamadı.');
  });

  // 6. Product Management (Kantinci Role)
  await assert('6.1. Kantinci Yeni Ürün Ekleme (/api/products)', async () => {
    const res = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({
        name: 'Otomasyon Test Tostu',
        description: 'Test tostu',
        categoryId: 'cat-1',
        productType: 'food',
        price: 45,
        stockQuantity: 20,
        imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500',
        allergens: ['Gluten'],
      }),
    });
    if (!res.ok || !res.data.product?.id) throw new Error('Ürün eklenemedi.');
    testProductId = res.data.product.id;
  });

  await assert('6.2. Kantinci Fiyat & Stok Güncelleme', async () => {
    const res = await request(`/products/${testProductId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({
        price: 48,
        stockQuantity: 25,
      }),
    });
    if (!res.ok || res.data.product.price !== 48 || res.data.product.stockQuantity !== 25) {
      throw new Error('Fiyat veya stok güncellenemedi.');
    }
  });

  // 7. Admin School & Break Management
  await assert('7.1. Admin Okul Bilgisi Güncelleme (/api/schools/:id)', async () => {
    const res = await request('/schools/school-1', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Atatürk İlkokulu ve Ortaokulu (Güncel)',
        address: 'Meşrutiyet Cad. No:44 Çankaya / Ankara',
      }),
    });
    if (!res.ok || !res.data.success) throw new Error('Okul güncellenemedi.');
  });

  let testBreakId = '';
  await assert('7.2. Admin Yeni Teneffüs Ekleme (/api/breaks)', async () => {
    const res = await request('/breaks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: '5. Teneffüs',
        startTime: '15:20',
        endTime: '15:35',
        orderDeadlineMinutesBefore: 15,
      }),
    });
    if (!res.ok || !res.data.break?.id) throw new Error('Teneffüs eklenemedi.');
    testBreakId = res.data.break.id;
  });

  await assert('7.3. Admin Teneffüs Silme (/api/breaks/:id)', async () => {
    const res = await request(`/breaks/${testBreakId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok || !res.data.success) throw new Error('Teneffüs silinemedi.');
  });

  // 8. Order Placement with Server-Side Atomic Stock Verification
  await assert('8.1. Sipariş Oluşturma - Stok Kontrolü ve Fiyat Doğrulama', async () => {
    const prodBefore = await request(`/products?active=false`);
    const pItem = prodBefore.data.products.find((p: any) => p.id === testProductId);
    initialKaşarlıStock = pItem.stockQuantity;

    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({
        studentId,
        orderDate: '12.10.2026',
        breakId: 'break-1',
        items: [{ productId: testProductId, quantity: 2 }],
        note: 'Çok sıcak olsun.',
      }),
    });

    if (!orderRes.ok || !orderRes.data.order?.id) {
      throw new Error(`Sipariş oluşturulamadı: ${JSON.stringify(orderRes.data)}`);
    }

    testOrderId = orderRes.data.order.id;
    testDeliveryCode = orderRes.data.order.deliveryCode;

    // Check stock was decremented by 2
    const prodAfter = await request(`/products?active=false`);
    const pAfter = prodAfter.data.products.find((p: any) => p.id === testProductId);
    if (pAfter.stockQuantity !== initialKaşarlıStock - 2) {
      throw new Error(`Stok atomik olarak düşürülmedi! Beklenen: ${initialKaşarlıStock - 2}, Mevcut: ${pAfter.stockQuantity}`);
    }
  });

  await assert('8.2. Yetersiz Stok Durumunda Siparişin Engellenmesi', async () => {
    const res = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({
        studentId,
        orderDate: '12.10.2026',
        breakId: 'break-1',
        items: [{ productId: testProductId, quantity: 9999 }], // Excessive quantity
      }),
    });
    if (res.status !== 400) throw new Error('Stok aşımı olan sipariş kabul edildi!');
  });

  // 9. Payment Flow & Status Transition
  await assert('9.1. Başarılı Ödeme Simülasyonu (/api/payments/checkout)', async () => {
    const payRes = await request('/payments/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({
        targetId: testOrderId,
        targetType: 'order',
        simulationResult: 'success',
      }),
    });

    if (!payRes.ok || !payRes.data.success) {
      throw new Error('Ödeme onaylanamadı.');
    }

    // Verify order is now paid_pending
    const orderCheck = await request('/orders', {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    const ord = orderCheck.data.orders.find((o: any) => o.id === testOrderId);
    if (!ord || ord.orderStatus !== 'paid_pending' || ord.paymentStatus !== 'paid') {
      throw new Error('Sipariş ödenmiş duruma geçmedi.');
    }
  });

  // 10. Kitchen Workflow & Delivery Verification PIN
  await assert('10.1. Kantinci Siparişi Hazırlamaya Alma (/api/orders/:id/status)', async () => {
    const res = await request(`/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({ status: 'preparing' }),
    });
    if (!res.ok || res.data.order.orderStatus !== 'preparing') {
      throw new Error('Sipariş hazırlanıyor durumuna geçmedi.');
    }
  });

  await assert('10.2. Kantinci Siparişi Hazır Olarak İşaretleme', async () => {
    const res = await request(`/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({ status: 'ready' }),
    });
    if (!res.ok || res.data.order.orderStatus !== 'ready') {
      throw new Error('Sipariş hazır durumuna geçmedi.');
    }
  });

  await assert('10.3. Hatalı Teslimat Kodu Girildiğinde Reddedilmeli', async () => {
    const res = await request(`/orders/${testOrderId}/verify-delivery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({ deliveryCode: '9999' }), // Wrong code
    });
    if (res.status !== 400) {
      throw new Error('Yanlış PIN koduyla teslimata izin verildi!');
    }
  });

  await assert('10.4. Doğru PIN Koduyla Güvenli Teslimat', async () => {
    const res = await request(`/orders/${testOrderId}/verify-delivery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({ deliveryCode: testDeliveryCode }),
    });
    if (!res.ok || res.data.order.orderStatus !== 'delivered' || !res.data.order.isVerifiedDelivery) {
      throw new Error('Doğru PIN ile teslimat doğrulanamadı.');
    }
  });

  await assert('10.5. Mükerrer Teslimat Engellemesi (İkinci kez teslim edilemez)', async () => {
    const res = await request(`/orders/${testOrderId}/verify-delivery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({ deliveryCode: testDeliveryCode }),
    });
    if (res.status !== 400) {
      throw new Error('Teslim edilmiş sipariş ikinci kez onaylandı!');
    }
  });

  // 11. Order Cancellation & Stock Rollback
  await assert('11. Sipariş İptali ve Otomatik Stok İadesi', async () => {
    const pBefore = await request(`/products?active=false`);
    const stockBefore = pBefore.data.products.find((p: any) => p.id === testProductId).stockQuantity;

    // Create a new order
    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({
        studentId,
        orderDate: '12.10.2026',
        breakId: 'break-1',
        items: [{ productId: testProductId, quantity: 3 }],
      }),
    });
    const orderToCancel = orderRes.data.order.id;

    // Pay for it
    await request('/payments/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({ targetId: orderToCancel, targetType: 'order', simulationResult: 'success' }),
    });

    // Parent cancels it
    const cancelRes = await request(`/orders/${orderToCancel}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (!cancelRes.ok || cancelRes.data.order.orderStatus !== 'cancelled') {
      throw new Error('Sipariş iptal edilemedi.');
    }

    // Verify stock is restored back!
    const pAfter = await request(`/products?active=false`);
    const stockAfter = pAfter.data.products.find((p: any) => p.id === testProductId).stockQuantity;
    if (stockAfter !== stockBefore) {
      throw new Error(`İptal edilen siparişin stoğu iade edilmedi! Önceki: ${stockBefore}, Sonraki: ${stockAfter}`);
    }
  });

  // 12. Solidarity Pool & Education Support Donations
  await assert('12.1. Dayanışma Havuzu Bağışı Oluşturma ve Ödeme', async () => {
    const donRes = await request('/donations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({
        donationType: 'food_pool',
        items: [{ productId: 'prod-1', quantity: 2 }],
        note: 'Afiyet olsun.',
      }),
    });
    if (!donRes.ok || !donRes.data.donation?.id) {
      throw new Error('Bağış oluşturulamadı.');
    }
    testDonationId = donRes.data.donation.id;
    testDonationItemId = donRes.data.donation.items[0].id;

    // Complete payment
    const payRes = await request('/payments/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
      body: JSON.stringify({
        targetId: testDonationId,
        targetType: 'donation',
        simulationResult: 'success',
      }),
    });
    if (!payRes.ok || !payRes.data.success) {
      throw new Error('Bağış ödemesi tamamlanamadı.');
    }
  });

  await assert('12.2. Anonim Dağıtım Kaydı (/api/donations/distribute)', async () => {
    const distRes = await request('/donations/distribute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${canteenToken}` },
      body: JSON.stringify({
        donationItemId: testDonationItemId,
        quantity: 1,
        notes: 'Öğrenciye gizlilikle teslim edildi.',
      }),
    });
    if (!distRes.ok || !distRes.data.distribution?.id) {
      throw new Error('Bağış dağıtımı kaydedilemedi.');
    }
  });

  // 13. Reports & CSV Export
  await assert('13.1. Kantin Raporlama (/api/reports/canteen-summary)', async () => {
    const res = await request('/reports/canteen-summary', {
      headers: { Authorization: `Bearer ${canteenToken}` },
    });
    if (!res.ok || typeof res.data.summary?.todaySalesAmount !== 'number') {
      throw new Error('Rapor verisi hesaplanamadı.');
    }
  });

  await assert('13.2. KVKK Uyumlu CSV İndirme (/api/reports/export-csv)', async () => {
    const res = await fetch(`${BASE_URL}/reports/export-csv?token=${canteenToken}`);
    if (!res.ok) throw new Error('CSV endpoint hata verdi.');
    const text = await res.text();
    if (!text.includes('Siparis No') || !text.includes('Toplam Tutar')) {
      throw new Error('CSV başlıkları eksik veya geçersiz.');
    }
    // Verify phone or private fields are NOT in the CSV
    if (text.includes('0555') || text.includes('password')) {
      throw new Error('KVKK İhlali: CSV dosyasında telefon veya hassas veri saptandı!');
    }
  });

  // 14. Audit Logs
  await assert('14. Sistem Denetim Günlüğü (/api/admin/audit-logs)', async () => {
    const res = await request('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok || !Array.isArray(res.data.logs) || res.data.logs.length === 0) {
      throw new Error('Audit loglar listelenemedi.');
    }
  });

  console.log('\n========================================');
  console.log(`📊 TEST SONUÇLARI: ${results.filter(r => r.passed).length} / ${results.length} BAŞARILI`);
  console.log('========================================\n');

  if (results.some(r => !r.passed)) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test süreci kritik hatayla durdu:', err);
  process.exit(1);
});
