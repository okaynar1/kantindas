import {
  User,
  Student,
  Product,
  Category,
  BreakTime,
  Order,
  Donation,
  CanteenReportSummary,
  NotificationItem,
  AuditLog,
  DonationDistribution,
} from '../types.ts';

const TOKEN_KEY = 'kantincep_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({ error: 'Ağ hatası veya geçersiz sunucu yanıtı.' }));

  if (!res.ok) {
    throw new Error(data.error || 'İşlem gerçekleştirilemedi.');
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: { fullName: string; email: string; password: string; passwordRepeat: string; kvkkConsent: boolean; schoolId?: string }) =>
    request<{ success: boolean; user: User; token: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password?: string }) =>
    request<{ success: boolean; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: { email: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  getQuickAccounts: () => request<{ users: { id: string; fullName: string; email: string; role: string; schoolId: string }[] }>('/auth/quick-accounts'),

  // Schools, Breaks, Categories
  getSchools: () => request<{ schools: any[] }>('/schools'),
  updateSchool: (id: string, updates: any) =>
    request<{ success: boolean; school: any }>(`/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  getBreaks: (schoolId?: string) => request<{ breaks: BreakTime[] }>(`/breaks${schoolId ? `?schoolId=${schoolId}` : ''}`),
  createBreak: (payload: { name: string; startTime: string; endTime: string; orderDeadlineMinutesBefore?: number; schoolId?: string }) =>
    request<{ success: boolean; break: BreakTime }>('/breaks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBreak: (id: string, updates: Partial<BreakTime>) => request<{ success: boolean; break: BreakTime }>(`/breaks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteBreak: (id: string) => request<{ success: boolean; message: string }>(`/breaks/${id}`, { method: 'DELETE' }),
  getCategories: (schoolId?: string) => request<{ categories: Category[] }>(`/categories${schoolId ? `?schoolId=${schoolId}` : ''}`),
  createCategory: (payload: { name: string; productType: string; schoolId?: string }) =>
    request<{ success: boolean; category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCategory: (id: string, updates: Partial<Category>) =>
    request<{ success: boolean; category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteCategory: (id: string) =>
    request<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }),

  // Students
  getStudents: () => request<{ students: Student[] }>('/students'),
  createStudent: (payload: { fullName: string; grade: string; classroom: string; schoolId?: string }) =>
    request<{ success: boolean; student: Student }>('/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStudent: (id: string, payload: { fullName?: string; grade?: string; classroom?: string }) =>
    request<{ success: boolean; student: Student }>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteStudent: (id: string) =>
    request<{ success: boolean; message: string }>(`/students/${id}`, {
      method: 'DELETE',
    }),

  // Products
  getProducts: (params?: { type?: string; active?: boolean; schoolId?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.active !== undefined) q.set('active', String(params.active));
    if (params?.schoolId) q.set('schoolId', params.schoolId);
    return request<{ products: Product[] }>(`/products?${q.toString()}`);
  },
  createProduct: (payload: Partial<Product>) =>
    request<{ success: boolean; product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduct: (id: string, payload: Partial<Product>) =>
    request<{ success: boolean; product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteProduct: (id: string) =>
    request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Orders
  getOrders: (params?: { date?: string; breakId?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set('date', params.date);
    if (params?.breakId) q.set('breakId', params.breakId);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    return request<{ orders: Order[] }>(`/orders?${q.toString()}`);
  },
  createOrder: (payload: { studentId: string; orderDate: string; breakId: string; items: { productId: string; quantity: number }[]; note?: string }) =>
    request<{ success: boolean; order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateOrderStatus: (id: string, status: string, note?: string) =>
    request<{ success: boolean; order: Order }>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    }),
  verifyOrderDelivery: (id: string, deliveryCode: string) =>
    request<{ success: boolean; order: Order; message: string }>(`/orders/${id}/verify-delivery`, {
      method: 'POST',
      body: JSON.stringify({ deliveryCode }),
    }),

  // Donations
  getDonations: (type?: string) =>
    request<{ donations: Donation[] }>(`/donations${type ? `?type=${type}` : ''}`),
  createDonation: (payload: { donationType: string; items: { productId: string; quantity: number }[]; note?: string }) =>
    request<{ success: boolean; donation: Donation }>('/donations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  distributeDonation: (payload: { donationItemId: string; quantity: number; notes?: string }) =>
    request<{ success: boolean; distribution: DonationDistribution; message: string }>('/donations/distribute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDistributions: () => request<{ distributions: DonationDistribution[] }>('/donations/distributions'),

  // Payments
  checkoutPayment: (payload: { targetId: string; targetType: 'order' | 'donation'; simulationResult: 'success' | 'failed' | 'cancel'; cardNumberMasked?: string }) =>
    request<{ success: boolean; order?: Order; donation?: Donation; message: string; cancelled?: boolean }>('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reports
  getCanteenSummary: (date?: string) =>
    request<{ summary: CanteenReportSummary }>(`/reports/canteen-summary${date ? `?date=${date}` : ''}`),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications'),
  markNotificationRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),

  // Admin
  getAdminUsers: () => request<{ users: any[] }>('/admin/users'),
  createAdminUser: (payload: { fullName: string; email: string; role: string; schoolId?: string }) =>
    request<{ success: boolean; user: any }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUserStatus: (id: string, status: string) =>
    request<{ success: boolean; user: any }>(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getAuditLogs: () => request<{ logs: AuditLog[] }>('/admin/audit-logs'),
};
