export interface Product {
  id: string | number;
  title: string;
  priceEarrings: number;
  priceKeychain: number;
  description: string;
  images: string[];
  category: string;
  rating: number;
  inStock: boolean;
}
