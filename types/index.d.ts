export type Company = {
  id: number;
  name: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  company_id: number;
  role: string;
};

export type Price = {
  id: number;
  item_name: string;
  price: number;
  updated_by: number;
  created_at: string;
};

export type Sale = {
  id: number;
  company_id: number;
  item_name: string;
  quantity: number;
  type: 'incoming' | 'outgoing';
  created_by: number;
  date: string;
};

export type Attendance = {
  id: number;
  user_id: number;
  status: string;
  date: string;
};

export type StaffOutput = {
  id: number;
  user_id: number;
  task_description: string;
  metric_score: number;
  date: string;
};
