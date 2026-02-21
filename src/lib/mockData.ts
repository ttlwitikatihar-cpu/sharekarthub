export type ItemCategory = 'rent' | 'sale' | 'donate';

export interface ItemListing {
  id: string;
  title: string;
  description: string;
  category: ItemCategory;
  price: number;
  securityDeposit?: number;
  images: string[];
  location: string;
  provider: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    verified: boolean;
  };
  rating: number;
  reviewCount: number;
  createdAt: string;
  condition: string;
  popularity: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  donationsCount: number;
  points: number;
  badge: string;
}

export const MOCK_ITEMS: ItemListing[] = [
  {
    id: '1',
    title: 'Canon EOS R5 Camera',
    description: 'Professional mirrorless camera, perfect for photography projects. Comes with 24-70mm lens.',
    category: 'rent',
    price: 75,
    securityDeposit: 500,
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600'],
    location: 'Mumbai, MH',
    provider: { id: 'u1', name: 'Arjun Mehta', avatar: '', rating: 4.8, verified: true },
    rating: 4.7,
    reviewCount: 23,
    createdAt: '2024-01-15',
    condition: 'Excellent',
    popularity: 92,
  },
  {
    id: '2',
    title: 'Mountain Bike - Trek Marlin 7',
    description: 'Hardtail mountain bike in great condition. Perfect for weekend trails.',
    category: 'sale',
    price: 18000,
    images: ['https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600'],
    location: 'Bangalore, KA',
    provider: { id: 'u2', name: 'Priya Sharma', avatar: '', rating: 4.5, verified: true },
    rating: 4.3,
    reviewCount: 8,
    createdAt: '2024-02-01',
    condition: 'Good',
    popularity: 67,
  },
  {
    id: '3',
    title: 'Winter Jacket Collection',
    description: 'Gently used winter jackets, various sizes. Donating to help those in need.',
    category: 'donate',
    price: 0,
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600'],
    location: 'Delhi, DL',
    provider: { id: 'u3', name: 'Rahul Gupta', avatar: '', rating: 5.0, verified: true },
    rating: 5.0,
    reviewCount: 15,
    createdAt: '2024-01-28',
    condition: 'Good',
    popularity: 88,
  },
  {
    id: '4',
    title: 'DJI Mavic 3 Pro Drone',
    description: 'Professional drone for aerial photography. Includes extra batteries and carrying case.',
    category: 'rent',
    price: 150,
    securityDeposit: 2000,
    images: ['https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600'],
    location: 'Pune, MH',
    provider: { id: 'u4', name: 'Sneha Patel', avatar: '', rating: 4.9, verified: true },
    rating: 4.8,
    reviewCount: 31,
    createdAt: '2024-02-10',
    condition: 'Like New',
    popularity: 95,
  },
  {
    id: '5',
    title: 'Study Table with Chair',
    description: 'Solid wood study table with ergonomic chair. Moving out, need to sell quickly.',
    category: 'sale',
    price: 4500,
    images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600'],
    location: 'Hyderabad, TS',
    provider: { id: 'u5', name: 'Kiran Reddy', avatar: '', rating: 4.2, verified: false },
    rating: 4.0,
    reviewCount: 5,
    createdAt: '2024-02-15',
    condition: 'Good',
    popularity: 45,
  },
  {
    id: '6',
    title: 'Children\'s Books Bundle',
    description: '50+ children\'s books, ages 5-12. All in good condition. Free for anyone who needs them!',
    category: 'donate',
    price: 0,
    images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600'],
    location: 'Chennai, TN',
    provider: { id: 'u6', name: 'Lakshmi Iyer', avatar: '', rating: 4.9, verified: true },
    rating: 4.9,
    reviewCount: 42,
    createdAt: '2024-02-05',
    condition: 'Good',
    popularity: 78,
  },
  {
    id: '7',
    title: 'PS5 Console with 3 Games',
    description: 'Rent a PS5 for your weekend gaming sessions. Comes with 3 popular titles.',
    category: 'rent',
    price: 200,
    securityDeposit: 1500,
    images: ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600'],
    location: 'Mumbai, MH',
    provider: { id: 'u7', name: 'Vikram Singh', avatar: '', rating: 4.6, verified: true },
    rating: 4.5,
    reviewCount: 19,
    createdAt: '2024-02-12',
    condition: 'Excellent',
    popularity: 85,
  },
  {
    id: '8',
    title: 'Office Furniture Set',
    description: 'Complete office setup: desk, chair, bookshelf. Donating after office renovation.',
    category: 'donate',
    price: 0,
    images: ['https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600'],
    location: 'Gurgaon, HR',
    provider: { id: 'u8', name: 'Amit Verma', avatar: '', rating: 4.7, verified: true },
    rating: 4.6,
    reviewCount: 11,
    createdAt: '2024-02-18',
    condition: 'Fair',
    popularity: 72,
  },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u6', name: 'Lakshmi Iyer', avatar: '', donationsCount: 42, points: 2100, badge: '🏆' },
  { rank: 2, userId: 'u3', name: 'Rahul Gupta', avatar: '', donationsCount: 35, points: 1750, badge: '🥈' },
  { rank: 3, userId: 'u8', name: 'Amit Verma', avatar: '', donationsCount: 28, points: 1400, badge: '🥉' },
  { rank: 4, userId: 'u10', name: 'Deepa Nair', avatar: '', donationsCount: 22, points: 1100, badge: '⭐' },
  { rank: 5, userId: 'u11', name: 'Suresh Kumar', avatar: '', donationsCount: 18, points: 900, badge: '⭐' },
  { rank: 6, userId: 'u12', name: 'Meera Joshi', avatar: '', donationsCount: 15, points: 750, badge: '⭐' },
  { rank: 7, userId: 'u13', name: 'Ravi Prakash', avatar: '', donationsCount: 12, points: 600, badge: '' },
  { rank: 8, userId: 'u14', name: 'Anita Das', avatar: '', donationsCount: 10, points: 500, badge: '' },
];
