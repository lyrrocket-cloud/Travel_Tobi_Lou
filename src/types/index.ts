export interface Wish {
  id: string;
  destination: string;
  travel_month: string;
  travel_year: number;
  wisher_name: string;
  is_confirmed: number;
  is_expired?: number;
  confirmed_date?: string;
  travelers?: string;
  followers_count: number;
  followers: string[];
}