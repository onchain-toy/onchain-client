import { isAddress } from "viem";

// Every "0x..." field across the admin/test forms is free text typed by a
// human before it goes straight into a contract call - validate the shape
// client-side so a typo shows up as an inline error instead of either a
// cryptic wallet/RPC rejection or (worse) a malformed arg silently coerced.
export function isValidAddressInput(value: string): boolean {
  return isAddress(value.trim());
}
