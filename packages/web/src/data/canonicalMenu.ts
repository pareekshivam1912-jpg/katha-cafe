export interface CanonicalItem {
  id: string;
  name: string;
  description?: string | null;
  pricePaise: number;
  priceInr: number;
  isAvailable: boolean;
}

export interface CanonicalCategory {
  id: string;
  name: string;
  displayOrder: number;
  items: CanonicalItem[];
}

export const ALL_CANONICAL_CATEGORIES: CanonicalCategory[] = [
  {
    id: 'cat-snacks',
    name: 'Snacks',
    displayOrder: 1,
    items: [
      { id: 'sn-1', name: 'Vada Paav', pricePaise: 5000, priceInr: 50, isAvailable: true },
      { id: 'sn-2', name: 'Spring Roll', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'sn-3', name: 'Nachos with Salsa', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'sn-4', name: 'Cheese Balls', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'sn-5', name: 'Corn Cheese Balls', pricePaise: 12000, priceInr: 120, isAvailable: true },
      { id: 'sn-6', name: 'Crispy Corn', pricePaise: 11000, priceInr: 110, isAvailable: true },
      { id: 'sn-7', name: 'Loaded Nachos', pricePaise: 11000, priceInr: 110, isAvailable: true },
    ],
  },
  {
    id: 'cat-pakoda',
    name: 'Pakoda Junction',
    displayOrder: 2,
    items: [
      { id: 'pk-1', name: 'Onion Pakoda', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'pk-2', name: 'Aloo Pakoda', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'pk-3', name: 'Paneer Pakoda', pricePaise: 11000, priceInr: 110, isAvailable: true },
      { id: 'pk-4', name: 'Mix Veg Pakoda', pricePaise: 12000, priceInr: 120, isAvailable: true },
    ],
  },
  {
    id: 'cat-breads',
    name: 'Breads',
    displayOrder: 3,
    items: [
      { id: 'br-1', name: 'Bun Maska', pricePaise: 3500, priceInr: 35, isAvailable: true },
      { id: 'br-2', name: 'Butter Toast', pricePaise: 4000, priceInr: 40, isAvailable: true },
      { id: 'br-3', name: 'Nutella Butter Toast', pricePaise: 8000, priceInr: 80, isAvailable: true },
    ],
  },
  {
    id: 'cat-maggi',
    name: 'Maggi Bar',
    displayOrder: 4,
    items: [
      { id: 'mg-1', name: 'Plain Maggi', pricePaise: 5000, priceInr: 50, isAvailable: true },
      { id: 'mg-2', name: 'Vegetable Maggi', pricePaise: 6000, priceInr: 60, isAvailable: true },
      { id: 'mg-3', name: 'Peri Peri Maggi', pricePaise: 7000, priceInr: 70, isAvailable: true },
      { id: 'mg-4', name: 'Schezwan Maggi', pricePaise: 7000, priceInr: 70, isAvailable: true },
      { id: 'mg-5', name: 'Tandoori Maggi', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'mg-6', name: 'Corn Maggi', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'mg-7', name: 'Butter Makhni Maggi', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'mg-8', name: 'Cheese Garlic Maggi', pricePaise: 12000, priceInr: 120, isAvailable: true },
    ],
  },
  {
    id: 'cat-fries',
    name: 'Fries',
    displayOrder: 5,
    items: [
      { id: 'fr-1', name: 'French Fries', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'fr-2', name: 'Peri Peri Fries', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'fr-3', name: 'Chilli Potato', pricePaise: 13000, priceInr: 130, isAvailable: true },
      { id: 'fr-4', name: 'Honey Chilli Potato', pricePaise: 14000, priceInr: 140, isAvailable: true },
    ],
  },
  {
    id: 'cat-garlic-bread',
    name: 'Garlic Bread',
    displayOrder: 6,
    items: [
      { id: 'gb-1', name: 'Cheese Garlic Bread', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'gb-2', name: 'Cheese Chilli Garlic Bread', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'gb-3', name: 'Corn Cheese Garlic Bread', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'gb-4', name: 'Cheese Burst Garlic Bread', pricePaise: 15000, priceInr: 150, isAvailable: true },
    ],
  },
  {
    id: 'cat-sandwiches',
    name: 'Sandwiches',
    displayOrder: 7,
    items: [
      { id: 'sw-1', name: 'Veg Grill Sandwich', pricePaise: 11000, priceInr: 110, isAvailable: true },
      { id: 'sw-2', name: 'Bombay Grill Sandwich', pricePaise: 11000, priceInr: 110, isAvailable: true },
      { id: 'sw-3', name: 'Paneer Grill Sandwich', pricePaise: 13000, priceInr: 130, isAvailable: true },
      { id: 'sw-4', name: 'Cheese Corn Grill Sandwich', pricePaise: 13000, priceInr: 130, isAvailable: true },
      { id: 'sw-5', name: 'Peri Peri Grill Sandwich', pricePaise: 13000, priceInr: 130, isAvailable: true },
      { id: 'sw-6', name: 'Bahubali Sandwich', pricePaise: 21000, priceInr: 210, isAvailable: true },
    ],
  },
  {
    id: 'cat-burgers',
    name: 'Burgers',
    displayOrder: 8,
    items: [
      { id: 'bg-1', name: 'Aloo Tikki Burger', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'bg-2', name: 'Veg Burger', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'bg-3', name: 'Katha Special Burger', pricePaise: 12000, priceInr: 120, isAvailable: true },
    ],
  },
  {
    id: 'cat-rolls',
    name: 'Rolls',
    displayOrder: 9,
    items: [
      { id: 'rl-1', name: 'Veg Roll', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'rl-2', name: 'Paneer Roll', pricePaise: 11000, priceInr: 110, isAvailable: true },
    ],
  },
  {
    id: 'cat-tacos',
    name: 'Taco Tales',
    displayOrder: 10,
    items: [
      { id: 'tc-1', name: 'Veg Taco', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'tc-2', name: 'Paneer Taco', pricePaise: 9000, priceInr: 90, isAvailable: true },
      { id: 'tc-3', name: 'Cheese Taco', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'tc-4', name: 'Chipotle Cheese Taco', pricePaise: 11000, priceInr: 110, isAvailable: true },
    ],
  },
  {
    id: 'cat-pizza',
    name: 'Pizza',
    displayOrder: 11,
    items: [
      { id: 'pz-1', name: 'Classic Margherita', pricePaise: 17000, priceInr: 170, isAvailable: true },
      { id: 'pz-2', name: 'Indiana Pizza', pricePaise: 17000, priceInr: 170, isAvailable: true },
      { id: 'pz-3', name: 'Barbeque Pizza', pricePaise: 18000, priceInr: 180, isAvailable: true },
      { id: 'pz-4', name: 'Corn Pizza', pricePaise: 18000, priceInr: 180, isAvailable: true },
      { id: 'pz-5', name: 'Cheese Overload Pizza', pricePaise: 18000, priceInr: 180, isAvailable: true },
      { id: 'pz-6', name: 'Farmhouse Loaded Pizza', pricePaise: 25000, priceInr: 250, isAvailable: true },
      { id: 'pz-7', name: 'Tandoori Paneer Pizza', pricePaise: 28000, priceInr: 280, isAvailable: true },
      { id: 'pz-8', name: 'Katha Special Pizza', pricePaise: 30000, priceInr: 300, isAvailable: true },
    ],
  },
  {
    id: 'cat-pasta',
    name: 'Pasta',
    displayOrder: 12,
    items: [
      { id: 'ps-1', name: 'Penne Arrabbiata', pricePaise: 17000, priceInr: 170, isAvailable: true },
      { id: 'ps-2', name: 'Penne Alfredo', pricePaise: 17000, priceInr: 170, isAvailable: true },
      { id: 'ps-3', name: 'Pink Velvet Pasta', pricePaise: 18000, priceInr: 180, isAvailable: true },
      { id: 'ps-4', name: 'Mac N Cheese', pricePaise: 20000, priceInr: 200, isAvailable: true },
    ],
  },
  {
    id: 'cat-noodles',
    name: 'Noodles',
    displayOrder: 13,
    items: [
      { id: 'nd-1', name: 'Hakka Noodles', pricePaise: 11000, priceInr: 110, isAvailable: true },
      { id: 'nd-2', name: 'Schezwan Noodles', pricePaise: 11000, priceInr: 110, isAvailable: true },
      { id: 'nd-3', name: 'Singapore Noodles', pricePaise: 12000, priceInr: 120, isAvailable: true },
      { id: 'nd-4', name: 'Hong Kong Noodles', pricePaise: 12000, priceInr: 120, isAvailable: true },
    ],
  },
  {
    id: 'cat-chaat',
    name: 'Chaat Chowk',
    displayOrder: 14,
    items: [
      { id: 'ch-1', name: 'Sev Puri', pricePaise: 6000, priceInr: 60, isAvailable: true },
      { id: 'ch-2', name: 'Dahi Papdi Chaat', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'ch-3', name: 'Chinese Bhel', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'ch-4', name: 'Jhalmuri', pricePaise: 9000, priceInr: 90, isAvailable: true },
    ],
  },
  {
    id: 'cat-salads',
    name: 'Healthy Salads',
    displayOrder: 15,
    items: [
      { id: 'sl-1', name: 'Waldorf Salad', pricePaise: 18000, priceInr: 180, isAvailable: true },
      { id: 'sl-2', name: 'Greek Salad', pricePaise: 18000, priceInr: 180, isAvailable: true },
    ],
  },
  {
    id: 'cat-dessert',
    name: 'Dessert',
    displayOrder: 16,
    items: [
      { id: 'ds-1', name: 'Brownie with Ice Cream', pricePaise: 11000, priceInr: 110, isAvailable: true },
    ],
  },
  {
    id: 'cat-combos',
    name: 'Bollywood Combo Specials',
    displayOrder: 17,
    items: [
      { id: 'cb-1', name: 'Chai + Bun Maska', pricePaise: 4900, priceInr: 49, isAvailable: true },
      { id: 'cb-2', name: 'Chai + Veg Maggi', pricePaise: 6900, priceInr: 69, isAvailable: true },
      { id: 'cb-3', name: 'Chai + Onion Pakoda', pricePaise: 9900, priceInr: 99, isAvailable: true },
      { id: 'cb-4', name: 'Hot Coffee + Nutella Butter Toast', pricePaise: 10900, priceInr: 109, isAvailable: true },
      { id: 'cb-5', name: 'Chai + Bombay Grill Sandwich', pricePaise: 11900, priceInr: 119, isAvailable: true },
      { id: 'cb-6', name: 'Cold Coffee + Aloo Tikki Burger', pricePaise: 13900, priceInr: 139, isAvailable: true },
      { id: 'cb-7', name: 'Kala Khatta + Spring Roll', pricePaise: 14900, priceInr: 149, isAvailable: true },
      { id: 'cb-8', name: 'Nachos with Salsa + Chilli Guava', pricePaise: 14900, priceInr: 149, isAvailable: true },
      { id: 'cb-9', name: 'Penne Alfredo + Cheese Garlic Bread', pricePaise: 22900, priceInr: 229, isAvailable: true },
      { id: 'cb-10', name: 'Classic Margherita + Oreo Shake', pricePaise: 24900, priceInr: 249, isAvailable: true },
    ],
  },
  {
    id: 'cat-chai',
    name: 'Chai Pe Charcha',
    displayOrder: 18,
    items: [
      { id: 'ch-c1', name: 'Katha Ki Chai', pricePaise: 2000, priceInr: 20, isAvailable: true },
      { id: 'ch-c2', name: 'Adrak Chai', pricePaise: 2500, priceInr: 25, isAvailable: true },
      { id: 'ch-c3', name: 'Elaichi Chai', pricePaise: 2500, priceInr: 25, isAvailable: true },
      { id: 'ch-c4', name: 'Kulhad Chai', pricePaise: 2500, priceInr: 25, isAvailable: true },
      { id: 'ch-c5', name: 'Chai (No Sugar)', pricePaise: 2500, priceInr: 25, isAvailable: true },
    ],
  },
  {
    id: 'cat-coffee',
    name: 'Coffee House',
    displayOrder: 19,
    items: [
      { id: 'cf-1', name: 'Hot Coffee', pricePaise: 4000, priceInr: 40, isAvailable: true },
      { id: 'cf-2', name: 'Black Coffee', pricePaise: 4000, priceInr: 40, isAvailable: true },
      { id: 'cf-3', name: 'Cold Coffee', pricePaise: 6000, priceInr: 60, isAvailable: true },
      { id: 'cf-4', name: 'Cold Coffee with Ice Cream', pricePaise: 7000, priceInr: 70, isAvailable: true },
      { id: 'cf-5', name: 'Green Tea', pricePaise: 4000, priceInr: 40, isAvailable: true },
      { id: 'cf-6', name: 'Lemon Tea', pricePaise: 4000, priceInr: 40, isAvailable: true },
      { id: 'cf-7', name: 'Kahwa', pricePaise: 4000, priceInr: 40, isAvailable: true },
      { id: 'cf-8', name: 'Hot Chocolate', pricePaise: 6000, priceInr: 60, isAvailable: true },
    ],
  },
  {
    id: 'cat-coolers',
    name: 'Refreshers & Coolers',
    displayOrder: 20,
    items: [
      { id: 'cl-1', name: 'Classic Lemonade', pricePaise: 5000, priceInr: 50, isAvailable: true },
      { id: 'cl-2', name: 'Aam Panna', pricePaise: 6000, priceInr: 60, isAvailable: true },
      { id: 'cl-3', name: 'Lemon Iced Tea', pricePaise: 7000, priceInr: 70, isAvailable: true },
      { id: 'cl-4', name: 'Peach Iced Tea', pricePaise: 7000, priceInr: 70, isAvailable: true },
      { id: 'cl-5', name: 'Virgin Mojito', pricePaise: 7000, priceInr: 70, isAvailable: true },
      { id: 'cl-6', name: 'Watermelon Mojito', pricePaise: 7000, priceInr: 70, isAvailable: true },
      { id: 'cl-7', name: 'Chilli Guava', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'cl-8', name: 'Kala Khatta', pricePaise: 8000, priceInr: 80, isAvailable: true },
      { id: 'cl-9', name: 'Pina Colada', pricePaise: 10000, priceInr: 100, isAvailable: true },
    ],
  },
  {
    id: 'cat-juices',
    name: 'Fresh Pressed Juices',
    displayOrder: 21,
    items: [
      { id: 'jc-1', name: 'Orange Juice', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'jc-2', name: 'Mosambi Juice', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'jc-3', name: 'Watermelon Juice', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'jc-4', name: 'Pineapple Juice', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'jc-5', name: 'Pomegranate Juice', pricePaise: 11000, priceInr: 110, isAvailable: true },
    ],
  },
  {
    id: 'cat-shakes',
    name: 'Thick Shakes',
    displayOrder: 22,
    items: [
      { id: 'sh-1', name: 'Chocolate Shake', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'sh-2', name: 'Oreo Shake', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'sh-3', name: 'KitKat Shake', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'sh-4', name: 'Strawberry Shake', pricePaise: 11000, priceInr: 110, isAvailable: true },
      { id: 'sh-5', name: 'Mango Shake', pricePaise: 12000, priceInr: 120, isAvailable: true },
      { id: 'sh-6', name: 'Nutella Shake', pricePaise: 13000, priceInr: 130, isAvailable: true },
      { id: 'sh-7', name: 'Brownie Shake', pricePaise: 13000, priceInr: 130, isAvailable: true },
      { id: 'sh-8', name: 'Tiramisu Shake', pricePaise: 16000, priceInr: 160, isAvailable: true },
      { id: 'sh-9', name: 'Lotus Biscoff Shake', pricePaise: 16000, priceInr: 160, isAvailable: true },
      { id: 'sh-10', name: 'Caramel Shake', pricePaise: 16000, priceInr: 160, isAvailable: true },
    ],
  },
  {
    id: 'cat-smoothies',
    name: 'Seasonal Smoothies',
    displayOrder: 23,
    items: [
      { id: 'sm-1', name: 'Banana Smoothie', pricePaise: 10000, priceInr: 100, isAvailable: true },
      { id: 'sm-2', name: 'Seasonal Mango Smoothie', pricePaise: 20000, priceInr: 200, isAvailable: true },
      { id: 'sm-3', name: 'Seasonal Strawberry Smoothie', pricePaise: 20000, priceInr: 200, isAvailable: true },
      { id: 'sm-4', name: 'Seasonal Blueberry Smoothie', pricePaise: 20000, priceInr: 200, isAvailable: true },
    ],
  },
];
