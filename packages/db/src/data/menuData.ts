export interface RawMenuItem {
  name: string;
  pricePaise: number;
  description?: string;
  isAvailable?: boolean;
}

export interface RawMenuCategory {
  name: string;
  displayOrder: number;
  items: RawMenuItem[];
}

export const CANONICAL_MENU_DATA: RawMenuCategory[] = [
  {
    name: 'Snacks',
    displayOrder: 1,
    items: [
      { name: 'Vada Paav', pricePaise: 5000 },
      { name: 'Spring Roll', pricePaise: 8000 },
      { name: 'Nachos with Salsa', pricePaise: 8000 },
      { name: 'Cheese Balls', pricePaise: 10000 },
      { name: 'Corn Cheese Balls', pricePaise: 12000 },
      { name: 'Crispy Corn', pricePaise: 11000 },
      { name: 'Loaded Nachos', pricePaise: 11000 },
    ],
  },
  {
    name: 'Pakoda Junction',
    displayOrder: 2,
    items: [
      { name: 'Onion Pakoda', pricePaise: 9000 },
      { name: 'Aloo Pakoda', pricePaise: 9000 },
      { name: 'Paneer Pakoda', pricePaise: 11000 },
      { name: 'Mix Veg Pakoda', pricePaise: 12000 },
    ],
  },
  {
    name: 'Breads',
    displayOrder: 3,
    items: [
      { name: 'Bun Maska', pricePaise: 3500 },
      { name: 'Butter Toast', pricePaise: 4000 },
      { name: 'Nutella Butter Toast', pricePaise: 8000 },
    ],
  },
  {
    name: 'Maggi Bar',
    displayOrder: 4,
    items: [
      { name: 'Plain Maggi', pricePaise: 5000 },
      { name: 'Vegetable Maggi', pricePaise: 6000 },
      { name: 'Peri Peri Maggi', pricePaise: 7000 },
      { name: 'Schezwan Maggi', pricePaise: 7000 },
      { name: 'Tandoori Maggi', pricePaise: 8000 },
      { name: 'Corn Maggi', pricePaise: 8000 },
      { name: 'Butter Makhni Maggi', pricePaise: 10000 },
      { name: 'Cheese Garlic Maggi', pricePaise: 12000 },
    ],
  },
  {
    name: 'Fries',
    displayOrder: 5,
    items: [
      { name: 'French Fries', pricePaise: 8000 },
      { name: 'Peri Peri Fries', pricePaise: 9000 },
      { name: 'Chilli Potato', pricePaise: 13000 },
      { name: 'Honey Chilli Potato', pricePaise: 14000 },
    ],
  },
  {
    name: 'Garlic Bread',
    displayOrder: 6,
    items: [
      { name: 'Cheese Garlic Bread', pricePaise: 9000 }, // Canonical confirmed price
      { name: 'Cheese Chilli Garlic Bread', pricePaise: 10000 },
      { name: 'Corn Cheese Garlic Bread', pricePaise: 10000 },
      { name: 'Cheese Burst Garlic Bread', pricePaise: 15000 },
    ],
  },
  {
    name: 'Sandwiches',
    displayOrder: 7,
    items: [
      { name: 'Veg Grill Sandwich', pricePaise: 11000 },
      { name: 'Bombay Grill Sandwich', pricePaise: 11000 }, // Canonical confirmed price
      { name: 'Paneer Grill Sandwich', pricePaise: 13000 },
      { name: 'Cheese Corn Grill Sandwich', pricePaise: 13000 },
      { name: 'Peri Peri Grill Sandwich', pricePaise: 13000 },
      { name: 'Bahubali Sandwich', pricePaise: 21000 },
    ],
  },
  {
    name: 'Burgers',
    displayOrder: 8,
    items: [
      { name: 'Aloo Tikki Burger', pricePaise: 9000 },
      { name: 'Veg Burger', pricePaise: 9000 },
      { name: 'Katha Special Burger', pricePaise: 12000 },
    ],
  },
  {
    name: 'Rolls',
    displayOrder: 9,
    items: [
      { name: 'Veg Roll', pricePaise: 9000 },
      { name: 'Paneer Roll', pricePaise: 11000 },
    ],
  },
  {
    name: 'Taco Tales',
    displayOrder: 10,
    items: [
      { name: 'Veg Taco', pricePaise: 8000 },
      { name: 'Paneer Taco', pricePaise: 9000 },
      { name: 'Cheese Taco', pricePaise: 10000 },
      { name: 'Chipotle Cheese Taco', pricePaise: 11000 },
    ],
  },
  {
    name: 'Pizza',
    displayOrder: 11,
    items: [
      { name: 'Classic Margherita', pricePaise: 17000 },
      { name: 'Indiana Pizza', pricePaise: 17000 }, // Canonical confirmed price
      { name: 'Barbeque Pizza', pricePaise: 18000 },
      { name: 'Corn Pizza', pricePaise: 18000 },
      { name: 'Cheese Overload Pizza', pricePaise: 18000 },
      { name: 'Farmhouse Loaded Pizza', pricePaise: 25000 },
      { name: 'Tandoori Paneer Pizza', pricePaise: 28000 },
      { name: 'Katha Special Pizza', pricePaise: 30000 },
    ],
  },
  {
    name: 'Pasta',
    displayOrder: 12,
    items: [
      { name: 'Penne Arrabbiata', pricePaise: 17000 },
      { name: 'Penne Alfredo', pricePaise: 17000 }, // Canonical confirmed price
      { name: 'Pink Velvet Pasta', pricePaise: 18000 },
      { name: 'Mac N Cheese', pricePaise: 20000 },
    ],
  },
  {
    name: 'Noodles',
    displayOrder: 13,
    items: [
      { name: 'Hakka Noodles', pricePaise: 11000 },
      { name: 'Schezwan Noodles', pricePaise: 11000 },
      { name: 'Singapore Noodles', pricePaise: 12000 },
      { name: 'Hong Kong Noodles', pricePaise: 12000 },
    ],
  },
  {
    name: 'Chaat Chowk',
    displayOrder: 14,
    items: [
      { name: 'Sev Puri', pricePaise: 6000 },
      { name: 'Dahi Papdi Chaat', pricePaise: 8000 },
      { name: 'Chinese Bhel', pricePaise: 8000 },
      { name: 'Jhalmuri', pricePaise: 9000 },
    ],
  },
  {
    name: 'Healthy Salads',
    displayOrder: 15,
    items: [
      { name: 'Waldorf Salad', pricePaise: 18000 },
      { name: 'Greek Salad', pricePaise: 18000 },
    ],
  },
  {
    name: 'Dessert',
    displayOrder: 16,
    items: [{ name: 'Brownie with Ice Cream', pricePaise: 11000 }],
  },
  {
    name: 'Bollywood Combo Specials',
    displayOrder: 17,
    items: [
      { name: 'Chai + Bun Maska', pricePaise: 4900 },
      { name: 'Chai + Veg Maggi', pricePaise: 6900 },
      { name: 'Chai + Onion Pakoda', pricePaise: 9900 },
      { name: 'Hot Coffee + Nutella Butter Toast', pricePaise: 10900 },
      { name: 'Chai + Bombay Grill Sandwich', pricePaise: 11900 },
      { name: 'Cold Coffee + Aloo Tikki Burger', pricePaise: 13900 },
      { name: 'Kala Khatta + Spring Roll', pricePaise: 14900 },
      { name: 'Nachos with Salsa + Chilli Guava', pricePaise: 14900 },
      { name: 'Penne Alfredo + Cheese Garlic Bread', pricePaise: 22900 },
      { name: 'Classic Margherita + Oreo Shake', pricePaise: 24900 },
    ],
  },
  {
    name: 'Chai Pe Charcha',
    displayOrder: 18,
    items: [
      { name: 'Katha Ki Chai', pricePaise: 2000 },
      { name: 'Adrak Chai', pricePaise: 2500 },
      { name: 'Elaichi Chai', pricePaise: 2500 },
      { name: 'Kulhad Chai', pricePaise: 2500 },
      { name: 'Chai (No Sugar)', pricePaise: 2500 },
    ],
  },
  {
    name: 'Coffee House',
    displayOrder: 19,
    items: [
      { name: 'Hot Coffee', pricePaise: 4000 },
      { name: 'Black Coffee', pricePaise: 4000 },
      { name: 'Cold Coffee', pricePaise: 6000 },
      { name: 'Cold Coffee with Ice Cream', pricePaise: 7000 },
      { name: 'Green Tea', pricePaise: 4000 },
      { name: 'Lemon Tea', pricePaise: 4000 },
      { name: 'Kahwa', pricePaise: 4000 },
      { name: 'Hot Chocolate', pricePaise: 6000 },
    ],
  },
  {
    name: 'Refreshers & Coolers',
    displayOrder: 20,
    items: [
      { name: 'Classic Lemonade', pricePaise: 5000 },
      { name: 'Aam Panna', pricePaise: 6000 },
      { name: 'Lemon Iced Tea', pricePaise: 7000 },
      { name: 'Peach Iced Tea', pricePaise: 7000 },
      { name: 'Virgin Mojito', pricePaise: 7000 },
      { name: 'Watermelon Mojito', pricePaise: 7000 },
      { name: 'Chilli Guava', pricePaise: 8000 },
      { name: 'Kala Khatta', pricePaise: 8000 },
      { name: 'Pina Colada', pricePaise: 10000 },
    ],
  },
  {
    name: 'Fresh Pressed Juices',
    displayOrder: 21,
    items: [
      { name: 'Orange Juice', pricePaise: 10000 },
      { name: 'Mosambi Juice', pricePaise: 10000 },
      { name: 'Watermelon Juice', pricePaise: 10000 },
      { name: 'Pineapple Juice', pricePaise: 10000 },
      { name: 'Pomegranate Juice', pricePaise: 11000 },
    ],
  },
  {
    name: 'Thick Shakes',
    displayOrder: 22,
    items: [
      { name: 'Chocolate Shake', pricePaise: 10000 },
      { name: 'Oreo Shake', pricePaise: 10000 },
      { name: 'KitKat Shake', pricePaise: 10000 },
      { name: 'Strawberry Shake', pricePaise: 11000 },
      { name: 'Mango Shake', pricePaise: 12000 },
      { name: 'Nutella Shake', pricePaise: 13000 },
      { name: 'Brownie Shake', pricePaise: 13000 },
      { name: 'Tiramisu Shake', pricePaise: 16000 },
      { name: 'Lotus Biscoff Shake', pricePaise: 16000 },
      { name: 'Caramel Shake', pricePaise: 16000 },
    ],
  },
  {
    name: 'Seasonal Smoothies',
    displayOrder: 23,
    items: [
      { name: 'Banana Smoothie', pricePaise: 10000 },
      { name: 'Seasonal Mango Smoothie', pricePaise: 20000 },
      { name: 'Seasonal Strawberry Smoothie', pricePaise: 20000 },
      { name: 'Seasonal Blueberry Smoothie', pricePaise: 20000 },
    ],
  },
];
