export type UserRole = 'parent' | 'canteen' | 'admin' | 'manager' | 'teacher';
export type AccountStatus = 'active' | 'suspended';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  schoolId: string;
  accountStatus: AccountStatus;
  phone?: string;
  mustChangePassword?: boolean;
  titleOrBranch?: string;
  canteenUnit?: string;
  createdByManagerId?: string;
  passwordHash?: string;
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
  type: 'order' | 'donation' | 'system' | 'stock' | 'delivery' | 'support_delivery';
  read: boolean;
  linkUrl?: string;
  orderId?: string;
  allocationId?: string;
  studentNeedId?: string;
  supportType?: 'food_pool' | 'education_support';
  itemsSummary?: string;
  deliveryEventId?: string;
  studentNameSnapshot?: string;
  createdAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  auth?: string;
  p256dh?: string;
  fcmToken?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNotificationEvent {
  eventId: string;
  orderId: string;
  orderNumber: string;
  parentUserId: string;
  studentName: string;
  schoolId: string;
  canteenStaffName: string;
  deliveredAt: string;
  notification: NotificationItem;
}

export interface SupportDeliveryNotificationEvent {
  eventId: string;
  allocationId: string;
  allocationNumber: string;
  studentNeedId: string;
  teacherUserId: string;
  teacherName: string;
  supportType: 'food_pool' | 'education_support';
  itemsSummary: string;
  schoolId: string;
  canteenStaffName: string;
  deliveredAt: string;
  notification: NotificationItem;
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

// ----------------------------------------------------
// New Role Profiles & Social Support Data Models
// ----------------------------------------------------

export interface TeacherProfile {
  id: string;
  authUserId: string;
  schoolId: string;
  fullName: string;
  email: string;
  branch?: string;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  createdByManagerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanteenProfile {
  id: string;
  authUserId: string;
  schoolId: string;
  fullName: string;
  email: string;
  canteenUnit?: string;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  createdByManagerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerProfile {
  id: string;
  authUserId: string;
  schoolId: string;
  fullName: string;
  accountStatus: AccountStatus;
  createdAt: string;
}

export type StudentNeedType = 'food' | 'stationery' | 'both' | 'other';
export type StudentNeedStatus = 'active' | 'fulfilled' | 'cancelled';

export interface StudentNeed {
  id: string;
  schoolId: string;
  studentReferenceId: string; // Internal school student no / unique ID
  studentName: string;
  grade: string;
  classroom: string;
  needCodeReference: string; // The generated unguessable need code
  needType: StudentNeedType;
  needDescription: string;
  createdByTeacherId: string;
  createdByTeacherName: string;
  status: StudentNeedStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentNeedCode {
  id: string;
  schoolId: string;
  studentNeedId: string;
  needCode: string;
  codeHash: string;
  codeStatus: 'active' | 'used' | 'revoked';
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
}

export type SupportAllocationType = 'food_pool' | 'education_support';
export type SupportSourceType = 'parent_donation_pool' | 'parent_education_support' | 'institution_budget';
export type SupportAllocationStatus =
  | 'need_recorded'
  | 'awaiting_resource'
  | 'product_allocated'
  | 'sent_to_canteen'
  | 'ready_for_delivery'
  | 'partially_delivered'
  | 'fully_delivered'
  | 'cancelled';

export interface SupportAllocationItem {
  id: string;
  allocationId: string;
  productId: string;
  productNameSnapshot: string;
  quantityAllocated: number;
  quantityDelivered: number;
  quantityRemaining: number;
  unitPriceSnapshot: number;
  createdAt: string;
}

export interface SupportAllocation {
  id: string;
  schoolId: string;
  studentNeedId: string;
  studentNameSnapshot: string;
  studentClassSnapshot: string;
  allocationNumber: string; // e.g. "KC-THS-202610-001"
  needCodeReference: string;
  supportType: SupportAllocationType;
  sourceType: SupportSourceType;
  sourceReferenceId?: string;
  assignedByTeacherId: string;
  assignedByTeacherName: string;
  status: SupportAllocationStatus;
  justificationNote?: string;
  validUntil?: string;
  deliveredAt?: string;
  deliveredByCanteenUserId?: string;
  deliveredByCanteenName?: string;
  cancelledReason?: string;
  cancelledAt?: string;
  cancelledByUserId?: string;
  createdAt: string;
  updatedAt: string;
  items: SupportAllocationItem[];
}

export interface SupportDelivery {
  id: string;
  allocationId: string;
  schoolId: string;
  deliveredByCanteenUserId: string;
  deliveredByCanteenName: string;
  verificationReference: string;
  deliveryStatus: 'complete' | 'partial';
  quantityDelivered: number;
  notes?: string;
  deliveredAt: string;
  createdAt: string;
}

export interface SupportStatusHistory {
  id: string;
  allocationId: string;
  previousStatus: SupportAllocationStatus;
  newStatus: SupportAllocationStatus;
  changedByUserId: string;
  changedByName: string;
  changeReason: string;
  changedAt: string;
}

export interface InventoryMovement {
  id: string;
  schoolId: string;
  productId: string;
  productName: string;
  movementType: 'donation_in' | 'allocation_reserved' | 'allocation_delivered' | 'allocation_cancelled' | 'direct_sale' | 'restock';
  sourceType: SupportSourceType | 'canteen_inventory';
  sourceReferenceId: string;
  quantity: number;
  performedByUserId: string;
  performedByName: string;
  createdAt: string;
}

export interface ManagerReportSummary {
  totalStudentsInNeed: number;
  activeNeedsCount: number;
  fulfilledNeedsCount: number;
  foodPoolAllocatedItems: number;
  foodPoolDeliveredItems: number;
  foodPoolRemainingDonations: number;
  educationAllocatedItems: number;
  educationDeliveredItems: number;
  educationRemainingDonations: number;
  pendingDeliveriesCount: number;
  teacherStats: { teacherId: string; teacherName: string; needsCreated: number; allocationsCount: number }[];
  recentAllocations: SupportAllocation[];
}
