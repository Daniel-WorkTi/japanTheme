/**
 * Kenko Lab — IDs dos pixels / ads
 * Preenche estes valores (sem espaços). Deixa '' se não usares a plataforma.
 *
 * Meta Pixel: Events Manager → Data Sources → Pixel ID
 * GA4: Admin → Data Streams → Measurement ID (G-XXXX)
 * Google Ads: AW-XXXXXXXXX  + labels das conversões
 * TikTok: Assets → Events → Pixel Code
 */
window.KENKO_TRACKING = {
  currency: 'JPY',
  contentName: 'Kenko Lab Spicy Cubes',
  contentIds: ['spicy-cubes'],
  metaPixelId: '', // ex: '123456789012345'
  ga4Id: '', // ex: 'G-XXXXXXXXXX'
  googleAdsId: '', // ex: 'AW-XXXXXXXXX'
  googleAdsCheckoutLabel: '', // label InitiateCheckout
  googleAdsPurchaseLabel: '', // Purchase fica na Shopify/Aunox
  tiktokPixelId: '', // ex: 'CXXXXXXXXXXXX'
  debug: false // true = logs no console
};
