
import { PostcodeResult } from './types.ts';
import { PostcodeGroup } from './enhanced-types.ts';

export class PostcodeGrouper {
  static groupPostcodesByArea(postcodes: PostcodeResult[]): PostcodeGroup[] {
    const groups = new Map<string, PostcodeResult[]>();
    
    postcodes.forEach(postcode => {
      const area = postcode.postcode.split(' ')[0];
      if (!groups.has(area)) {
        groups.set(area, []);
      }
      groups.get(area)!.push(postcode);
    });

    return Array.from(groups.entries()).map(([area, postcodes]) => ({
      area,
      postcodes,
      priority: this.assessAreaPriority(area, postcodes)
    })).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private static assessAreaPriority(area: string, postcodes: PostcodeResult[]): 'high' | 'medium' | 'low' {
    if (area.startsWith('EH') || area.startsWith('G')) return 'high';
    if (area.match(/^[ENSW][0-9]/)) return 'high';
    if (area.match(/^(M|B|L|S|CF|LS|NE)[0-9]/)) return 'medium';
    return 'low';
  }
}
