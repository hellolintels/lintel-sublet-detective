
import { PostcodeResult } from './types.ts';

export class TestPostcodeProvider {
  static getTestPostcodes(): PostcodeResult[] {
    return [
      { postcode: "G11 5AW", address: "23 Banavie Road, G11 5AW", streetName: "Banavie Road" },
      { postcode: "G12 9HB", address: "10 Crown Circus, G12 9HB", streetName: "Crown Circus" }
    ];
  }
}
