export type Cinema = 'CGV' | '메가박스' | '롯데시네마';

export interface Event {
  id: number;
  title: string;
  cinema: string; // Keeping as string to allow flexibility, but effectively Cinema
  goodsType: string;
  period: string;
  imageUrl: string;
  locations: string[];
  officialUrl: string;
  status: string;
}
