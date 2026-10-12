export type UserRole = 'parent' | 'canteen' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  schoolId: string;
  accountStatus: AccountStatus;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  timezone: string;
  activeStatus: boolean;
}

export interface Student {
  id: string;
  parentUserId: string;
  schoolId: string;
  fullName: string;
  grade: string; // e.g. "4. Sınıf"
  classroom: string; // e.g. "4-B"
  activeStatus: boolean;
  createdAt: string;
}

export type ProductType = 'food' | 'stationery';

export interface Category {
  id: string;
  schoolId: string;
  name: string;
  productType: ProductType;
  activeStatus: boolean;
}

export interface BreakTime {
  id: string;
  schoolId: string;
  name: string;
  startTime: string; // e.g. "09:40"
  endTime: string;   // e.g. "09:55"
  activeStatus: boolean;
  orderDeadlineMinutesBefore?: number; // e.g. 15 minutes before break starts
}

export interface Product {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  categoryId: string;
  productType: ProductType;
  price: number; // In Turkish Liras (₺), e.g. 45.00
  stockQuantity: number;
  imageUrl: string;
  allergens: string[]; // e.g. ["Gluten", "Süt", "Yumurta"]
  activeStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export type OrderStatus =
  | 'pending_payment'
  | 'paid_pending'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "KC-20261012-108"
  parentUserId: string;
  studentId: string;
  studentNameSnapshot: string;
  studentClassSnapshot: string;
  schoolId: string;
  orderDate: string; // "DD.MM.YYYY"
  breakId: string;
  breakNameSnapshot: string;
  orderType: 'canteen';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  totalAmount: number;
  note?: string;
  deliveryCode: string; // 4-digit code e.g. "7294" for student to pick up
  isVerifiedDelivery: boolean;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export type DonationType = 'food_pool' | 'education_support';

export interface DonationItem {
  id: string;
  donationId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  allocatedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
}

export interface Donation {
  id: string;
  donationNumber: string;
  donorUserId: string;
  donorNameSnapshot: string;
  schoolId: string;
  donationType: DonationType;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  note?: string;
  createdAt: string;
  items: DonationItem[];
}

export interface PaymentRecord {
  id: string;
  targetId: string; // orderId or donationId
  targetType: 'order' | 'donation';
  paymentProvider: 'simulation' | 'iyzico' | 'paytr';
  providerReference: string;
  amount: number;
  currency: 'TRY';
  paymentStatus: 'success' | 'failed' | 'pending';
  rawResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedByUserId: string;
  changedByName: string;
  changedByRole: UserRole;
  changedAt: string;
  note?: string;
}

export interface DonationDistribution {
  id: string;
  schoolId: string;
  donationItemId: string;
  productId: string;
  productNameSnapshot: string;
  donationType: DonationType;
  quantity: number;
  authorizedStaffId: string;
  authorizedStaffName: string;
  notes: string;
  distributedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'donation' | 'system' | 'stock';
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface CanteenReportSummary {
  todayOrderCount: number;
  pendingOrdersCount: number;
  preparingOrdersCount: number;
  readyOrdersCount: number;
  deliveredOrdersCount: number;
  cancelledOrdersCount: number;
  todaySalesAmount: number;
  lowStockCount: number;
  foodPoolDonatedItems: number;
  foodPoolDistributedItems: number;
  foodPoolRemainingItems: number;
  educationDonatedItems: number;
  educationDistributedItems: number;
  educationRemainingItems: number;
  popularProducts: { name: string; quantity: number; revenue: number }[];
  breakDistribution: { breakName: string; count: number }[];
}
