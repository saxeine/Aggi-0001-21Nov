export interface StockItem {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  seedPrice: number;
  sector?: string;
}

export const SEED_STOCKS: StockItem[] = [
  { id: 'aapl', name: 'Apple Inc.', symbol: 'AAPL', icon: 'https://cdn-icons-png.flaticon.com/512/179/179309.png', seedPrice: 185.50, sector: 'Technology & Software' },
  { id: 'msft', name: 'Microsoft Corp.', symbol: 'MSFT', icon: 'https://cdn-icons-png.flaticon.com/512/732/732221.png', seedPrice: 420.10, sector: 'Technology & Software' },
  { id: 'nvda', name: 'NVIDIA Corp.', symbol: 'NVDA', icon: 'https://cdn-icons-png.flaticon.com/512/5969/5969146.png', seedPrice: 950.40, sector: 'Semiconductors' },
  { id: 'googl', name: 'Alphabet Inc.', symbol: 'GOOGL', icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png', seedPrice: 175.20, sector: 'Technology & Software' },
  { id: 'amzn', name: 'Amazon.com Inc.', symbol: 'AMZN', icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968269.png', seedPrice: 180.80, sector: 'Consumer & Retail' },
  { id: 'meta', name: 'Meta Platforms', symbol: 'META', icon: 'https://cdn-icons-png.flaticon.com/512/6033/6033716.png', seedPrice: 485.60, sector: 'Technology & Software' },
  { id: 'tsla', name: 'Tesla Inc.', symbol: 'TSLA', icon: 'https://cdn-icons-png.flaticon.com/512/5969/5969032.png', seedPrice: 170.30, sector: 'Automotive & Energy' },
  { id: 'avgo', name: 'Broadcom Inc.', symbol: 'AVGO', icon: 'https://cdn-icons-png.flaticon.com/512/196/196561.png', seedPrice: 1400.00, sector: 'Semiconductors' },
  { id: 'cost', name: 'Costco Wholesale Corp.', symbol: 'COST', icon: 'https://cdn-icons-png.flaticon.com/512/6124/6124991.png', seedPrice: 725.50, sector: 'Consumer & Retail' },
  { id: 'nflx', name: 'Netflix Inc.', symbol: 'NFLX', icon: 'https://cdn-icons-png.flaticon.com/512/732/732228.png', seedPrice: 610.20, sector: 'Media & Entertainment' },
  { id: 'amd', name: 'Advanced Micro Devices', symbol: 'AMD', icon: 'https://cdn-icons-png.flaticon.com/512/5969/5969064.png', seedPrice: 160.40, sector: 'Semiconductors' },
  { id: 'adbe', name: 'Adobe Inc.', symbol: 'ADBE', icon: 'https://cdn-icons-png.flaticon.com/512/732/732178.png', seedPrice: 495.30, sector: 'Technology & Software' },
  { id: 'intc', name: 'Intel Corp.', symbol: 'INTC', icon: 'https://cdn-icons-png.flaticon.com/512/217/217036.png', seedPrice: 30.15, sector: 'Semiconductors' },
  { id: 'qcom', name: 'Qualcomm Inc.', symbol: 'QCOM', icon: 'https://cdn-icons-png.flaticon.com/512/5969/5969188.png', seedPrice: 180.20, sector: 'Semiconductors' },
  { id: 'pep', name: 'PepsiCo Inc.', symbol: 'PEP', icon: 'https://cdn-icons-png.flaticon.com/512/5969/5969115.png', seedPrice: 170.80, sector: 'Consumer & Retail' },
  { id: 'csco', name: 'Cisco Systems Inc.', symbol: 'CSCO', icon: 'https://cdn-icons-png.flaticon.com/512/5969/5969085.png', seedPrice: 48.50, sector: 'Networking & Telecom' },
  { id: 'cmcsa', name: 'Comcast Corp.', symbol: 'CMCSA', icon: 'https://cdn-icons-png.flaticon.com/512/196/196532.png', seedPrice: 40.10, sector: 'Media & Entertainment' },
  { id: 'amgn', name: 'Amgen Inc.', symbol: 'AMGN', icon: 'https://cdn-icons-png.flaticon.com/512/196/196561.png', seedPrice: 285.50, sector: 'Health & Biotech' },
  { id: 'tmus', name: 'T-Mobile US Inc.', symbol: 'TMUS', icon: 'https://cdn-icons-png.flaticon.com/512/5969/5969192.png', seedPrice: 165.40, sector: 'Networking & Telecom' },
  { id: 'hon', name: 'Honeywell Int\'l Inc.', symbol: 'HON', icon: 'https://cdn-icons-png.flaticon.com/512/196/196561.png', seedPrice: 195.20, sector: 'Industrials & Conglomerates' }
];
