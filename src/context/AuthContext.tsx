import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Product, NotificationItem } from '../types.ts';
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
  register: (payload: { fullName: string; email: string; password: string; passwordRepeat: string; kvkkConsent: boolean }) => Promise<void>;
  logout: () => void;
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

  // Load quick accounts and current session
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const { users } = await api.getQuickAccounts();
        setQuickUsers(users);

        const currentToken = getStoredToken();
        if (currentToken) {
          const { user: me } = await api.getMe();
          setUser(me);
          // fetch notifications
          const notifRes = await api.getNotifications();
          setNotifications(notifRes.notifications);
        } else {
          // Default start with parent for immediate demonstration
          if (users.length > 0) {
            const defaultParent = users.find(u => u.role === 'parent') || users[0];
            setStoredToken(defaultParent.id);
            setToken(defaultParent.id);
            const { user: me } = await api.getMe();
            setUser(me);
            const notifRes = await api.getNotifications();
            setNotifications(notifRes.notifications);
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
      const { user: me } = await api.getMe();
      setUser(me);
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
    const notifRes = await api.getNotifications();
    setNotifications(notifRes.notifications);
  };

  const quickLogin = async (userId: string) => {
    const found = quickUsers.find(u => u.id === userId);
    if (found) {
      setStoredToken(userId);
      setToken(userId);
      const { user: me } = await api.getMe();
      setUser(me);
      const notifRes = await api.getNotifications();
      setNotifications(notifRes.notifications);
    }
  };

  const register = async (payload: { fullName: string; email: string; password: string; passwordRepeat: string; kvkkConsent: boolean }) => {
    const res = await api.register(payload);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    // Reload quick users
    const qRes = await api.getQuickAccounts();
    setQuickUsers(qRes.users);
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
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
