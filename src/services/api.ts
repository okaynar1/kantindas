import {
  User,
  School,
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

const RAW_ENV_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
  ''
).trim().replace(/\/$/, '');

export const API_BASE_URL = RAW_ENV_URL ? (RAW_ENV_URL.endsWith('/api') ? RAW_ENV_URL : `${RAW_ENV_URL}/api`) : '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new Error(`Ağ bağlantısı kurulamadı veya sunucuya ulaşılamıyor: ${netErr?.message || 'Bilinmeyen ağ hatası'}`);
  }

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    const rawText = await res.text().catch(() => '');
    if (rawText && !rawText.trim().startsWith('<')) {
      data = { error: rawText.trim() };
    }
  }

  if (!res.ok) {
    let errorMsg = data?.error;
    if (!errorMsg) {
      if (res.status === 403) errorMsg = 'Bu işlem için yetkiniz bulunmuyor (403).';
      else if (res.status === 401) errorMsg = 'Oturum açmanız gerekiyor veya oturumunuz sonlanmış (401).';
      else if (res.status === 404) errorMsg = 'İstenen kaynak veya servis bulunamadı (404).';
      else if (res.status >= 500) errorMsg = `Sunucu hatası oluştu (HTTP ${res.status}).`;
      else errorMsg = `İşlem gerçekleştirilemedi (HTTP ${res.status}).`;
    }
    const message = data?.detail ? `${errorMsg} (${data.detail})` : errorMsg;
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: { fullName: string; email: string; password: string; passwordRepeat: string; kvkkConsent: boolean; schoolId?: string; schoolCode?: string }) =>
    request<{ success: boolean; user: User; school?: School | null; token: string; emailConfirmationRequired?: boolean; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password?: string }) =>
    request<{ success: boolean; user: User; school?: School | null; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: { email: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: User; school?: School | null }>('/auth/me'),

  getQuickAccounts: () => request<{ users: { id: string; fullName: string; email: string; role: string; schoolId: string }[] }>('/auth/quick-accounts'),

  // Schools, Breaks, Categories
  getSchools: () => request<{ schools: School[] }>('/schools'),
  getSchoolById: (id: string) => request<{ school: School }>(`/schools/${encodeURIComponent(id)}`),
  createSchool: (payload: { name: string; code: string; address?: string; timezone?: string }) =>
    request<{ success: boolean; school: School }>('/schools', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifySchoolCode: (code: string) =>
    request<{ valid: boolean; school?: { id: string; code: string; name: string; address?: string }; error?: string }>(`/schools/verify-code/${encodeURIComponent(code)}`),
  updateSchool: (id: string, updates: any) =>
    request<{ success: boolean; school: School }>(`/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteSchool: (id: string, hard = false) =>
    request<{ success: boolean; message: string; school?: School }>(`/schools/${id}${hard ? '?hard=true' : ''}`, {
      method: 'DELETE',
    }),
  assignSchoolManager: (schoolId: string, payload: { managerUserId?: string; fullName?: string; email?: string; tempPassword?: string }) =>
    request<{ success: boolean; message: string; school: School; manager: User }>(`/schools/${schoolId}/manager`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminSchoolsSummary: () => request<{ schools: any[] }>('/admin/schools-summary'),
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
  getOrders: (params?: { date?: string; breakId?: string; status?: string; search?: string; includeArchived?: boolean; onlyArchived?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set('date', params.date);
    if (params?.breakId) q.set('breakId', params.breakId);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.includeArchived) q.set('includeArchived', 'true');
    if (params?.onlyArchived) q.set('onlyArchived', 'true');
    return request<{ orders: Order[] }>(`/orders?${q.toString()}`);
  },
  endOfDayArchive: (schoolId?: string) =>
    request<{ success: boolean; archivedCount: number; message: string }>('/canteen/end-of-day-archive', {
      method: 'POST',
      body: JSON.stringify({ schoolId }),
    }),
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

  // Password Change
  changePassword: (payload: { currentPassword?: string; newPassword: string; newPasswordRepeat: string }) =>
    request<{ success: boolean; message: string; user: User }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

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

  // Manager (Kurum Müdürü)
  getManagerTeachers: () => request<{ teachers: any[] }>('/manager/teachers'),
  createManagerTeacher: (payload: { fullName: string; email: string; branch?: string; tempPassword?: string }) =>
    request<{ success: boolean; teacher: any; user: any; tempPassword: string; message: string }>('/manager/teachers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTeacherStatus: (id: string, status: string) =>
    request<{ success: boolean; teacher: any }>(`/manager/teachers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  resetTeacherPassword: (id: string) =>
    request<{ success: boolean; tempPassword: string; message: string }>(`/manager/teachers/${id}/reset-password`, {
      method: 'POST',
    }),
  deleteManagerTeacher: (id: string) =>
    request<{ success: boolean; message: string }>(`/manager/teachers/${id}`, {
      method: 'DELETE',
    }),
  getManagerCanteenUsers: () => request<{ canteens: any[] }>('/manager/canteen-users'),
  createManagerCanteenUser: (payload: { fullName: string; email: string; canteenUnit?: string; tempPassword?: string }) =>
    request<{ success: boolean; canteen: any; user: any; tempPassword: string; message: string }>('/manager/canteen-users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCanteenUserStatus: (id: string, status: string) =>
    request<{ success: boolean; canteen: any }>(`/manager/canteen-users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  resetCanteenUserPassword: (id: string) =>
    request<{ success: boolean; tempPassword: string; message: string }>(`/manager/canteen-users/${id}/reset-password`, {
      method: 'POST',
    }),
  deleteManagerCanteenUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/manager/canteen-users/${id}`, {
      method: 'DELETE',
    }),
  getManagerReports: () => request<{ reports: any }>('/manager/reports'),
  getManagerAuditLogs: () => request<{ logs: AuditLog[] }>('/manager/audit-logs'),

  // Teacher (Danışman Öğretmen)
  getTeacherNeeds: () => request<{ needs: any[] }>('/teacher/needs'),
  createStudentNeed: (payload: { studentReferenceId: string; studentName: string; grade: string; classroom: string; needType: string; needDescription?: string }) =>
    request<{ success: boolean; need: any; needCode: string; message: string }>('/teacher/needs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  renewNeedCode: (id: string) =>
    request<{ success: boolean; newCode: string; message: string }>(`/teacher/needs/${id}/renew-code`, {
      method: 'POST',
    }),
  cancelStudentNeed: (id: string) =>
    request<{ success: boolean; message: string }>(`/teacher/needs/${id}`, {
      method: 'DELETE',
    }),
  deleteTeacherNeed: (id: string) =>
    request<{ success: boolean; message: string }>(`/teacher/needs/${id}`, {
      method: 'DELETE',
    }),
  getTeacherAvailableDonations: () =>
    request<{ foodStock: any[]; stationeryStock: any[] }>('/teacher/available-donations'),
  getTeacherAllocations: (type?: string) =>
    request<{ allocations: any[] }>(`/teacher/allocations${type ? `?type=${type}` : ''}`),
  createSupportAllocation: (payload: { studentNeedId: string; supportType: string; sourceType?: string; items: { productId: string; quantity: number }[]; justificationNote?: string; validUntil?: string }) =>
    request<{ success: boolean; allocation: any; message: string }>('/teacher/allocations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelSupportAllocation: (id: string, reason?: string) =>
    request<{ success: boolean; message: string }>(`/teacher/allocations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Canteen Support Delivery & Codes
  getCanteenAllocations: () => request<{ allocations: any[] }>('/canteen/allocations'),
  verifyNeedCode: (code: string) =>
    request<{ success: boolean; allocations: any[]; pendingCount: number }>('/canteen/verify-need-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  deliverSupportAllocation: (id: string, verificationCode: string, notes?: string) =>
    request<{ success: boolean; message: string; allocation: any }>(`/canteen/allocations/${id}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ verificationCode, notes }),
    }),
};
