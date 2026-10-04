export type Role = 'ADMIN' | 'LIBRARIAN' | 'READER';
export interface Account {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: Role;
  status: string;
  employeeId?: string;
  readerCode?: string;
  readerType?: string;
}
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface Category {
  id: number;
  name: string;
  description: string;
}
export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publicationYear: number;
  categoryId: number;
  categoryName: string;
  description: string;
  coverImageUrl?: string;
  deleted: boolean;
  availableItems: number;
}
export interface Item {
  id: number;
  bookId: number;
  barcode: string;
  location: string;
  condition: string;
  status: string;
}
export interface Rule {
  id: number;
  readerType: string;
  maxBooksAllowed: number;
  maxDaysAllowed: number;
  dailyFineAmount: number;
}
export interface Detail {
  id: number;
  bookId: number;
  title: string;
  barcode: string;
  dueDate: string;
  returnedAt?: string;
  closedAt?: string;
  closureReason?: string;
  conditionOnReturn?: string;
  fineRatePerDay: number;
  estimatedFine: number;
  itemStatus: string;
}
export interface Receipt {
  id: number;
  readerId: number;
  readerName: string;
  librarianName: string;
  borrowDate: string;
  status: string;
  note: string;
  details: Detail[];
}
export interface Violation {
  loanClosedAt: string | null;
  id: number;
  borrowDetailId: number;
  readerId: number;
  readerName: string;
  title: string;
  type: string;
  fineAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  notes: string;
  createdAt: string;
}
export interface Payment {
  id: number;
  amount: number;
  paidAt: string;
  collectedBy: string;
  idempotencyKey: string;
}
export interface Notice {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  readAt?: string;
}
export interface Report {
  id: number;
  generatedAt: string;
  borrowing: { receipts: number; bookLoans: number };
  popularBooks: { bookId: number; title: string; loans: number }[];
  overdue: {
    detailId: number;
    readerName: string;
    title: string;
    barcode: string;
    dueDate: string;
  }[];
  fines: { assessedInPeriod: number; collectedInPeriod: number; totalOutstanding: number };
}
