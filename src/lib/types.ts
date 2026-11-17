export type BookingStatus = 'pending' | 'assigned' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceStatus = 'active' | 'unavailable' | 'hidden';
export type StaffRole = 'admin' | 'manager';

export interface Ref {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface ProUser {
  id: string;
  name: string;
  phone: string;
  city: { id: string; name: string } | null;
  skills: { id: string; name: string }[];
  rating: number;
  ratingCount: number;
  jobsCompleted: number;
  experienceYears: number;
  role: 'professional';
}

export interface City {
  id: string;
  name: string;
  slug: string;
  state: string;
  isActive: boolean;
  sortOrder: number;
  professionals?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  services?: { active: number; unavailable: number; hidden: number };
}

export interface Service {
  id: string;
  category: Ref | null;
  name: string;
  slug: string;
  group: string;
  shortDescription: string;
  description: string;
  inclusions: string[];
  exclusions: string[];
  price: number;
  mrp: number;
  durationMinutes: number;
  rating: number;
  ratingCount: number;
  status: ServiceStatus;
  unavailableReason: string;
  cities: Ref[];
  isPopular: boolean;
  sortOrder: number;
  imageUrl: string;
}

export interface PersonRef {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rating?: number;
  ratingCount?: number;
  jobsCompleted?: number;
  experienceYears?: number;
}

export interface TimelineEntry {
  status: string;
  at: string;
  actor: string;
  note: string;
}

export interface BookingAddress {
  label: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  pincode: string;
}

export interface Pricing {
  subtotal: number;
  discount: number;
  visitFee: number;
  total: number;
  couponCode: string;
}

export interface Booking {
  id: string;
  code: string;
  customer: PersonRef | string | null;
  category: string;
  categoryName: string;
  city: string;
  cityName: string;
  items: { service: string; name: string; price: number; mrp: number; qty: number; durationMinutes: number }[];
  address: BookingAddress;
  slot: { date: string; time: string; start: string; end?: string };
  durationMinutes: number;
  pricing: Pricing;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid';
  status: BookingStatus;
  professional: PersonRef | string | null;
  timeline: TimelineEntry[];
  cancellation: { reason: string; by: string; at: string } | null;
  review: { rating: number; comment: string; at: string; hidden: boolean } | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ProOption {
  id: string;
  name: string;
  phone: string;
  rating: number;
  ratingCount: number;
  jobsCompleted: number;
  experienceYears: number;
  available: boolean;
  reason: string;
  current: boolean;
}

export interface Professional {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: Ref | string | null;
  skills: (Ref | string)[];
  experienceYears: number;
  bio: string;
  status: 'active' | 'inactive';
  rating: number;
  ratingCount: number;
  jobsCompleted: number;
  activeJobs?: number;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string;
  addresses: Address[];
  isBlocked: boolean;
  lastLoginAt?: string;
  createdAt: string;
  bookings?: number;
  spent?: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  maxDiscount: number;
  minOrder: number;
  isActive: boolean;
  isPublic: boolean;
  validFrom: string | null;
  validTo: string | null;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
}

export interface ReviewRow {
  bookingId: string;
  code: string;
  categoryName: string;
  items: string[];
  customer: PersonRef | null;
  professional: PersonRef | null;
  review: { rating: number; comment: string; at: string; hidden: boolean };
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  topic: string;
  message: string;
  bookingCode: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export type ApplicationStatus = 'new' | 'contacted' | 'approved' | 'rejected';

export interface ProApplication {
  id: string;
  name: string;
  phone: string;
  city: string;
  skills: string[];
  experienceYears: number;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface SlotDay {
  date: string;
  weekday: string;
  day: number;
  month: string;
  slots: { time: string; available: boolean }[];
}

export interface Job {
  id: string;
  code: string;
  status: BookingStatus;
  categoryName: string;
  cityName: string;
  items: { serviceId: string; name: string; price: number; mrp: number; qty: number; durationMinutes: number }[];
  address: BookingAddress;
  slot: { date: string; time: string; start: string };
  durationMinutes: number;
  pricing: Pricing;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid';
  timeline: TimelineEntry[];
  notes: string;
  customer: { name: string; phone: string } | null;
  review: { rating: number; comment: string } | null;
}

export interface DashboardData {
  today: string;
  statusCounts: Partial<Record<BookingStatus, number>>;
  todayBookings: number;
  pendingAssignment: number;
  revenue: number;
  activeProfessionals: number;
  customers: number;
  openEnquiries: number;
  newApplications: number;
  services: Partial<Record<ServiceStatus, number>>;
  week: { date: string; bookings: number; revenue: number }[];
  topServices: { name: string; qty: number; revenue: number }[];
  recent: Booking[];
  unassigned: Booking[];
}
