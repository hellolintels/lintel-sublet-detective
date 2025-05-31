
import { PostcodeResult } from './types.ts';

export class TestPostcodeProvider {
  static getTestPostcodes(): PostcodeResult[] {
    return [
      { postcode: "EH12 8UU", address: "Flat 4, 1 Stuart Court, Stuart Square, EDINBURGH EH12 8UU", streetName: "Stuart Square" },
      { postcode: "EH15 2PS", address: "Flat 6, 279 Portobello High Street, EDINBURGH EH15 2PS", streetName: "Portobello High Street" },
      { postcode: "EH7 5DW", address: "Flat 8, 8 Lyne Street, EDINBURGH EH7 5DW", streetName: "Lyne Street" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" },
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" }
    ];
  }
}
