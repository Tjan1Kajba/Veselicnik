export interface UserData {
  id: string;
  username: string;
  email: string;
  tip_uporabnika?: string;
  uporabnisko_ime?: string;
  [key: string]: any;
}

export interface UserResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserData;
  [key: string]: any;
}

export interface Veselica {
  id: string;
  ime_veselice: string;
  cas: string;
  lokacija: string;
  max_udelezencev?: number;
  st_pirjaveljenih?: number;
  starost_za_vstop?: number;
  opis_dogodka?: string;
  ustvaril_uporabnik_id?: string;
  ustvaril_uporabnik_ime?: string;
  ustvarjeno?: string;
  prijavljeni_uporabniki?: string[];
  prijavljeni_uporabniki_podatki?: string[];
  [key: string]: any;
}

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  available: boolean;
}

export interface OrderItem {
  item_id: string;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  status: string;
  paid: boolean;
  total_price: number;
  id_veselica?: string;
}

export interface CreateOrderRequest {
  items: OrderItem[];
}

export interface PaymentRequest {
  amount: number;
  method: string;
  transaction_id?: string;
}

export interface StatusUpdateRequest {
  status: string;
}

export interface MusicRequest {
  id: string;
  user_id: string;
  song_name: string;
  artist?: string;
  votes: number;
  timestamp?: string;
  id_veselica?: string;
}

export interface CreateMusicRequest {
  song_name: string;
  artist?: string;
  id_veselica: string;
}

export interface VoteRequest {
  user_id: string;
}

export interface UserNavigationProps {
  user: UserData | null;
  loading: boolean;
  handleLogout: () => void;
}

export interface AdminNavigationProps {
  handleLogout: () => void;
}

export interface SidebarProps {
  user: UserData;
  handleLogout: () => void;
  activeItem?: string;
}

export interface AdminSidebarProps extends SidebarProps {
  activeItem?: 'profil' | 'veselice' | 'upravljanje' | 'menu' | 'narocila' | 'glasba';
}

export interface UserSidebarProps extends SidebarProps {
  activeItem?: 'profil' | 'veselice' | 'narocila' | 'izgubljeni';
}
