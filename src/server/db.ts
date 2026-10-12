import fs from 'fs';
import path from 'path';
import {
  User,
  School,
  Student,
  Category,
  BreakTime,
  Product,
  Order,
  Donation,
  PaymentRecord,
  OrderStatusHistory,
  DonationDistribution,
  AuditLog,
  NotificationItem,
  CanteenReportSummary,
  OrderStatus,
} from '../types.ts';

interface DatabaseSchema {
  users: User[];
  schools: School[];
  students: Student[];
  categories: Category[];
  breaks: BreakTime[];
  products: Product[];
  orders: Order[];
  donations: Donation[];
  payments: PaymentRecord[];
  orderStatusHistory: OrderStatusHistory[];
  donationDistributions: DonationDistribution[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'kantincep_db.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function getInitialSeedData(): DatabaseSchema {
  const now = new Date().toISOString();
  const schoolId = 'school-1';

  const defaultSchool: School = {
    id: schoolId,
    name: 'Atatürk İlkokulu ve Ortaokulu',
    address: 'Meşrutiyet Cad. No:44 Çankaya / Ankara',
    timezone: 'Europe/Istanbul',
    activeStatus: true,
  };

  const defaultBreaks: BreakTime[] = [
    { id: 'break-1', schoolId, name: '1. Teneffüs', startTime: '09:40', endTime: '09:55', activeStatus: true, orderDeadlineMinutesBefore: 15 },
    { id: 'break-2', schoolId, name: '2. Teneffüs', startTime: '10:35', endTime: '10:50', activeStatus: true, orderDeadlineMinutesBefore: 15 },
    { id: 'break-3', schoolId, name: 'Öğle Arası', startTime: '12:15', endTime: '13:00', activeStatus: true, orderDeadlineMinutesBefore: 30 },
    { id: 'break-4', schoolId, name: '3. Teneffüs', startTime: '13:40', endTime: '13:55', activeStatus: true, orderDeadlineMinutesBefore: 15 },
    { id: 'break-5', schoolId, name: '4. Teneffüs', startTime: '14:35', endTime: '14:50', activeStatus: true, orderDeadlineMinutesBefore: 15 },
  ];

  const defaultCategories: Category[] = [
    { id: 'cat-1', schoolId, name: 'Sandviç & Tost', productType: 'food', activeStatus: true },
    { id: 'cat-2', schoolId, name: 'Sıcak Yemek & Çorba', productType: 'food', activeStatus: true },
    { id: 'cat-3', schoolId, name: 'Sağlıklı Atıştırmalıklar', productType: 'food', activeStatus: true },
    { id: 'cat-4', schoolId, name: 'İçecekler', productType: 'food', activeStatus: true },
    { id: 'cat-5', schoolId, name: 'Temel Kırtasiye', productType: 'stationery', activeStatus: true },
    { id: 'cat-6', schoolId, name: 'Boya & Sanat Setleri', productType: 'stationery', activeStatus: true },
  ];

  const defaultProducts: Product[] = [
    {
      id: 'prod-1',
      schoolId,
      name: 'Kaşarlı Tost (Tam Buğday)',
      description: 'Doğal kaşar peyniri ve tereyağı ile taze pişirilen sıcak tost.',
      categoryId: 'cat-1',
      productType: 'food',
      price: 45,
      stockQuantity: 40,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      allergens: ['Gluten', 'Süt Ürünleri'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-2',
      schoolId,
      name: 'Karışık Tost (Sucuklu & Kaşarlı)',
      description: 'Dana sucuk, kaşar peyniri ve taze domates sosuyla sıcak ekmekte.',
      categoryId: 'cat-1',
      productType: 'food',
      price: 55,
      stockQuantity: 35,
      imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80',
      allergens: ['Gluten', 'Süt Ürünleri'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-3',
      schoolId,
      name: 'Peynirli Soğuk Sandviç',
      description: 'Ezine beyaz peynir, kıvırcık marul, taze salatalık ve domates.',
      categoryId: 'cat-1',
      productType: 'food',
      price: 50,
      stockQuantity: 25,
      imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80',
      allergens: ['Gluten', 'Süt Ürünleri'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-4',
      schoolId,
      name: 'Izgara Tavuklu Baget Sandviç',
      description: 'Marine edilmiş ızgara tavuk göğsü, hafif hardallı sos ve marul.',
      categoryId: 'cat-1',
      productType: 'food',
      price: 65,
      stockQuantity: 20,
      imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=500&auto=format&fit=crop&q=80',
      allergens: ['Gluten', 'Hardal'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-5',
      schoolId,
      name: 'Süzme Mercimek Çorbası & Ekmek',
      description: 'Geleneksel tereyağlı süzme mercimek çorbası, yanında taze çıtır ekmek dilimleri.',
      categoryId: 'cat-2',
      productType: 'food',
      price: 40,
      stockQuantity: 30,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=80',
      allergens: ['Gluten', 'Kereviz'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-6',
      schoolId,
      name: 'Fındık & Kuru Üzüm Enerji Paketi',
      description: 'Kavrulmamış taze fındık ve çekirdeksiz kuru üzümden zengin ara öğün (50g).',
      categoryId: 'cat-3',
      productType: 'food',
      price: 30,
      stockQuantity: 50,
      imageUrl: 'https://images.unsplash.com/photo-1508061252445-5350f3ab0a55?w=500&auto=format&fit=crop&q=80',
      allergens: ['Fındık/Sert Kabuklu Yemişler'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-7',
      schoolId,
      name: 'Taze Meyve Tabağı (Elma & Muz)',
      description: 'Yıkanmış, dilimlenmeye hazır taze Amasya elması ve yerli Anamur muzu.',
      categoryId: 'cat-3',
      productType: 'food',
      price: 25,
      stockQuantity: 45,
      imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-8',
      schoolId,
      name: 'Çilekli Doğal Yoğurt (150g)',
      description: 'Probiyotik mayalı taze yoğurt ve gerçek çilek parçacıkları.',
      categoryId: 'cat-3',
      productType: 'food',
      price: 28,
      stockQuantity: 30,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80',
      allergens: ['Süt Ürünleri'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-9',
      schoolId,
      name: 'Taze Sıkma Portakal Suyu (250ml)',
      description: 'Şekersiz, katkısız %100 Finike portakalından sipariş anında sıkılır.',
      categoryId: 'cat-4',
      productType: 'food',
      price: 35,
      stockQuantity: 30,
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-10',
      schoolId,
      name: 'Günlük Şişe Süt (200ml)',
      description: 'Pastörize tam yağlı kalsiyum zengini çocuk sütü.',
      categoryId: 'cat-4',
      productType: 'food',
      price: 20,
      stockQuantity: 60,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
      allergens: ['Süt Ürünleri'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-11',
      schoolId,
      name: 'Doğal Köy Ayranı (200ml)',
      description: 'Az tuzlu, probiyotik yoğurttan serinletici geleneksel ayran.',
      categoryId: 'cat-4',
      productType: 'food',
      price: 18,
      stockQuantity: 50,
      imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=80',
      allergens: ['Süt Ürünleri'],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-12',
      schoolId,
      name: 'Doğal Kaynak Suyu (500ml)',
      description: 'BPA içermeyen şişede saf doğal kaynak suyu.',
      categoryId: 'cat-4',
      productType: 'food',
      price: 10,
      stockQuantity: 100,
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    // Stationery
    {
      id: 'prod-13',
      schoolId,
      name: 'Kareli Okul Defteri (80 Yaprak)',
      description: '1. Hamur kaliteli beyaz kağıt, tel dikişli, dayanıklı kapak.',
      categoryId: 'cat-5',
      productType: 'stationery',
      price: 35,
      stockQuantity: 60,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-14',
      schoolId,
      name: 'Çizgili Türkçe Defteri (80 Yaprak)',
      description: 'Çizgili yazı defteri, A4 boyutunda, lekesiz parlak sayfalar.',
      categoryId: 'cat-5',
      productType: 'stationery',
      price: 35,
      stockQuantity: 50,
      imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-15',
      schoolId,
      name: 'Kurşun Kalem Seti (3\'lü HB)',
      description: 'Ergonomik tutuşlu, kırılmaya dirençli grafit kurşun kalemler.',
      categoryId: 'cat-5',
      productType: 'stationery',
      price: 25,
      stockQuantity: 80,
      imageUrl: 'https://images.unsplash.com/photo-1585336261026-7f0980fa2a9d?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-16',
      schoolId,
      name: 'Silgi & Kalemtıraş İkilisi',
      description: 'Toz bırakmayan yumuşak sınav silgisi ve hazneli metal bıçaklı kalemtıraş.',
      categoryId: 'cat-5',
      productType: 'stationery',
      price: 20,
      stockQuantity: 70,
      imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-17',
      schoolId,
      name: '12\'li Canlı Kuru Boya Seti',
      description: 'Toksik madde içermeyen, yüksek pigmentli 12 renk ahşap kuru boya.',
      categoryId: 'cat-6',
      productType: 'stationery',
      price: 65,
      stockQuantity: 40,
      imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-18',
      schoolId,
      name: 'Fermuarlı Kumaş Kalem Kutusu',
      description: 'Geniş hacimli, yıkanabilir kumaştan çok bölmeli şık kalemlik.',
      categoryId: 'cat-6',
      productType: 'stationery',
      price: 50,
      stockQuantity: 30,
      imageUrl: 'https://images.unsplash.com/photo-1585336261026-7f0980fa2a9d?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-19',
      schoolId,
      name: 'Kapsamlı Kırtasiye Başlangıç Paketi',
      description: '2 defter, kalem seti, boya seti, silgi, cetvel ve kalemlikten oluşan tam destek kiti.',
      categoryId: 'cat-6',
      productType: 'stationery',
      price: 190,
      stockQuantity: 25,
      imageUrl: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=500&auto=format&fit=crop&q=80',
      allergens: [],
      activeStatus: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const defaultUsers: User[] = [
    {
      id: 'user-parent-1',
      fullName: 'Ayşe Yılmaz',
      email: 'veli@kantincep.com',
      role: 'parent',
      schoolId,
      accountStatus: 'active',
      phone: '0555 123 45 67',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'user-canteen-1',
      fullName: 'Mehmet Usta',
      email: 'kantin@kantincep.com',
      role: 'canteen',
      schoolId,
      accountStatus: 'active',
      phone: '0532 987 65 43',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'user-admin-1',
      fullName: 'Kemal Öztürk (Okul Müdürü)',
      email: 'yonetici@kantincep.com',
      role: 'admin',
      schoolId,
      accountStatus: 'active',
      phone: '0505 456 78 90',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const defaultStudents: Student[] = [
    {
      id: 'student-1',
      parentUserId: 'user-parent-1',
      schoolId,
      fullName: 'Ali Yılmaz',
      grade: '4. Sınıf',
      classroom: '4-B',
      activeStatus: true,
      createdAt: now,
    },
    {
      id: 'student-2',
      parentUserId: 'user-parent-1',
      schoolId,
      fullName: 'Zeynep Yılmaz',
      grade: '2. Sınıf',
      classroom: '2-A',
      activeStatus: true,
      createdAt: now,
    },
  ];

  const todayStr = getTodayFormatted();

  const defaultOrders: Order[] = [
    {
      id: 'order-sample-1',
      orderNumber: 'KC-20261012-001',
      parentUserId: 'user-parent-1',
      studentId: 'student-1',
      studentNameSnapshot: 'Ali Yılmaz',
      studentClassSnapshot: '4-B',
      schoolId,
      orderDate: todayStr,
      breakId: 'break-2',
      breakNameSnapshot: '2. Teneffüs',
      orderType: 'canteen',
      paymentStatus: 'paid',
      orderStatus: 'preparing',
      subtotal: 63,
      totalAmount: 63,
      note: 'Tost sıcak olsun lütfen, teşekkürler.',
      deliveryCode: '7492',
      isVerifiedDelivery: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      items: [
        {
          id: 'item-1',
          orderId: 'order-sample-1',
          productId: 'prod-1',
          productNameSnapshot: 'Kaşarlı Tost (Tam Buğday)',
          unitPriceSnapshot: 45,
          quantity: 1,
          lineTotal: 45,
        },
        {
          id: 'item-2',
          orderId: 'order-sample-1',
          productId: 'prod-11',
          productNameSnapshot: 'Doğal Köy Ayranı (200ml)',
          unitPriceSnapshot: 18,
          quantity: 1,
          lineTotal: 18,
        },
      ],
    },
    {
      id: 'order-sample-2',
      orderNumber: 'KC-20261012-002',
      parentUserId: 'user-parent-1',
      studentId: 'student-2',
      studentNameSnapshot: 'Zeynep Yılmaz',
      studentClassSnapshot: '2-A',
      schoolId,
      orderDate: todayStr,
      breakId: 'break-1',
      breakNameSnapshot: '1. Teneffüs',
      orderType: 'canteen',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      subtotal: 45,
      totalAmount: 45,
      note: '',
      deliveryCode: '3180',
      isVerifiedDelivery: true,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      items: [
        {
          id: 'item-3',
          orderId: 'order-sample-2',
          productId: 'prod-7',
          productNameSnapshot: 'Taze Meyve Tabağı (Elma & Muz)',
          unitPriceSnapshot: 25,
          quantity: 1,
          lineTotal: 25,
        },
        {
          id: 'item-4',
          orderId: 'order-sample-2',
          productId: 'prod-10',
          productNameSnapshot: 'Günlük Şişe Süt (200ml)',
          unitPriceSnapshot: 20,
          quantity: 1,
          lineTotal: 20,
        },
      ],
    },
  ];

  const defaultDonations: Donation[] = [
    {
      id: 'donation-sample-1',
      donationNumber: 'DY-20261012-001',
      donorUserId: 'user-parent-1',
      donorNameSnapshot: 'Hayırsever Veli (Anonim)',
      schoolId,
      donationType: 'food_pool',
      paymentStatus: 'paid',
      totalAmount: 315,
      note: 'Geleceğimiz olan yavrularımıza afiyet olsun.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      items: [
        {
          id: 'don-item-1',
          donationId: 'donation-sample-1',
          productId: 'prod-1',
          productNameSnapshot: 'Kaşarlı Tost (Tam Buğday)',
          unitPriceSnapshot: 45,
          quantity: 5,
          allocatedQuantity: 3,
          deliveredQuantity: 3,
          remainingQuantity: 2,
        },
        {
          id: 'don-item-2',
          donationId: 'donation-sample-1',
          productId: 'prod-11',
          productNameSnapshot: 'Doğal Köy Ayranı (200ml)',
          unitPriceSnapshot: 18,
          quantity: 5,
          allocatedQuantity: 3,
          deliveredQuantity: 3,
          remainingQuantity: 2,
        },
      ],
    },
    {
      id: 'donation-sample-2',
      donationNumber: 'DY-20261012-002',
      donorUserId: 'user-parent-1',
      donorNameSnapshot: 'Hayırsever Veli (Anonim)',
      schoolId,
      donationType: 'education_support',
      paymentStatus: 'paid',
      totalAmount: 280,
      note: 'Kırtasiye desteği',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      items: [
        {
          id: 'don-item-3',
          donationId: 'donation-sample-2',
          productId: 'prod-13',
          productNameSnapshot: 'Kareli Okul Defteri (80 Yaprak)',
          unitPriceSnapshot: 35,
          quantity: 4,
          allocatedQuantity: 2,
          deliveredQuantity: 2,
          remainingQuantity: 2,
        },
        {
          id: 'don-item-4',
          donationId: 'donation-sample-2',
          productId: 'prod-15',
          productNameSnapshot: 'Kurşun Kalem Seti (3\'lü HB)',
          unitPriceSnapshot: 25,
          quantity: 4,
          allocatedQuantity: 1,
          deliveredQuantity: 1,
          remainingQuantity: 3,
        },
      ],
    },
  ];

  const defaultPayments: PaymentRecord[] = [
    {
      id: 'pay-1',
      targetId: 'order-sample-1',
      targetType: 'order',
      paymentProvider: 'simulation',
      providerReference: 'SIM-982142',
      amount: 63,
      currency: 'TRY',
      paymentStatus: 'success',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const defaultOrderHistory: OrderStatusHistory[] = [
    {
      id: 'hist-1',
      orderId: 'order-sample-1',
      previousStatus: 'pending_payment',
      newStatus: 'paid_pending',
      changedByUserId: 'user-parent-1',
      changedByName: 'Ayşe Yılmaz (Veli)',
      changedByRole: 'parent',
      changedAt: new Date(Date.now() - 3600000).toISOString(),
      note: 'Ödeme başarıyla tamamlandı.',
    },
    {
      id: 'hist-2',
      orderId: 'order-sample-1',
      previousStatus: 'paid_pending',
      newStatus: 'preparing',
      changedByUserId: 'user-canteen-1',
      changedByName: 'Mehmet Usta (Kantinci)',
      changedByRole: 'canteen',
      changedAt: new Date(Date.now() - 1800000).toISOString(),
      note: 'Kantin mutfağında tost hazırlanmaya başlandı.',
    },
  ];

  const defaultDistributions: DonationDistribution[] = [
    {
      id: 'dist-1',
      schoolId,
      donationItemId: 'don-item-1',
      productId: 'prod-1',
      productNameSnapshot: 'Kaşarlı Tost (Tam Buğday)',
      donationType: 'food_pool',
      quantity: 3,
      authorizedStaffId: 'user-admin-1',
      authorizedStaffName: 'Kemal Öztürk (Okul İdaresi)',
      notes: 'Okul rehberlik ve psikolojik danışmanlık servisi koordinasyonuyla gizlilik esasıyla teslim edildi.',
      distributedAt: new Date(Date.now() - 20000000).toISOString(),
    },
  ];

  const defaultAuditLogs: AuditLog[] = [
    {
      id: 'log-1',
      actorUserId: 'system',
      actorName: 'Sistem',
      actorRole: 'system',
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'database',
      entityId: 'init',
      details: 'KantinCep veritabanı ilk kurulumu başarıyla tamamlandı.',
      timestamp: now,
    },
  ];

  const defaultNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'user-parent-1',
      title: 'Siparişiniz Hazırlanıyor 🥪',
      message: 'Ali Yılmaz için verdiğiniz Kaşarlı Tost siparişi kantinde hazırlanmaya başlandı. Teslim kodu: 7492',
      type: 'order',
      read: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'notif-2',
      userId: 'user-parent-1',
      title: 'Dayanışma Teşekkürü 💚',
      message: 'Dayanışma Havuzuna yaptığınız katkı okul idaresi aracılığıyla ihtiyaç sahibi öğrencimize ulaştırıldı.',
      type: 'donation',
      read: true,
      createdAt: new Date(Date.now() - 15000000).toISOString(),
    },
  ];

  return {
    users: defaultUsers,
    schools: [defaultSchool],
    students: defaultStudents,
    categories: defaultCategories,
    breaks: defaultBreaks,
    products: defaultProducts,
    orders: defaultOrders,
    donations: defaultDonations,
    payments: defaultPayments,
    orderStatusHistory: defaultOrderHistory,
    donationDistributions: defaultDistributions,
    auditLogs: defaultAuditLogs,
    notifications: defaultNotifications,
  };
}

export function getTodayFormatted(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.readFromDisk();
  }

  private readFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading database file, resetting to seed:', err);
    }
    const initial = getInitialSeedData();
    this.writeToDisk(initial);
    return initial;
  }

  private writeToDisk(dataToSave?: DatabaseSchema) {
    try {
      const payload = dataToSave || this.data;
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error writing to database:', err);
    }
  }

  // --- Users ---
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.writeToDisk();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.writeToDisk();
    return this.data.users[idx];
  }

  // --- Schools, Breaks, Categories ---
  getSchools(): School[] {
    return this.data.schools;
  }

  updateSchool(id: string, updates: Partial<School>): School | undefined {
    const idx = this.data.schools.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.schools[idx] = { ...this.data.schools[idx], ...updates };
    this.writeToDisk();
    return this.data.schools[idx];
  }

  // --- Breaks ---
  getBreaks(schoolId?: string): BreakTime[] {
    return schoolId ? this.data.breaks.filter(b => b.schoolId === schoolId) : this.data.breaks;
  }

  createBreak(breakTime: BreakTime): BreakTime {
    this.data.breaks.push(breakTime);
    this.writeToDisk();
    return breakTime;
  }

  updateBreak(id: string, updates: Partial<BreakTime>): BreakTime | undefined {
    const idx = this.data.breaks.findIndex(b => b.id === id);
    if (idx === -1) return undefined;
    this.data.breaks[idx] = { ...this.data.breaks[idx], ...updates };
    this.writeToDisk();
    return this.data.breaks[idx];
  }

  deleteBreak(id: string): boolean {
    const idx = this.data.breaks.findIndex(b => b.id === id);
    if (idx === -1) return false;
    this.data.breaks.splice(idx, 1);
    this.writeToDisk();
    return true;
  }

  // --- Categories ---
  getCategories(schoolId?: string): Category[] {
    return schoolId ? this.data.categories.filter(c => c.schoolId === schoolId) : this.data.categories;
  }

  createCategory(category: Category): Category {
    this.data.categories.push(category);
    this.writeToDisk();
    return category;
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.writeToDisk();
    return this.data.categories[idx];
  }

  deleteCategory(id: string): boolean {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return false;
    // Soft delete category
    this.data.categories[idx].activeStatus = false;
    this.writeToDisk();
    return true;
  }

  // --- Students ---
  getStudentsByParent(parentUserId: string): Student[] {
    return this.data.students.filter(s => s.parentUserId === parentUserId && s.activeStatus);
  }

  getAllStudents(schoolId?: string): Student[] {
    return schoolId ? this.data.students.filter(s => s.schoolId === schoolId) : this.data.students;
  }

  createStudent(student: Student): Student {
    this.data.students.push(student);
    this.writeToDisk();
    return student;
  }

  updateStudent(id: string, updates: Partial<Student>): Student | undefined {
    const idx = this.data.students.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.students[idx] = { ...this.data.students[idx], ...updates };
    this.writeToDisk();
    return this.data.students[idx];
  }

  deleteStudent(id: string): boolean {
    const idx = this.data.students.findIndex(s => s.id === id);
    if (idx === -1) return false;
    // Soft delete
    this.data.students[idx].activeStatus = false;
    this.writeToDisk();
    return true;
  }

  // --- Products ---
  getProducts(schoolId?: string, onlyActive = false): Product[] {
    let prods = this.data.products;
    if (schoolId) prods = prods.filter(p => p.schoolId === schoolId);
    if (onlyActive) prods = prods.filter(p => p.activeStatus);
    return prods;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  createProduct(product: Product): Product {
    this.data.products.push(product);
    this.writeToDisk();
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.data.products[idx] = { ...this.data.products[idx], ...updates, updatedAt: new Date().toISOString() };
    this.writeToDisk();
    return this.data.products[idx];
  }

  deleteProduct(id: string): boolean {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    // Soft delete to maintain order snapshot references
    this.data.products[idx].activeStatus = false;
    this.data.products[idx].updatedAt = new Date().toISOString();
    this.writeToDisk();
    return true;
  }

  // --- Orders ---
  getOrders(filters?: {
    schoolId?: string;
    parentUserId?: string;
    orderDate?: string;
    breakId?: string;
    orderStatus?: string;
    search?: string;
  }): Order[] {
    let list = this.data.orders;
    if (filters?.schoolId) list = list.filter(o => o.schoolId === filters.schoolId);
    if (filters?.parentUserId) list = list.filter(o => o.parentUserId === filters.parentUserId);
    if (filters?.orderDate) list = list.filter(o => o.orderDate === filters.orderDate);
    if (filters?.breakId) list = list.filter(o => o.breakId === filters.breakId);
    if (filters?.orderStatus && filters.orderStatus !== 'all') {
      list = list.filter(o => o.orderStatus === filters.orderStatus);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        o =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.studentNameSnapshot.toLowerCase().includes(q) ||
          o.deliveryCode.includes(q)
      );
    }
    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  createOrder(order: Order): { success: boolean; order?: Order; error?: string } {
    // Atomic verification of stock
    for (const item of order.items) {
      const prod = this.getProductById(item.productId);
      if (!prod) {
        return { success: false, error: `Ürün bulunamadı: ${item.productNameSnapshot}` };
      }
      if (!prod.activeStatus) {
        return { success: false, error: `Ürün şu anda satışa kapalı: ${prod.name}` };
      }
      if (prod.stockQuantity < item.quantity) {
        return { success: false, error: `Yetersiz stok: "${prod.name}" için mevcut stok: ${prod.stockQuantity}` };
      }
    }

    // Decrement stocks atomically
    for (const item of order.items) {
      const prod = this.getProductById(item.productId)!;
      prod.stockQuantity -= item.quantity;
      prod.updatedAt = new Date().toISOString();
    }

    this.data.orders.unshift(order);
    this.writeToDisk();
    return { success: true, order };
  }

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: { id: string; name: string; role: any },
    note?: string
  ): { success: boolean; order?: Order; error?: string } {
    const order = this.getOrderById(orderId);
    if (!order) return { success: false, error: 'Sipariş bulunamadı.' };

    const oldStatus = order.orderStatus;

    // Validate valid transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending_payment: ['paid_pending', 'cancelled'],
      paid_pending: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[oldStatus].includes(newStatus)) {
      return {
        success: false,
        error: `Geçersiz durum geçişi: "${oldStatus}" durumundan "${newStatus}" durumuna geçilemez.`,
      };
    }

    // If cancelled, restore stocks back to products!
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      for (const item of order.items) {
        const prod = this.getProductById(item.productId);
        if (prod) {
          prod.stockQuantity += item.quantity;
          prod.updatedAt = new Date().toISOString();
        }
      }
    }

    order.orderStatus = newStatus;
    order.updatedAt = new Date().toISOString();
    if (newStatus === 'delivered') {
      order.isVerifiedDelivery = true;
    }

    // Add history record
    this.data.orderStatusHistory.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId,
      previousStatus: oldStatus,
      newStatus,
      changedByUserId: changedBy.id,
      changedByName: changedBy.name,
      changedByRole: changedBy.role,
      changedAt: new Date().toISOString(),
      note: note || `Durum ${oldStatus} -> ${newStatus} olarak güncellendi.`,
    });

    // Notify parent
    let notifTitle = 'Sipariş Güncellemesi';
    let notifMsg = `Siparişiniz (${order.orderNumber}) güncellendi: ${newStatus}`;
    if (newStatus === 'preparing') {
      notifTitle = 'Sipariş Hazırlanıyor 🥪';
      notifMsg = `${order.studentNameSnapshot} için ${order.orderNumber} numaralı sipariş kantinde hazırlanmaya başlandı.`;
    } else if (newStatus === 'ready') {
      notifTitle = 'Sipariş Hazır! 🔔';
      notifMsg = `${order.orderNumber} hazırlandı! Teneffüste kantinden teslim kodu "${order.deliveryCode}" ile teslim alınabilir.`;
    } else if (newStatus === 'delivered') {
      notifTitle = 'Sipariş Teslim Edildi ✅';
      notifMsg = `${order.studentNameSnapshot} siparişini kantinden teslim aldı. Afiyet olsun!`;
    } else if (newStatus === 'cancelled') {
      notifTitle = 'Sipariş İptal Edildi ❌';
      notifMsg = `${order.orderNumber} numaralı sipariş iptal edildi. İade tutarı bakiyenize/kartınıza yansıtılacaktır.`;
    }

    this.createNotification({
      userId: order.parentUserId,
      title: notifTitle,
      message: notifMsg,
      type: 'order',
      linkUrl: `/orders/${order.id}`,
    });

    this.writeToDisk();
    return { success: true, order };
  }

  verifyOrderDelivery(orderId: string, deliveryCode: string, changedBy: { id: string; name: string; role: any }): { success: boolean; order?: Order; error?: string } {
    const order = this.getOrderById(orderId);
    if (!order) return { success: false, error: 'Sipariş bulunamadı.' };
    if (order.orderStatus === 'delivered') return { success: false, error: 'Bu sipariş daha önce teslim edilmiştir!' };
    if (order.deliveryCode !== deliveryCode.trim()) {
      return { success: false, error: 'Teslimat kodu hatalı! Lütfen öğrencinin kodunu kontrol ediniz.' };
    }
    return this.updateOrderStatus(orderId, 'delivered', changedBy, 'Öğrenci teslimat koduyla doğrulandı.');
  }

  // --- Donations ---
  getDonations(filters?: { schoolId?: string; donorUserId?: string; donationType?: string }): Donation[] {
    let list = this.data.donations;
    if (filters?.schoolId) list = list.filter(d => d.schoolId === filters.schoolId);
    if (filters?.donorUserId) list = list.filter(d => d.donorUserId === filters.donorUserId);
    if (filters?.donationType) list = list.filter(d => d.donationType === filters.donationType);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createDonation(donation: Donation): Donation {
    this.data.donations.unshift(donation);
    this.writeToDisk();
    return donation;
  }

  distributeDonation(params: {
    schoolId: string;
    donationItemId: string;
    quantity: number;
    authorizedStaffId: string;
    authorizedStaffName: string;
    notes: string;
  }): { success: boolean; error?: string; distribution?: DonationDistribution } {
    let foundItem: any = null;
    let parentDonation: Donation | null = null;

    for (const don of this.data.donations) {
      const it = don.items.find(i => i.id === params.donationItemId);
      if (it) {
        foundItem = it;
        parentDonation = don;
        break;
      }
    }

    if (!foundItem || !parentDonation) {
      return { success: false, error: 'Bağış kalemi bulunamadı.' };
    }

    if (foundItem.remainingQuantity < params.quantity) {
      return {
        success: false,
        error: `Yetersiz bakiye. Dağıtılabilir kalan miktar: ${foundItem.remainingQuantity}`,
      };
    }

    foundItem.allocatedQuantity += params.quantity;
    foundItem.deliveredQuantity += params.quantity;
    foundItem.remainingQuantity -= params.quantity;

    const distRecord: DonationDistribution = {
      id: `dist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      schoolId: params.schoolId,
      donationItemId: params.donationItemId,
      productId: foundItem.productId,
      productNameSnapshot: foundItem.productNameSnapshot,
      donationType: parentDonation.donationType,
      quantity: params.quantity,
      authorizedStaffId: params.authorizedStaffId,
      authorizedStaffName: params.authorizedStaffName,
      notes: params.notes,
      distributedAt: new Date().toISOString(),
    };

    this.data.donationDistributions.unshift(distRecord);
    this.writeToDisk();
    return { success: true, distribution: distRecord };
  }

  getDonationDistributions(schoolId?: string): DonationDistribution[] {
    return schoolId
      ? this.data.donationDistributions.filter(d => d.schoolId === schoolId)
      : this.data.donationDistributions;
  }

  // --- Payments ---
  recordPayment(record: PaymentRecord): PaymentRecord {
    this.data.payments.push(record);
    this.writeToDisk();
    return record;
  }

  // --- Audit Logs ---
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const fullLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...log,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(fullLog);
    this.writeToDisk();
    return fullLog;
  }

  getAuditLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  // --- Notifications ---
  createNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): NotificationItem {
    const item: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...notif,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(item);
    this.writeToDisk();
    return item;
  }

  getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications.filter(n => n.userId === userId);
  }

  markNotificationAsRead(id: string): void {
    const it = this.data.notifications.find(n => n.id === id);
    if (it) {
      it.read = true;
      this.writeToDisk();
    }
  }

  markAllNotificationsAsRead(userId: string): void {
    for (const n of this.data.notifications) {
      if (n.userId === userId) n.read = true;
    }
    this.writeToDisk();
  }

  // --- Canteen Report Analytics ---
  getCanteenSummary(schoolId: string, dateFilter?: string): CanteenReportSummary {
    const today = dateFilter || getTodayFormatted();
    const allOrders = this.data.orders.filter(o => o.schoolId === schoolId);
    const todayOrders = allOrders.filter(o => o.orderDate === today);

    const pendingOrdersCount = todayOrders.filter(o => o.orderStatus === 'paid_pending').length;
    const preparingOrdersCount = todayOrders.filter(o => o.orderStatus === 'preparing').length;
    const readyOrdersCount = todayOrders.filter(o => o.orderStatus === 'ready').length;
    const deliveredOrdersCount = todayOrders.filter(o => o.orderStatus === 'delivered').length;
    const cancelledOrdersCount = todayOrders.filter(o => o.orderStatus === 'cancelled').length;

    const todaySalesAmount = todayOrders
      .filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const schoolProducts = this.data.products.filter(p => p.schoolId === schoolId);
    const lowStockCount = schoolProducts.filter(p => p.stockQuantity <= 10 && p.activeStatus).length;

    // Donations stats
    let foodPoolDonated = 0;
    let foodPoolDistributed = 0;
    let foodPoolRemaining = 0;

    let eduDonated = 0;
    let eduDistributed = 0;
    let eduRemaining = 0;

    for (const don of this.data.donations.filter(d => d.schoolId === schoolId && d.paymentStatus === 'paid')) {
      for (const it of don.items) {
        if (don.donationType === 'food_pool') {
          foodPoolDonated += it.quantity;
          foodPoolDistributed += it.deliveredQuantity;
          foodPoolRemaining += it.remainingQuantity;
        } else {
          eduDonated += it.quantity;
          eduDistributed += it.deliveredQuantity;
          eduRemaining += it.remainingQuantity;
        }
      }
    }

    // Popular products today
    const prodMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of todayOrders.filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')) {
      for (const item of order.items) {
        const existing = prodMap.get(item.productId) || { name: item.productNameSnapshot, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
        prodMap.set(item.productId, existing);
      }
    }

    const popularProducts = Array.from(prodMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Break distribution
    const breakCounts = new Map<string, number>();
    for (const b of this.data.breaks.filter(br => br.schoolId === schoolId)) {
      breakCounts.set(b.name, 0);
    }
    for (const order of todayOrders.filter(o => o.orderStatus !== 'cancelled')) {
      const curr = breakCounts.get(order.breakNameSnapshot) || 0;
      breakCounts.set(order.breakNameSnapshot, curr + 1);
    }

    const breakDistribution = Array.from(breakCounts.entries()).map(([breakName, count]) => ({ breakName, count }));

    return {
      todayOrderCount: todayOrders.length,
      pendingOrdersCount,
      preparingOrdersCount,
      readyOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
      todaySalesAmount,
      lowStockCount,
      foodPoolDonatedItems: foodPoolDonated,
      foodPoolDistributedItems: foodPoolDistributed,
      foodPoolRemainingItems: foodPoolRemaining,
      educationDonatedItems: eduDonated,
      educationDistributedItems: eduDistributed,
      educationRemainingItems: eduRemaining,
      popularProducts,
      breakDistribution,
    };
  }
}

export const db = new Database();
