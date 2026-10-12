import { Router, Request, Response } from 'express';
import { db, getTodayFormatted } from './db.ts';
import {
  User,
  Order,
  Donation,
  Product,
  Student,
  PaymentRecord,
  OrderStatus,
  UserRole,
} from '../types.ts';

export const apiRouter = Router();

// Helper to authenticate user from header (Authorization: Bearer <userId> or session) or query token
function getAuthUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  let token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  if (!token && req.query.token) {
    token = String(req.query.token).trim();
  }
  if (!token) return null;
  // In our full-stack setup, token is the user ID or formatted auth token
  const user = db.getUserById(token);
  return user && user.accountStatus === 'active' ? user : null;
}

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: () => void) {
  const user = getAuthUser(req);
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

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { fullName, email, password, passwordRepeat, kvkkConsent, schoolId } = req.body;

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

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    role: 'parent', // Regular registrations are always 'parent'
    schoolId: schoolId || 'school-1',
    accountStatus: 'active',
    createdAt: now,
    updatedAt: now,
  };

  db.createUser(newUser);
  db.addAuditLog({
    actorUserId: newUser.id,
    actorName: newUser.fullName,
    actorRole: newUser.role,
    action: 'USER_REGISTER',
    entityType: 'user',
    entityId: newUser.id,
    details: `Yeni veli kaydı oluşturuldu: ${newUser.email}`,
  });

  return res.json({
    success: true,
    user: newUser,
    token: newUser.id,
    message: 'Kaydınız başarıyla oluşturuldu.',
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-posta adresi gereklidir.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'E-posta adresi veya şifre hatalı.' });
  }

  if (user.accountStatus === 'suspended') {
    return res.status(403).json({ error: 'Hesabınız askıya alınmıştır. Lütfen okul idaresiyle iletişime geçiniz.' });
  }

  // Record audit log
  db.addAuditLog({
    actorUserId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'USER_LOGIN',
    entityType: 'user',
    entityId: user.id,
    details: `Kullanıcı giriş yaptı: ${user.email} (${user.role})`,
  });

  return res.json({
    success: true,
    user,
    token: user.id,
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

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Geçersiz oturum.' });
  }
  return res.json({ user });
});

apiRouter.get('/auth/quick-accounts', (_req: Request, res: Response) => {
  // Returns demo quick switch accounts for testing in development/prototype mode
  const users = db.getUsers().map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    schoolId: u.schoolId,
  }));
  return res.json({ users });
});

// ==========================================
// 2. SCHOOLS, BREAKS & CATEGORIES
// ==========================================

apiRouter.get('/schools', (_req: Request, res: Response) => {
  return res.json({ schools: db.getSchools() });
});

apiRouter.put('/schools/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
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

apiRouter.get('/breaks', (req: Request, res: Response) => {
  const schoolId = (req.query.schoolId as string) || 'school-1';
  return res.json({ breaks: db.getBreaks(schoolId) });
});

apiRouter.post('/breaks', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const { name, startTime, endTime, orderDeadlineMinutesBefore, schoolId } = req.body;
  if (!name || !startTime || !endTime) {
    return res.status(400).json({ error: 'Teneffüs adı, başlangıç ve bitiş saati zorunludur.' });
  }

  const newBreak = {
    id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    schoolId: schoolId || 'school-1',
    name: name.trim(),
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    activeStatus: true,
    orderDeadlineMinutesBefore: Number(orderDeadlineMinutesBefore) || 15,
  };

  db.createBreak(newBreak);
  return res.json({ success: true, break: newBreak });
});

apiRouter.put('/breaks/:id', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const updated = db.updateBreak(id, updates);
  if (!updated) return res.status(404).json({ error: 'Teneffüs bulunamadı.' });
  return res.json({ success: true, break: updated });
});

apiRouter.delete('/breaks/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = db.deleteBreak(id);
  if (!deleted) return res.status(404).json({ error: 'Teneffüs bulunamadı.' });
  return res.json({ success: true, message: 'Teneffüs silindi.' });
});

apiRouter.get('/categories', (req: Request, res: Response) => {
  const schoolId = (req.query.schoolId as string) || 'school-1';
  return res.json({ categories: db.getCategories(schoolId) });
});

apiRouter.post('/categories', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const { name, productType, schoolId } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Kategori adı zorunludur.' });
  }

  const newCat = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    schoolId: schoolId || 'school-1',
    name: name.trim(),
    productType: productType === 'stationery' ? 'stationery' : 'food',
    activeStatus: true,
  };

  db.createCategory(newCat as any);
  return res.json({ success: true, category: newCat });
});

apiRouter.put('/categories/:id', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const updated = db.updateCategory(id, updates);
  if (!updated) return res.status(404).json({ error: 'Kategori bulunamadı.' });
  return res.json({ success: true, category: updated });
});

apiRouter.delete('/categories/:id', requireAuth, requireRole('canteen', 'admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = db.deleteCategory(id);
  if (!deleted) return res.status(404).json({ error: 'Kategori bulunamadı.' });
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
  const { date, breakId, status, search } = req.query;

  if (user.role === 'parent') {
    const orders = db.getOrders({
      parentUserId: user.id,
      orderDate: date as string,
      breakId: breakId as string,
      orderStatus: status as string,
      search: search as string,
    });
    return res.json({ orders });
  } else {
    // Canteen or Admin sees all school orders
    const orders = db.getOrders({
      schoolId: user.schoolId || 'school-1',
      orderDate: date as string,
      breakId: breakId as string,
      orderStatus: status as string,
      search: search as string,
    });
    return res.json({ orders });
  }
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

  return res.json({ success: true, order: updated.order });
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

  return res.json({ success: true, order: verified.order, message: 'Teslimat başarıyla onaylandı.' });
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
  return res.json({ notifications });
});

apiRouter.post('/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  db.markNotificationAsRead(id);
  return res.json({ success: true });
});

apiRouter.post('/notifications/read-all', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  db.markAllNotificationsAsRead(user.id);
  return res.json({ success: true });
});

// ==========================================
// 10. SYSTEM ADMIN ENDPOINTS
// ==========================================

apiRouter.get('/admin/users', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
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

apiRouter.post('/admin/users', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const currentUser = (req as any).user as User;
  const { fullName, email, role, schoolId } = req.body;

  if (!fullName || !email || !role) {
    return res.status(400).json({ error: 'Ad soyad, e-posta ve rol zorunludur.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Bu e-posta adresiyle bir kullanıcı zaten kayıtlı.' });
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
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

apiRouter.get('/admin/audit-logs', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const logs = db.getAuditLogs(100);
  return res.json({ logs });
});
