// Everything you will ever need to edit lives in this file.
window.JEV = {
  price: 100,                 // USD, shown on every page and used as the USDT amount
  currency: "USD",

  // Stripe Payment Link (Dashboard -> Payment Links -> copy URL)
  stripeLink: "https://buy.stripe.com/00w4gz6KXb8u9WndGU7wA02",             // e.g. "https://buy.stripe.com/xxxxxxxx"

  // USDT wallets. Leave an address empty and that network is shown as unavailable.
  wallets: [
    { id: "erc20",    label: "USDT ERC-20",   chain: "Ethereum",  address: "0x17065154D3555B6068Ced88f78025cD9F2405c14", hash: /^0x[0-9a-fA-F]{64}$/, ph: "0x..." },
    { id: "bep20",    label: "USDT BEP-20",   chain: "BNB Chain", address: "0x17065154D3555B6068Ced88f78025cD9F2405c14", hash: /^0x[0-9a-fA-F]{64}$/, ph: "0x..." },
    { id: "polygon",  label: "USDT Polygon",  chain: "Polygon",   address: "0x17065154D3555B6068Ced88f78025cD9F2405c14", hash: /^0x[0-9a-fA-F]{64}$/, ph: "0x..." },
    { id: "arbitrum", label: "USDT Arbitrum", chain: "Arbitrum One", address: "0x17065154D3555B6068Ced88f78025cD9F2405c14", hash: /^0x[0-9a-fA-F]{64}$/, ph: "0x..." },
    { id: "trc20",    label: "USDT TRC-20",   chain: "Tron",      address: "TJNYuNvaiT355CiML1ZcbgyWnWvKmWjuJn", hash: /^[0-9a-fA-F]{64}$/, ph: "64-character hash" },
    { id: "sol",      label: "USDT Solana",   chain: "Solana",    address: "8fp3hyRBRVGFtAwieCpkhH2pB6DYFyZ7fXAThQ46MuMy", hash: /^[1-9A-HJ-NP-Za-km-z]{80,90}$/, ph: "transaction signature" },
  ],

  // Crypto buyers submit email + tx hash. With Supabase filled in, it lands in the
  // pending_payments table (see supabase.sql). Without it, it opens an email to contactEmail.
  supabaseUrl: "https://fbqwxtpcrzltetyjcfgn.supabase.co",            // e.g. "https://abcd1234.supabase.co"
  supabaseAnonKey: "sb_publishable_12oDhR_gAUaKoh5RdYSqiQ_AKIfY1xm",
  contactEmail: "",           // fallback inbox for crypto payment notices

  telegram: "https://t.me/tryrx",
  x: "https://x.com/hanakoxbt",
  agentLayers: "https://agent-layers.vercel.app",
};
