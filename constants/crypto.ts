
import { CoinId, Timeframe } from '../crypto-types';

export const DEFAULT_SEK_RATE = 10.65;

export const COINS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', sector: 'Layer 1 Protocols' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', sector: 'Layer 1 Protocols' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', icon: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', sector: 'Layer 1 Protocols' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', icon: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', sector: 'Layer 1 Protocols' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', icon: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', sector: 'Layer 1 Protocols' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', icon: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png', sector: 'Layer 1 Protocols' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', icon: 'https://assets.coingecko.com/coins/images/877/small/chainlink.png', sector: 'Web3 & Infrastructure' },
  { id: 'stellar', name: 'Stellar', symbol: 'XLM', icon: 'https://assets.coingecko.com/coins/images/100/small/stellar.png', sector: 'Layer 1 Protocols' },
  { id: 'hedera-hashgraph', name: 'Hedera', symbol: 'HBAR', icon: 'https://assets.coingecko.com/coins/images/3688/small/hbar.png', sector: 'Layer 1 Protocols' },
  { id: 'sui', name: 'Sui', symbol: 'SUI', icon: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.png', sector: 'Layer 1 Protocols' },
  { id: 'xdce-utility-token', name: 'XinFin', symbol: 'XDC', icon: 'https://assets.coingecko.com/coins/images/2912/small/xdc-icon.png', sector: 'Layer 1 Protocols' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', icon: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', sector: 'Layer 1 Protocols' },
  { id: 'polygon-ecosystem-token', name: 'Polygon', symbol: 'POL', icon: 'https://assets.coingecko.com/coins/images/302/small/polygon.png', sector: 'Layer 2 Protocols' },
  { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', icon: 'https://assets.coingecko.com/coins/images/10365/small/near.png', sector: 'Layer 1 Protocols' },
  { id: 'crypto-com-chain', name: 'Cronos', symbol: 'CRO', icon: 'https://assets.coingecko.com/coins/images/7310/small/cronos.png', sector: 'DeFi & Exchange' },
  { id: 'ondo-finance', name: 'Ondo', symbol: 'ONDO', icon: 'https://assets.coingecko.com/coins/images/34360/small/ondo.jpeg', sector: 'DeFi & Exchange' },
  { id: 'algorand', name: 'Algorand', symbol: 'ALGO', icon: 'https://assets.coingecko.com/coins/images/4380/small/download.png', sector: 'Layer 1 Protocols' },
  { id: 'vechain', name: 'VeChain', symbol: 'VET', icon: 'https://assets.coingecko.com/coins/images/1167/small/vechain.png', sector: 'Web3 & Infrastructure' },
  { id: 'research-coin', name: 'ResearchCoin', symbol: 'RSC', icon: 'https://assets.coingecko.com/coins/images/11993/small/RSC_icon.png', sector: 'Web3 & Infrastructure' },
  { id: 'astar', name: 'Astar', symbol: 'ASTR', icon: 'https://assets.coingecko.com/coins/images/22617/small/astar.png', sector: 'Layer 1 Protocols' },
  { id: 'kata-exchange', name: 'Katas', symbol: 'KATA', icon: 'https://assets.coingecko.com/coins/images/21915/small/kata.png', sector: 'DeFi & Exchange' },
  { id: 'superior-coin', name: 'Superior Coin', symbol: 'SUP', icon: 'https://assets.coingecko.com/coins/images/2264/small/superior-coin.png', sector: 'Meme Coins' },
  { id: 'thb-currency', name: 'Thai Baht', symbol: 'THB', icon: 'https://cdn-icons-png.flaticon.com/512/197/197452.png', sector: 'Other' },
];

export const COIN_MAP: Record<CoinId, typeof COINS[0]> = COINS.reduce((acc, coin) => {
  acc[coin.id] = coin;
  return acc;
}, {} as any);

export const TIMEFRAMES: { label: string, value: Timeframe, days: number, description: string }[] = [
  { label: '1H', value: '1H', days: 1, description: '1-Hour candles for short-term scalping' },
  { label: '4H', value: '4H', days: 7, description: '4-Hour candles for intraday structure' },
  { label: '1D', value: '1D', days: 30, description: 'Daily candles for swing trading' },
  { label: '1W', value: '1W', days: 180, description: 'Weekly candles for macro perspective' },
];

export const FALLBACK_PRICES: Record<string, { usd: number, usd_24h_change: number }> = {
  bitcoin: { usd: 65420, usd_24h_change: 2.5 },
  ethereum: { usd: 3450, usd_24h_change: 1.8 },
  ripple: { usd: 0.62, usd_24h_change: -0.5 },
  solana: { usd: 145, usd_24h_change: 4.2 },
  cardano: { usd: 0.45, usd_24h_change: 0.2 },
  polkadot: { usd: 7.20, usd_24h_change: -1.2 },
  chainlink: { usd: 18.50, usd_24h_change: 3.1 },
  stellar: { usd: 0.12, usd_24h_change: -0.8 },
  'hedera-hashgraph': { usd: 0.08, usd_24h_change: 1.5 },
  sui: { usd: 1.15, usd_24h_change: 5.6 },
  'xdce-utility-token': { usd: 0.045, usd_24h_change: -1.0 },
  'avalanche-2': { usd: 35.80, usd_24h_change: 2.7 },
  'polygon-ecosystem-token': { usd: 0.68, usd_24h_change: -0.4 },
  near: { usd: 5.40, usd_24h_change: 3.8 },
  'crypto-com-chain': { usd: 0.12, usd_24h_change: 1.2 },
  'ondo-finance': { usd: 0.75, usd_24h_change: 2.5 },
  algorand: { usd: 0.18, usd_24h_change: -0.5 },
  vechain: { usd: 0.035, usd_24h_change: 0.8 },
  'research-coin': { usd: 0.42, usd_24h_change: 15.2 },
  astar: { usd: 0.08, usd_24h_change: -1.2 },
  'kata-exchange': { usd: 0.00045, usd_24h_change: 5.4 },
  'superior-coin': { usd: 0.0012, usd_24h_change: -2.1 },
};
