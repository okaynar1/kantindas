import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  TeacherProfile,
  CanteenProfile,
  ManagerProfile,
  StudentNeed,
  StudentNeedCode,
  SupportAllocation,
  SupportAllocationItem,
  SupportDelivery,
  SupportStatusHistory,
  InventoryMovement,
  ManagerReportSummary,
  StudentNeedType,
  StudentNeedStatus,
  SupportAllocationType,
  SupportSourceType,
  SupportAllocationStatus,
  PushSubscriptionRecord,
} from '../types.ts';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_kantincep_salt_2026').digest('hex');
}

export function verifyPassword(password: string, hash?: string): boolean {
  if (!hash) return false;
  return hashPassword(password) === hash;
}

export function generateNeedCode(): string {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KC-IHT-${rand}`;
}

export function generateAllocationNumber(): string {
  const d = new Date();
  const yearMonth = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `KC-THS-${yearMonth}-${rand}`;
}

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
  // New domain collections
  teacherProfiles: TeacherProfile[];
  canteenProfiles: CanteenProfile[];
  managerProfiles: ManagerProfile[];
  studentNeeds: StudentNeed[];
  studentNeedCodes: StudentNeedCode[];
  supportAllocations: SupportAllocation[];
  supportDeliveries: SupportDelivery[];
  supportStatusHistory: SupportStatusHistory[];
  inventoryMovements: InventoryMovement[];
  pushSubscriptions: PushSubscriptionRecord[];
}

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL_ENV
);

// In serverless environments (e.g. Vercel), project root is read-only.
// Writable storage is in /tmp.
const DB_DIR = isServerless
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');

const DB_FILE = path.join(DB_DIR, 'kantincep_db.json');
const SEED_FILE = path.resolve(process.cwd(), 'data', 'kantincep_db.json');

// Ensure database directory exists (safe for serverless and local)
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[DB] Could not create DB_DIR:', e);
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
      passwordHash: hashPassword('123456'),
      mustChangePassword: false,
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
      canteenUnit: 'Merkez Okul Kantini',
      passwordHash: hashPassword('123456'),
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'user-manager-1',
      fullName: 'Kemal Öztürk (Kurum Müdürü)',
      email: 'mudur@kantincep.com',
      role: 'manager',
      schoolId,
      accountStatus: 'active',
      phone: '0505 456 78 90',
      passwordHash: hashPassword('123456'),
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'user-teacher-1',
      fullName: 'Zehra Aydın (Danışman Öğretmen)',
      email: 'ogretmen@kantincep.com',
      role: 'teacher',
      schoolId,
      accountStatus: 'active',
      phone: '0542 333 44 55',
      titleOrBranch: 'Rehberlik & Psikolojik Danışmanlık',
      passwordHash: hashPassword('123456'),
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'user-admin-1',
      fullName: 'Sistem Yöneticisi',
      email: 'yonetici@kantincep.com',
      role: 'admin',
      schoolId,
      accountStatus: 'active',
      phone: '0505 111 22 33',
      passwordHash: hashPassword('123456'),
      mustChangePassword: false,
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

  const defaultTeacherProfiles: TeacherProfile[] = [
    {
      id: 'tprof-1',
      authUserId: 'user-teacher-1',
      schoolId,
      fullName: 'Zehra Aydın (Danışman Öğretmen)',
      email: 'ogretmen@kantincep.com',
      branch: 'Rehberlik & Psikolojik Danışmanlık',
      accountStatus: 'active',
      mustChangePassword: false,
      createdByManagerId: 'user-manager-1',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const defaultCanteenProfiles: CanteenProfile[] = [
    {
      id: 'cprof-1',
      authUserId: 'user-canteen-1',
      schoolId,
      fullName: 'Mehmet Usta',
      email: 'kantin@kantincep.com',
      canteenUnit: 'Merkez Okul Kantini',
      accountStatus: 'active',
      mustChangePassword: false,
      createdByManagerId: 'user-manager-1',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const defaultManagerProfiles: ManagerProfile[] = [
    {
      id: 'mprof-1',
      authUserId: 'user-manager-1',
      schoolId,
      fullName: 'Kemal Öztürk (Kurum Müdürü)',
      accountStatus: 'active',
      createdAt: now,
    },
  ];

  const defaultStudentNeeds: StudentNeed[] = [
    {
      id: 'need-1',
      schoolId,
      studentReferenceId: '1048',
      studentName: 'Emre Can',
      grade: '3. Sınıf',
      classroom: '3-C',
      needCodeReference: 'KC-IHT-7A2B41',
      needType: 'food',
      needDescription: 'Teneffüs saatlerinde sıcak beslenme ve içecek ihtiyacı',
      createdByTeacherId: 'user-teacher-1',
      createdByTeacherName: 'Zehra Aydın',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'need-2',
      schoolId,
      studentReferenceId: '892',
      studentName: 'Merve Demir',
      grade: '4. Sınıf',
      classroom: '4-A',
      needCodeReference: 'KC-IHT-9B4F12',
      needType: 'stationery',
      needDescription: 'Ders defteri, boya seti ve temel okul kırtasiye malzemeleri',
      createdByTeacherId: 'user-teacher-1',
      createdByTeacherName: 'Zehra Aydın',
      status: 'active',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
    },
  ];

  const defaultStudentNeedCodes: StudentNeedCode[] = [
    {
      id: 'code-1',
      schoolId,
      studentNeedId: 'need-1',
      needCode: 'KC-IHT-7A2B41',
      codeHash: hashPassword('KC-IHT-7A2B41'),
      codeStatus: 'active',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'code-2',
      schoolId,
      studentNeedId: 'need-2',
      needCode: 'KC-IHT-9B4F12',
      codeHash: hashPassword('KC-IHT-9B4F12'),
      codeStatus: 'active',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
  ];

  const defaultSupportAllocations: SupportAllocation[] = [
    {
      id: 'alloc-1',
      schoolId,
      studentNeedId: 'need-1',
      studentNameSnapshot: 'Emre Can',
      studentClassSnapshot: '3-C',
      allocationNumber: 'KC-THS-202610-001',
      needCodeReference: 'KC-IHT-7A2B41',
      supportType: 'food_pool',
      sourceType: 'parent_donation_pool',
      assignedByTeacherId: 'user-teacher-1',
      assignedByTeacherName: 'Zehra Aydın',
      status: 'ready_for_delivery',
      justificationNote: 'Öğle teneffüsü gıda desteği',
      validUntil: 'Bugün',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      items: [
        {
          id: 'item-alloc-1',
          allocationId: 'alloc-1',
          productId: 'prod-1',
          productNameSnapshot: 'Kaşarlı Tost (Tam Buğday)',
          quantityAllocated: 1,
          quantityDelivered: 0,
          quantityRemaining: 1,
          unitPriceSnapshot: 45,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'item-alloc-2',
          allocationId: 'alloc-1',
          productId: 'prod-11',
          productNameSnapshot: 'Doğal Köy Ayranı (200ml)',
          quantityAllocated: 1,
          quantityDelivered: 0,
          quantityRemaining: 1,
          unitPriceSnapshot: 18,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
    },
    {
      id: 'alloc-2',
      schoolId,
      studentNeedId: 'need-2',
      studentNameSnapshot: 'Merve Demir',
      studentClassSnapshot: '4-A',
      allocationNumber: 'KC-THS-202610-002',
      needCodeReference: 'KC-IHT-9B4F12',
      supportType: 'education_support',
      sourceType: 'parent_education_support',
      assignedByTeacherId: 'user-teacher-1',
      assignedByTeacherName: 'Zehra Aydın',
      status: 'ready_for_delivery',
      justificationNote: 'Matematik ve Türkçe dersi kırtasiye temini',
      validUntil: 'Bugün',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      items: [
        {
          id: 'item-alloc-3',
          allocationId: 'alloc-2',
          productId: 'prod-13',
          productNameSnapshot: 'Kareli Okul Defteri (80 Yaprak)',
          quantityAllocated: 1,
          quantityDelivered: 0,
          quantityRemaining: 1,
          unitPriceSnapshot: 35,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
  ];

  const defaultSupportDeliveries: SupportDelivery[] = [];

  const defaultSupportStatusHistory: SupportStatusHistory[] = [
    {
      id: 'shist-1',
      allocationId: 'alloc-1',
      previousStatus: 'product_allocated',
      newStatus: 'ready_for_delivery',
      changedByUserId: 'user-teacher-1',
      changedByName: 'Zehra Aydın',
      changeReason: 'Tahsis oluşturuldu ve kantin görevlisine teslimat için iletildi.',
      changedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'shist-2',
      allocationId: 'alloc-2',
      previousStatus: 'product_allocated',
      newStatus: 'ready_for_delivery',
      changedByUserId: 'user-teacher-1',
      changedByName: 'Zehra Aydın',
      changeReason: 'Eğitim desteği onaylandı ve kantin görevlisine iletildi.',
      changedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const defaultInventoryMovements: InventoryMovement[] = [
    {
      id: 'inv-1',
      schoolId,
      productId: 'prod-1',
      productName: 'Kaşarlı Tost (Tam Buğday)',
      movementType: 'allocation_reserved',
      sourceType: 'parent_donation_pool',
      sourceReferenceId: 'alloc-1',
      quantity: 1,
      performedByUserId: 'user-teacher-1',
      performedByName: 'Zehra Aydın',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
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
    teacherProfiles: defaultTeacherProfiles,
    canteenProfiles: defaultCanteenProfiles,
    managerProfiles: defaultManagerProfiles,
    studentNeeds: defaultStudentNeeds,
    studentNeedCodes: defaultStudentNeedCodes,
    supportAllocations: defaultSupportAllocations,
    supportDeliveries: defaultSupportDeliveries,
    supportStatusHistory: defaultSupportStatusHistory,
    inventoryMovements: defaultInventoryMovements,
    pushSubscriptions: [],
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
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (isServerless && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_FILE)) {
        try {
          fs.copyFileSync(SEED_FILE, DB_FILE);
        } catch (copyErr) {
          console.warn('[DB] Could not copy seed file to /tmp:', copyErr);
        }
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure new collections exist
        parsed.teacherProfiles = parsed.teacherProfiles || [];
        parsed.canteenProfiles = parsed.canteenProfiles || [];
        parsed.managerProfiles = parsed.managerProfiles || [];
        parsed.studentNeeds = parsed.studentNeeds || [];
        parsed.studentNeedCodes = parsed.studentNeedCodes || [];
        parsed.supportAllocations = parsed.supportAllocations || [];
        parsed.supportDeliveries = parsed.supportDeliveries || [];
        parsed.supportStatusHistory = parsed.supportStatusHistory || [];
        parsed.inventoryMovements = parsed.inventoryMovements || [];
        parsed.pushSubscriptions = parsed.pushSubscriptions || [];

        const initial = getInitialSeedData();
        // Ensure all required default users exist
        for (const u of initial.users) {
          const found = parsed.users.find((existing: User) => existing.id === u.id || existing.email.toLowerCase() === u.email.toLowerCase());
          if (!found) {
            parsed.users.push(u);
          } else {
            // Update role/password if needed
            if (!found.passwordHash) found.passwordHash = u.passwordHash;
            if (u.role === 'manager' && found.role !== 'manager') found.role = 'manager';
            if (u.role === 'teacher' && found.role !== 'teacher') found.role = 'teacher';
          }
        }
        for (const tp of initial.teacherProfiles) {
          if (!parsed.teacherProfiles.some((existing: TeacherProfile) => existing.id === tp.id)) {
            parsed.teacherProfiles.push(tp);
          }
        }
        for (const cp of initial.canteenProfiles) {
          if (!parsed.canteenProfiles.some((existing: CanteenProfile) => existing.id === cp.id)) {
            parsed.canteenProfiles.push(cp);
          }
        }
        for (const mp of initial.managerProfiles) {
          if (!parsed.managerProfiles.some((existing: ManagerProfile) => existing.id === mp.id)) {
            parsed.managerProfiles.push(mp);
          }
        }
        if (parsed.studentNeeds.length === 0) {
          parsed.studentNeeds = initial.studentNeeds;
          parsed.studentNeedCodes = initial.studentNeedCodes;
          parsed.supportAllocations = initial.supportAllocations;
          parsed.supportStatusHistory = initial.supportStatusHistory;
          parsed.inventoryMovements = initial.inventoryMovements;
        }

        this.writeToDisk(parsed);
        return parsed;
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
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
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
  ): { success: boolean; order?: Order; error?: string; notification?: NotificationItem } {
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

    // Notify parent ONLY when delivery is completed or cancelled
    let notification: NotificationItem | undefined;

    if (newStatus === 'delivered') {
      const deliveryEventId = `deliv-order-${order.id}`;
      // Deduplication check: check if notification with this deliveryEventId already exists
      const existing = this.data.notifications.find(n => n.deliveryEventId === deliveryEventId);
      if (existing) {
        notification = existing;
      } else {
        notification = this.createNotification({
          userId: order.parentUserId,
          title: 'KantinCep – Teslimat Bilgilendirmesi',
          message: 'Beslenme siparişiniz öğrenciye teslim edilmiştir. İyi günler dileriz.',
          type: 'delivery',
          linkUrl: `/orders/${order.id}`,
          orderId: order.id,
          deliveryEventId,
          studentNameSnapshot: order.studentNameSnapshot,
        });
      }
    } else if (newStatus === 'cancelled') {
      notification = this.createNotification({
        userId: order.parentUserId,
        title: 'Sipariş İptal Edildi ❌',
        message: `${order.orderNumber} numaralı sipariş iptal edildi. İade tutarı bakiyenize/kartınıza yansıtılacaktır.`,
        type: 'order',
        linkUrl: `/orders/${order.id}`,
        orderId: order.id,
      });
    }

    this.writeToDisk();
    return { success: true, order, notification };
  }

  verifyOrderDelivery(orderId: string, deliveryCode: string, changedBy: { id: string; name: string; role: any }): { success: boolean; order?: Order; error?: string; notification?: NotificationItem } {
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
    // Idempotency: prevent duplicate delivery notifications for the same deliveryEventId
    if (notif.deliveryEventId) {
      const existing = this.data.notifications.find(n => n.deliveryEventId === notif.deliveryEventId);
      if (existing) {
        return existing;
      }
    }

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

  // --- Web Push / FCM Subscriptions ---
  savePushSubscription(sub: Omit<PushSubscriptionRecord, 'id' | 'createdAt' | 'updatedAt'>): PushSubscriptionRecord {
    const existing = this.data.pushSubscriptions.find(
      s => s.userId === sub.userId && s.endpoint === sub.endpoint
    );
    const now = new Date().toISOString();
    if (existing) {
      if (sub.auth) existing.auth = sub.auth;
      if (sub.p256dh) existing.p256dh = sub.p256dh;
      if (sub.fcmToken) existing.fcmToken = sub.fcmToken;
      if (sub.userAgent) existing.userAgent = sub.userAgent;
      existing.updatedAt = now;
      this.writeToDisk();
      return existing;
    }

    const newRecord: PushSubscriptionRecord = {
      id: `psub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...sub,
      createdAt: now,
      updatedAt: now,
    };
    this.data.pushSubscriptions.push(newRecord);
    this.writeToDisk();
    return newRecord;
  }

  getPushSubscriptions(userId: string): PushSubscriptionRecord[] {
    return this.data.pushSubscriptions.filter(s => s.userId === userId);
  }

  removePushSubscription(endpoint: string): boolean {
    const prev = this.data.pushSubscriptions.length;
    this.data.pushSubscriptions = this.data.pushSubscriptions.filter(s => s.endpoint !== endpoint);
    if (this.data.pushSubscriptions.length !== prev) {
      this.writeToDisk();
      return true;
    }
    return false;
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

  // ====================================================
  // Teacher & Canteen Profiles and Password Management
  // ====================================================

  getTeacherProfiles(schoolId?: string): TeacherProfile[] {
    return schoolId
      ? this.data.teacherProfiles.filter(t => t.schoolId === schoolId)
      : this.data.teacherProfiles;
  }

  createTeacher(data: {
    fullName: string;
    email: string;
    schoolId: string;
    branch?: string;
    tempPassword?: string;
    createdByManagerId?: string;
  }): { user: User; profile: TeacherProfile; tempPassword: string } {
    const now = new Date().toISOString();
    const tempPass = data.tempPassword || Math.random().toString(36).substring(2, 8) + 'KC!';
    const userId = `user-teacher-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const user: User = {
      id: userId,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      role: 'teacher',
      schoolId: data.schoolId,
      accountStatus: 'active',
      mustChangePassword: true,
      titleOrBranch: data.branch?.trim() || 'Danışman Öğretmen',
      createdByManagerId: data.createdByManagerId,
      passwordHash: hashPassword(tempPass),
      createdAt: now,
      updatedAt: now,
    };

    const profile: TeacherProfile = {
      id: `tprof-${Date.now()}`,
      authUserId: userId,
      schoolId: data.schoolId,
      fullName: user.fullName,
      email: user.email,
      branch: user.titleOrBranch,
      accountStatus: 'active',
      mustChangePassword: true,
      createdByManagerId: data.createdByManagerId,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users.push(user);
    this.data.teacherProfiles.push(profile);
    this.writeToDisk();

    return { user, profile, tempPassword: tempPass };
  }

  updateTeacherProfile(id: string, updates: Partial<TeacherProfile>): TeacherProfile | undefined {
    const idx = this.data.teacherProfiles.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.data.teacherProfiles[idx] = { ...this.data.teacherProfiles[idx], ...updates, updatedAt: new Date().toISOString() };
    // sync with user if needed
    const userIdx = this.data.users.findIndex(u => u.id === this.data.teacherProfiles[idx].authUserId);
    if (userIdx !== -1) {
      if (updates.accountStatus) this.data.users[userIdx].accountStatus = updates.accountStatus;
      if (updates.fullName) this.data.users[userIdx].fullName = updates.fullName;
    }
    this.writeToDisk();
    return this.data.teacherProfiles[idx];
  }

  getCanteenProfiles(schoolId?: string): CanteenProfile[] {
    return schoolId
      ? this.data.canteenProfiles.filter(c => c.schoolId === schoolId)
      : this.data.canteenProfiles;
  }

  createCanteenProfile(data: {
    fullName: string;
    email: string;
    schoolId: string;
    canteenUnit?: string;
    tempPassword?: string;
    createdByManagerId?: string;
  }): { user: User; profile: CanteenProfile; tempPassword: string } {
    const now = new Date().toISOString();
    const tempPass = data.tempPassword || Math.random().toString(36).substring(2, 8) + 'KC!';
    const userId = `user-canteen-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const user: User = {
      id: userId,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      role: 'canteen',
      schoolId: data.schoolId,
      accountStatus: 'active',
      mustChangePassword: true,
      canteenUnit: data.canteenUnit?.trim() || 'Merkez Okul Kantini',
      createdByManagerId: data.createdByManagerId,
      passwordHash: hashPassword(tempPass),
      createdAt: now,
      updatedAt: now,
    };

    const profile: CanteenProfile = {
      id: `cprof-${Date.now()}`,
      authUserId: userId,
      schoolId: data.schoolId,
      fullName: user.fullName,
      email: user.email,
      canteenUnit: user.canteenUnit,
      accountStatus: 'active',
      mustChangePassword: true,
      createdByManagerId: data.createdByManagerId,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users.push(user);
    this.data.canteenProfiles.push(profile);
    this.writeToDisk();

    return { user, profile, tempPassword: tempPass };
  }

  updateCanteenProfile(id: string, updates: Partial<CanteenProfile>): CanteenProfile | undefined {
    const idx = this.data.canteenProfiles.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.canteenProfiles[idx] = { ...this.data.canteenProfiles[idx], ...updates, updatedAt: new Date().toISOString() };
    const userIdx = this.data.users.findIndex(u => u.id === this.data.canteenProfiles[idx].authUserId);
    if (userIdx !== -1) {
      if (updates.accountStatus) this.data.users[userIdx].accountStatus = updates.accountStatus;
      if (updates.fullName) this.data.users[userIdx].fullName = updates.fullName;
    }
    this.writeToDisk();
    return this.data.canteenProfiles[idx];
  }

  setTempPassword(userId: string, tempPass: string): boolean {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return false;
    user.passwordHash = hashPassword(tempPass);
    user.mustChangePassword = true;
    user.updatedAt = new Date().toISOString();

    const tProf = this.data.teacherProfiles.find(t => t.authUserId === userId);
    if (tProf) tProf.mustChangePassword = true;

    const cProf = this.data.canteenProfiles.find(c => c.authUserId === userId);
    if (cProf) cProf.mustChangePassword = true;

    this.writeToDisk();
    return true;
  }

  changePassword(userId: string, newPass: string): { success: boolean; message: string } {
    if (!newPass || newPass.length < 6) {
      return { success: false, message: 'Şifre en az 6 karakter olmalıdır.' };
    }
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'Kullanıcı bulunamadı.' };

    user.passwordHash = hashPassword(newPass);
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();

    const tProf = this.data.teacherProfiles.find(t => t.authUserId === userId);
    if (tProf) tProf.mustChangePassword = false;

    const cProf = this.data.canteenProfiles.find(c => c.authUserId === userId);
    if (cProf) cProf.mustChangePassword = false;

    this.writeToDisk();
    return { success: true, message: 'Şifreniz başarıyla güncellendi.' };
  }

  // ====================================================
  // Student Needs & Need Codes
  // ====================================================

  getStudentNeeds(schoolId?: string, filter?: { teacherId?: string; status?: StudentNeedStatus; needType?: StudentNeedType }): StudentNeed[] {
    return this.data.studentNeeds.filter(n => {
      if (schoolId && n.schoolId !== schoolId) return false;
      if (filter?.teacherId && n.createdByTeacherId !== filter.teacherId) return false;
      if (filter?.status && n.status !== filter.status) return false;
      if (filter?.needType && n.needType !== filter.needType) return false;
      return true;
    });
  }

  getStudentNeedById(id: string): StudentNeed | undefined {
    return this.data.studentNeeds.find(n => n.id === id);
  }

  createStudentNeed(data: {
    schoolId: string;
    studentReferenceId: string;
    studentName: string;
    grade: string;
    classroom: string;
    needType: StudentNeedType;
    needDescription: string;
    teacherId: string;
    teacherName: string;
  }): { success: boolean; need?: StudentNeed; needCode?: string; error?: string } {
    const cleanRef = data.studentReferenceId.trim();
    // Check duplicate active need for same student and same needType
    const duplicate = this.data.studentNeeds.some(
      n =>
        n.schoolId === data.schoolId &&
        n.studentReferenceId.toLowerCase() === cleanRef.toLowerCase() &&
        n.status === 'active' &&
        (n.needType === data.needType || data.needType === 'both' || n.needType === 'both')
    );

    if (duplicate) {
      return {
        success: false,
        error: `Bu öğrenci (${cleanRef}) için "${data.needType === 'food' ? 'Yiyecek' : data.needType === 'stationery' ? 'Kırtasiye' : 'Benzer'}" türünde aktif bir ihtiyaç kaydı zaten mevcut.`,
      };
    }

    const now = new Date().toISOString();
    const needCode = generateNeedCode();
    const needId = `need-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const need: StudentNeed = {
      id: needId,
      schoolId: data.schoolId,
      studentReferenceId: cleanRef,
      studentName: data.studentName.trim(),
      grade: data.grade.trim(),
      classroom: data.classroom.trim(),
      needCodeReference: needCode,
      needType: data.needType,
      needDescription: data.needDescription.trim(),
      createdByTeacherId: data.teacherId,
      createdByTeacherName: data.teacherName,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const codeRecord: StudentNeedCode = {
      id: `code-${Date.now()}`,
      schoolId: data.schoolId,
      studentNeedId: needId,
      needCode,
      codeHash: hashPassword(needCode),
      codeStatus: 'active',
      createdAt: now,
    };

    this.data.studentNeeds.unshift(need);
    this.data.studentNeedCodes.unshift(codeRecord);
    this.writeToDisk();

    return { success: true, need, needCode };
  }

  renewNeedCode(needId: string, teacherId: string): { success: boolean; newCode?: string; error?: string } {
    const need = this.data.studentNeeds.find(n => n.id === needId);
    if (!need) return { success: false, error: 'İhtiyaç kaydı bulunamadı.' };

    const oldCode = need.needCodeReference;
    const oldCodeRecord = this.data.studentNeedCodes.find(c => c.studentNeedId === needId && c.needCode === oldCode);
    if (oldCodeRecord) {
      oldCodeRecord.codeStatus = 'revoked';
      oldCodeRecord.revokedAt = new Date().toISOString();
    }

    const newCode = generateNeedCode();
    need.needCodeReference = newCode;
    need.updatedAt = new Date().toISOString();

    // Also update any active pending allocation with this studentNeedId
    for (const alloc of this.data.supportAllocations.filter(a => a.studentNeedId === needId && a.status !== 'fully_delivered')) {
      alloc.needCodeReference = newCode;
      alloc.updatedAt = new Date().toISOString();
    }

    const newCodeRecord: StudentNeedCode = {
      id: `code-${Date.now()}`,
      schoolId: need.schoolId,
      studentNeedId: needId,
      needCode: newCode,
      codeHash: hashPassword(newCode),
      codeStatus: 'active',
      createdAt: new Date().toISOString(),
    };

    this.data.studentNeedCodes.unshift(newCodeRecord);
    this.writeToDisk();

    return { success: true, newCode };
  }

  cancelStudentNeed(needId: string, teacherId: string): { success: boolean; error?: string } {
    const need = this.data.studentNeeds.find(n => n.id === needId);
    if (!need) return { success: false, error: 'İhtiyaç kaydı bulunamadı.' };

    need.status = 'cancelled';
    need.updatedAt = new Date().toISOString();

    const codeRecord = this.data.studentNeedCodes.find(c => c.studentNeedId === needId && c.needCode === need.needCodeReference);
    if (codeRecord) {
      codeRecord.codeStatus = 'revoked';
      codeRecord.revokedAt = new Date().toISOString();
    }

    this.writeToDisk();
    return { success: true };
  }

  getStudentNeedCodes(schoolId?: string): StudentNeedCode[] {
    return schoolId
      ? this.data.studentNeedCodes.filter(c => c.schoolId === schoolId)
      : this.data.studentNeedCodes;
  }

  // ====================================================
  // Support Allocations (Dayanışma Havuzu & Eğitim Desteği)
  // ====================================================

  getSupportAllocations(schoolId?: string, filter?: { supportType?: SupportAllocationType; status?: SupportAllocationStatus; teacherId?: string; id?: string }): SupportAllocation[] {
    return this.data.supportAllocations.filter(a => {
      if (schoolId && a.schoolId !== schoolId) return false;
      if (filter?.id && a.id !== filter.id) return false;
      if (filter?.supportType && a.supportType !== filter.supportType) return false;
      if (filter?.status && a.status !== filter.status) return false;
      if (filter?.teacherId && a.assignedByTeacherId !== filter.teacherId) return false;
      return true;
    });
  }

  getAllocationById(id: string): SupportAllocation | undefined {
    return this.data.supportAllocations.find(a => a.id === id);
  }

  getAllocationsByNeedCode(schoolId: string, needCode: string): SupportAllocation[] {
    const clean = needCode.trim().toUpperCase();
    return this.data.supportAllocations.filter(
      a => a.schoolId === schoolId && a.needCodeReference.toUpperCase() === clean
    );
  }

  getAvailableDonationStock(schoolId: string, supportType: SupportAllocationType): {
    productId: string;
    productName: string;
    availableQuantity: number;
    unitPrice: number;
    categoryName: string;
  }[] {
    const targetDonationType = supportType === 'food_pool' ? 'food_pool' : 'education_support';
    const schoolDonations = this.data.donations.filter(
      d => d.schoolId === schoolId && d.donationType === targetDonationType && d.paymentStatus === 'paid'
    );

    // Count available remaining quantity per product from donations
    const map = new Map<string, { productName: string; availableQuantity: number; unitPrice: number; categoryName: string }>();

    for (const don of schoolDonations) {
      for (const item of don.items) {
        if (item.remainingQuantity > 0) {
          const existing = map.get(item.productId) || {
            productName: item.productNameSnapshot,
            availableQuantity: 0,
            unitPrice: item.unitPriceSnapshot,
            categoryName: supportType === 'food_pool' ? 'Kantin Gıda Havuzu' : 'Eğitime Destek Kırtasiye',
          };
          existing.availableQuantity += item.remainingQuantity;
          map.set(item.productId, existing);
        }
      }
    }

    // Also include canteen products of matching type with fallback stock
    const matchingProducts = this.data.products.filter(
      p => p.schoolId === schoolId && p.activeStatus && (supportType === 'food_pool' ? p.productType === 'food' : p.productType === 'stationery')
    );

    for (const prod of matchingProducts) {
      if (!map.has(prod.id)) {
        // If no direct donation but product exists in school inventory, show available stock
        map.set(prod.id, {
          productName: prod.name,
          availableQuantity: prod.stockQuantity,
          unitPrice: prod.price,
          categoryName: supportType === 'food_pool' ? 'Kantin Satış Stoğu' : 'Kırtasiye Stoğu',
        });
      }
    }

    return Array.from(map.entries()).map(([productId, data]) => ({
      productId,
      ...data,
    }));
  }

  createSupportAllocation(data: {
    schoolId: string;
    studentNeedId: string;
    supportType: SupportAllocationType;
    sourceType: SupportSourceType;
    teacherId: string;
    teacherName: string;
    items: { productId: string; quantity: number }[];
    justificationNote?: string;
    validUntil?: string;
  }): { success: boolean; allocation?: SupportAllocation; error?: string } {
    const need = this.data.studentNeeds.find(n => n.id === data.studentNeedId);
    if (!need) return { success: false, error: 'Öğrenci ihtiyaç kaydı bulunamadı.' };
    if (need.status !== 'active') return { success: false, error: 'İhtiyaç kaydı aktif değil.' };

    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'En az bir ürün seçilmelidir.' };
    }

    // Check availability for all items
    const targetDonationType = data.supportType === 'food_pool' ? 'food_pool' : 'education_support';
    const schoolDonations = this.data.donations.filter(
      d => d.schoolId === data.schoolId && d.donationType === targetDonationType && d.paymentStatus === 'paid'
    );

    for (const reqItem of data.items) {
      if (reqItem.quantity <= 0) return { success: false, error: 'Ürün adedi 1 veya daha fazla olmalıdır.' };

      let availableFromDonations = 0;
      for (const don of schoolDonations) {
        const di = don.items.find(i => i.productId === reqItem.productId);
        if (di) availableFromDonations += di.remainingQuantity;
      }

      const prod = this.data.products.find(p => p.id === reqItem.productId);
      const totalAvailable = availableFromDonations > 0 ? availableFromDonations : (prod?.stockQuantity || 0);

      if (totalAvailable < reqItem.quantity) {
        return {
          success: false,
          error: `"${prod?.name || 'Seçilen ürün'}" için yeterli bağış veya stok bakiyesi bulunmuyor. Mevcut: ${totalAvailable}, İstenen: ${reqItem.quantity}`,
        };
      }
    }

    const now = new Date().toISOString();
    const allocId = `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const allocNumber = generateAllocationNumber();

    // Deduct / reserve quantities from donations or inventory
    const allocationItems: SupportAllocationItem[] = [];

    for (const reqItem of data.items) {
      const prod = this.data.products.find(p => p.id === reqItem.productId);
      const unitPrice = prod?.price || 0;
      const prodName = prod?.name || 'Ürün';

      let neededToReserve = reqItem.quantity;
      for (const don of schoolDonations) {
        const di = don.items.find(i => i.productId === reqItem.productId);
        if (di && di.remainingQuantity > 0) {
          const deduct = Math.min(di.remainingQuantity, neededToReserve);
          di.allocatedQuantity += deduct;
          di.remainingQuantity -= deduct;
          neededToReserve -= deduct;
          if (neededToReserve === 0) break;
        }
      }

      // If still needed and from inventory
      if (neededToReserve > 0 && prod) {
        prod.stockQuantity = Math.max(0, prod.stockQuantity - neededToReserve);
      }

      allocationItems.push({
        id: `item-alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        allocationId: allocId,
        productId: reqItem.productId,
        productNameSnapshot: prodName,
        quantityAllocated: reqItem.quantity,
        quantityDelivered: 0,
        quantityRemaining: reqItem.quantity,
        unitPriceSnapshot: unitPrice,
        createdAt: now,
      });

      // Record inventory movement
      this.data.inventoryMovements.push({
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        schoolId: data.schoolId,
        productId: reqItem.productId,
        productName: prodName,
        movementType: 'allocation_reserved',
        sourceType: data.sourceType,
        sourceReferenceId: allocId,
        quantity: reqItem.quantity,
        performedByUserId: data.teacherId,
        performedByName: data.teacherName,
        createdAt: now,
      });
    }

    const allocation: SupportAllocation = {
      id: allocId,
      schoolId: data.schoolId,
      studentNeedId: need.id,
      studentNameSnapshot: need.studentName,
      studentClassSnapshot: `${need.grade} / ${need.classroom}`,
      allocationNumber: allocNumber,
      needCodeReference: need.needCodeReference,
      supportType: data.supportType,
      sourceType: data.sourceType,
      assignedByTeacherId: data.teacherId,
      assignedByTeacherName: data.teacherName,
      status: 'ready_for_delivery',
      justificationNote: data.justificationNote?.trim() || (data.supportType === 'food_pool' ? 'Yiyecek desteği tahsisi' : 'Kırtasiye desteği tahsisi'),
      validUntil: data.validUntil || 'Bugün',
      createdAt: now,
      updatedAt: now,
      items: allocationItems,
    };

    // Status history
    this.data.supportStatusHistory.push({
      id: `shist-${Date.now()}`,
      allocationId: allocId,
      previousStatus: 'product_allocated',
      newStatus: 'ready_for_delivery',
      changedByUserId: data.teacherId,
      changedByName: data.teacherName,
      changeReason: 'Tahsis oluşturuldu ve kantin görevlisine teslimat için iletildi.',
      changedAt: now,
    });

    this.data.supportAllocations.unshift(allocation);

    // Notify canteen users
    const canteenUsers = this.data.users.filter(u => u.schoolId === data.schoolId && u.role === 'canteen');
    for (const cu of canteenUsers) {
      this.createNotification({
        userId: cu.id,
        title: `Yeni Destek Tahsisi (${data.supportType === 'food_pool' ? 'Dayanışma Havuzu' : 'Eğitim Desteği'}) 🎁`,
        message: `${need.studentName} (${need.grade}/${need.classroom}) için yeni destek tahsisi yapıldı. Tahsis No: ${allocNumber}`,
        type: 'donation',
      });
    }

    this.writeToDisk();
    return { success: true, allocation };
  }

  cancelSupportAllocation(allocationId: string, userId: string, userName: string, reason: string): { success: boolean; error?: string } {
    const alloc = this.data.supportAllocations.find(a => a.id === allocationId);
    if (!alloc) return { success: false, error: 'Tahsis kaydı bulunamadı.' };

    if (alloc.status === 'fully_delivered' || alloc.status === 'partially_delivered') {
      return { success: false, error: 'Teslim edilmiş bir tahsis kaydı iptal edilemez veya silinemez.' };
    }

    if (alloc.status === 'cancelled') {
      return { success: false, error: 'Tahsis zaten iptal edilmiş.' };
    }

    const now = new Date().toISOString();
    const previousStatus = alloc.status;
    alloc.status = 'cancelled';
    alloc.cancelledReason = reason || 'Öğretmen tarafından iptal edildi.';
    alloc.cancelledAt = now;
    alloc.cancelledByUserId = userId;
    alloc.updatedAt = now;

    // Restore reserved quantities to donations or inventory
    const targetDonationType = alloc.supportType === 'food_pool' ? 'food_pool' : 'education_support';
    const schoolDonations = this.data.donations.filter(
      d => d.schoolId === alloc.schoolId && d.donationType === targetDonationType && d.paymentStatus === 'paid'
    );

    for (const item of alloc.items) {
      let toRestore = item.quantityRemaining;
      for (const don of schoolDonations) {
        const di = don.items.find(i => i.productId === item.productId);
        if (di && di.allocatedQuantity > 0) {
          const restored = Math.min(di.allocatedQuantity, toRestore);
          di.allocatedQuantity -= restored;
          di.remainingQuantity += restored;
          toRestore -= restored;
          if (toRestore === 0) break;
        }
      }

      if (toRestore > 0) {
        const prod = this.data.products.find(p => p.id === item.productId);
        if (prod) prod.stockQuantity += toRestore;
      }

      this.data.inventoryMovements.push({
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        schoolId: alloc.schoolId,
        productId: item.productId,
        productName: item.productNameSnapshot,
        movementType: 'allocation_cancelled',
        sourceType: alloc.sourceType,
        sourceReferenceId: alloc.id,
        quantity: item.quantityRemaining,
        performedByUserId: userId,
        performedByName: userName,
        createdAt: now,
      });
    }

    this.data.supportStatusHistory.push({
      id: `shist-${Date.now()}`,
      allocationId: alloc.id,
      previousStatus,
      newStatus: 'cancelled',
      changedByUserId: userId,
      changedByName: userName,
      changeReason: reason || 'Tahsis iptal edildi ve ayrılan stok iade edildi.',
      changedAt: now,
    });

    this.writeToDisk();
    return { success: true };
  }

  deliverSupportAllocation(params: {
    allocationId: string;
    schoolId: string;
    canteenUserId: string;
    canteenUserName: string;
    verificationCode: string;
    notes?: string;
  }): { success: boolean; message: string; allocation?: SupportAllocation; notification?: NotificationItem } {
    const alloc = this.data.supportAllocations.find(a => a.id === params.allocationId);
    if (!alloc) return { success: false, message: 'Tahsis kaydı bulunamadı.' };

    if (alloc.schoolId !== params.schoolId) {
      return { success: false, message: 'Bu tahsis sizin yetkili olduğunuz okula ait değil.' };
    }

    if (alloc.status === 'fully_delivered') {
      return { success: false, message: 'Bu tahsis daha önce teslim edilmiştir. Mükerrer teslimat engellendi.' };
    }

    if (alloc.status === 'cancelled') {
      return { success: false, message: 'Bu tahsis iptal edilmiştir, teslim edilemez.' };
    }

    // Verify need code
    const cleanEntered = params.verificationCode.trim().toUpperCase();
    if (alloc.needCodeReference.toUpperCase() !== cleanEntered) {
      return { success: false, message: 'Girilen ihtiyaç kodu bu tahsisle uyuşmuyor.' };
    }

    const now = new Date().toISOString();
    const previousStatus = alloc.status;
    alloc.status = 'fully_delivered';
    alloc.deliveredAt = now;
    alloc.deliveredByCanteenUserId = params.canteenUserId;
    alloc.deliveredByCanteenName = params.canteenUserName;
    alloc.updatedAt = now;

    let totalDeliveredQty = 0;
    const itemsList: string[] = [];
    for (const item of alloc.items) {
      item.quantityDelivered = item.quantityAllocated;
      item.quantityRemaining = 0;
      totalDeliveredQty += item.quantityAllocated;
      itemsList.push(`${item.quantityAllocated}x ${item.productNameSnapshot}`);

      // Update parent donation delivered counts
      const targetDonationType = alloc.supportType === 'food_pool' ? 'food_pool' : 'education_support';
      const schoolDonations = this.data.donations.filter(
        d => d.schoolId === alloc.schoolId && d.donationType === targetDonationType && d.paymentStatus === 'paid'
      );
      for (const don of schoolDonations) {
        const di = don.items.find(i => i.productId === item.productId);
        if (di && di.allocatedQuantity > 0) {
          const qty = Math.min(di.allocatedQuantity, item.quantityAllocated);
          di.allocatedQuantity -= qty;
          di.deliveredQuantity += qty;
        }
      }

      this.data.inventoryMovements.push({
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        schoolId: alloc.schoolId,
        productId: item.productId,
        productName: item.productNameSnapshot,
        movementType: 'allocation_delivered',
        sourceType: alloc.sourceType,
        sourceReferenceId: alloc.id,
        quantity: item.quantityAllocated,
        performedByUserId: params.canteenUserId,
        performedByName: params.canteenUserName,
        createdAt: now,
      });
    }

    // Delivery record
    const deliveryRecord: SupportDelivery = {
      id: `deliv-${Date.now()}`,
      allocationId: alloc.id,
      schoolId: alloc.schoolId,
      deliveredByCanteenUserId: params.canteenUserId,
      deliveredByCanteenName: params.canteenUserName,
      verificationReference: cleanEntered,
      deliveryStatus: 'complete',
      quantityDelivered: totalDeliveredQty,
      notes: params.notes,
      deliveredAt: now,
      createdAt: now,
    };
    this.data.supportDeliveries.unshift(deliveryRecord);

    // Status history
    this.data.supportStatusHistory.push({
      id: `shist-${Date.now()}`,
      allocationId: alloc.id,
      previousStatus,
      newStatus: 'fully_delivered',
      changedByUserId: params.canteenUserId,
      changedByName: params.canteenUserName,
      changeReason: `İhtiyaç kodu (${cleanEntered}) doğrulanarak teslim edildi.`,
      changedAt: now,
    });

    // Notify the assigning advisor teacher automatically and reliably
    const isFood = alloc.supportType === 'food_pool';
    const itemsSummary = itemsList.join(', ');
    const title = isFood
      ? 'Dayanışma Havuzu – Teslimat Bilgilendirmesi'
      : 'Eğitim Desteği – Teslimat Bilgilendirmesi';

    const message = isFood
      ? `Dayanışma Havuzu kapsamında tahsis edilen destek ürünü (${itemsSummary}) öğrenciye teslim edildi.`
      : `Eğitim Desteği kapsamında tahsis edilen materyal (${itemsSummary}) öğrenciye teslim edildi.`;

    const targetTeacherId = alloc.assignedByTeacherId || this.data.studentNeeds.find(n => n.id === alloc.studentNeedId)?.createdByTeacherId;
    const deliveryEventId = `deliv-alloc-${alloc.id}`;

    let notification: NotificationItem | undefined;
    if (targetTeacherId) {
      notification = this.createNotification({
        userId: targetTeacherId,
        title,
        message,
        type: 'support_delivery',
        linkUrl: `/teacher/allocations?id=${alloc.id}`,
        deliveryEventId,
        allocationId: alloc.id,
        studentNeedId: alloc.studentNeedId,
        supportType: alloc.supportType,
        itemsSummary,
      });
    }

    this.writeToDisk();
    return {
      success: true,
      message: 'Ürünler öğrenciye başarıyla teslim edildi ve danışman öğretmene bildirim iletildi.',
      allocation: alloc,
      notification,
    };
  }

  // ====================================================
  // Manager Reports & Statistics
  // ====================================================

  getManagerReports(schoolId: string): ManagerReportSummary {
    const schoolNeeds = this.data.studentNeeds.filter(n => n.schoolId === schoolId);
    const schoolAllocations = this.data.supportAllocations.filter(a => a.schoolId === schoolId);

    const totalStudentsInNeed = new Set(schoolNeeds.map(n => n.studentReferenceId)).size;
    const activeNeedsCount = schoolNeeds.filter(n => n.status === 'active').length;
    const fulfilledNeedsCount = schoolNeeds.filter(n => n.status === 'fulfilled').length;

    let foodPoolAllocatedItems = 0;
    let foodPoolDeliveredItems = 0;
    let educationAllocatedItems = 0;
    let educationDeliveredItems = 0;

    for (const alloc of schoolAllocations) {
      for (const it of alloc.items) {
        if (alloc.supportType === 'food_pool') {
          foodPoolAllocatedItems += it.quantityAllocated;
          foodPoolDeliveredItems += it.quantityDelivered;
        } else {
          educationAllocatedItems += it.quantityAllocated;
          educationDeliveredItems += it.quantityDelivered;
        }
      }
    }

    let foodPoolRemainingDonations = 0;
    let educationRemainingDonations = 0;
    for (const don of this.data.donations.filter(d => d.schoolId === schoolId && d.paymentStatus === 'paid')) {
      for (const it of don.items) {
        if (don.donationType === 'food_pool') {
          foodPoolRemainingDonations += it.remainingQuantity;
        } else {
          educationRemainingDonations += it.remainingQuantity;
        }
      }
    }

    const pendingDeliveriesCount = schoolAllocations.filter(
      a => a.status === 'ready_for_delivery' || a.status === 'sent_to_canteen'
    ).length;

    // Teacher stats
    const teacherMap = new Map<string, { teacherName: string; needsCreated: number; allocationsCount: number }>();
    for (const n of schoolNeeds) {
      const existing = teacherMap.get(n.createdByTeacherId) || {
        teacherName: n.createdByTeacherName,
        needsCreated: 0,
        allocationsCount: 0,
      };
      existing.needsCreated += 1;
      teacherMap.set(n.createdByTeacherId, existing);
    }
    for (const a of schoolAllocations) {
      const existing = teacherMap.get(a.assignedByTeacherId) || {
        teacherName: a.assignedByTeacherName,
        needsCreated: 0,
        allocationsCount: 0,
      };
      existing.allocationsCount += 1;
      teacherMap.set(a.assignedByTeacherId, existing);
    }

    const teacherStats = Array.from(teacherMap.entries()).map(([teacherId, stats]) => ({
      teacherId,
      teacherName: stats.teacherName,
      needsCreated: stats.needsCreated,
      allocationsCount: stats.allocationsCount,
    }));

    return {
      totalStudentsInNeed,
      activeNeedsCount,
      fulfilledNeedsCount,
      foodPoolAllocatedItems,
      foodPoolDeliveredItems,
      foodPoolRemainingDonations,
      educationAllocatedItems,
      educationDeliveredItems,
      educationRemainingDonations,
      pendingDeliveriesCount,
      teacherStats,
      recentAllocations: schoolAllocations.slice(0, 10),
    };
  }

  getInventoryMovements(schoolId: string): InventoryMovement[] {
    return this.data.inventoryMovements.filter(i => i.schoolId === schoolId);
  }

  getSupportStatusHistory(allocationId: string): SupportStatusHistory[] {
    return this.data.supportStatusHistory.filter(h => h.allocationId === allocationId);
  }
}

export const db = new Database();
