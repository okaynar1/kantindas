import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, School, Product, NotificationItem } from '../types.ts';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api.ts';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  quickLogin: (userId: string) => Promise<void>;
  register: (payload: { fullName: string; email: string; password: string; passwordRepeat: string; kvkkConsent: boolean; schoolCode?: string }) => Promise<any>;
  logout: () => void;
  // School Data (Dynamic per tenant)
  school: School | null;
  schoolLoading: boolean;
  schoolError: string | null;
  adminSelectedSchool: School | null;
  setAdminSelectedSchool: (school: School | null) => void;
  refreshSchool: () => Promise<void>;
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  // Quick users for instant demo access
  quickUsers: { id: string; fullName: string; email: string; role: string; schoolId: string }[];
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic School state
  const [school, setSchool] = useState<School | null>(null);
  const [schoolLoading, setSchoolLoading] = useState<boolean>(false);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [adminSelectedSchool, setAdminSelectedSchool] = useState<School | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kantincep_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [quickUsers, setQuickUsers] = useState<{ id: string; fullName: string; email: string; role: string; schoolId: string }[]>([]);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('kantincep_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchSchoolForUser = async (targetUser: User | null, preloadedSchool?: School | null) => {
    if (!targetUser) {
      setSchool(null);
      setSchoolLoading(false);
      setSchoolError(null);
      return;
    }

    // Central System Admin manages all schools, no single fixed school
    if (targetUser.role === 'admin') {
      setSchool(null);
      setSchoolLoading(false);
      setSchoolError(null);
      return;
    }

    if (preloadedSchool) {
      setSchool(preloadedSchool);
      setSchoolLoading(false);
      setSchoolError(null);
      return;
    }

    if (!targetUser.schoolId) {
      setSchool(null);
      setSchoolLoading(false);
      setSchoolError('Kullanıcıya atanmış bir okul bulunamadı.');
      return;
    }

    setSchoolLoading(true);
    setSchoolError(null);
    try {
      const res = await api.getSchoolById(targetUser.schoolId);
      if (res && res.school) {
        setSchool(res.school);
      } else {
        setSchool(null);
        setSchoolError('Kayıtlı okul bilgisine ulaşılamadı.');
      }
    } catch (err: any) {
      console.warn('Okul yükleme hatası:', err);
      setSchool(null);
      setSchoolError(err.message || 'Okul bilgisi alınamadı.');
    } finally {
      setSchoolLoading(false);
    }
  };

  const refreshSchool = async () => {
    if (user) {
      await fetchSchoolForUser(user);
    }
  };

  // Load quick accounts and current session
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const { users } = await api.getQuickAccounts();
        setQuickUsers(users);

        const currentToken = getStoredToken();
        if (currentToken) {
          try {
            const { user: me, school: preloadedSchool } = await api.getMe();
            setUser(me);
            await fetchSchoolForUser(me, preloadedSchool);
            const notifRes = await api.getNotifications();
            setNotifications(notifRes.notifications);
          } catch {
            // Stale or invalid session: clean up stored token
            removeStoredToken();
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Init auth notice:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const refreshUserData = async () => {
    if (!token) return;
    try {
      const { user: me, school: preloadedSchool } = await api.getMe();
      setUser(me);
      await fetchSchoolForUser(me, preloadedSchool);
      await refreshNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const refreshNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (e) {
      console.error(e);
    }
  };

  const login = async (email: string, password?: string) => {
    const res = await api.login({ email, password });
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    await fetchSchoolForUser(res.user, res.school);
    const notifRes = await api.getNotifications();
    setNotifications(notifRes.notifications);
  };

  const quickLogin = async (userId: string) => {
    const found = quickUsers.find(u => u.id === userId);
    if (found) {
      setStoredToken(userId);
      setToken(userId);
      const { user: me, school: preloadedSchool } = await api.getMe();
      setUser(me);
      await fetchSchoolForUser(me, preloadedSchool);
      const notifRes = await api.getNotifications();
      setNotifications(notifRes.notifications);
    }
  };

  const register = async (payload: { fullName: string; email: string; password: string; passwordRepeat: string; kvkkConsent: boolean; schoolCode?: string }) => {
    const res = await api.register(payload);
    if (res.token) {
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      await fetchSchoolForUser(res.user, res.school);
    }
    // Reload quick users
    try {
      const qRes = await api.getQuickAccounts();
      setQuickUsers(qRes.users);
    } catch {
      // ignore
    }
    return res;
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
    setSchool(null);
    setAdminSelectedSchool(null);
    setSchoolError(null);
    setCart([]);
    setNotifications([]);
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = Math.round(
    cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100
  ) / 100;

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Notification actions
  const markNotificationAsRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider
      value={
        {
          user,
          token,
          isLoading,
          login,
          quickLogin,
          register,
          logout,
          school,
          schoolLoading,
          schoolError,
          adminSelectedSchool,
          setAdminSelectedSchool,
          refreshSchool,
          cart,
          addToCart,
          removeFromCart,
          updateCartQuantity,
          clearCart,
          cartTotal,
          cartCount,
          notifications,
          unreadNotificationCount,
          refreshNotifications,
          markNotificationAsRead,
          markAllNotificationsAsRead,
          quickUsers,
          refreshUserData,
        }
      }
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
