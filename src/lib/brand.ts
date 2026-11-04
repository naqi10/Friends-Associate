/** Company identity. The legal/trading name is Friends Associates; faryk.com is the web domain. */
export const BRAND = {
  name: "Friends Associates",
  domain: "faryk.com",
  city: "Rahim Yar Khan",
  phone: "0300-6711828",
  phoneIntl: "+92 300 6711828",
  tagline: "Architecture · Construction · Properties",
} as const;

/** An office not open yet: the admin writes "Coming soon" as its address. Shown as such, never as a place to visit or pay. */
export const isComingSoon = (address: string) => /^coming soon/i.test(address.trim());
