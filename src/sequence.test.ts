import '@toba/test';
import { sharedNode } from './sequence';
import { Node } from './types';

const nodes: Node[] = [];

beforeAll(() => {
   for (let i = 0; i < 20; i++) {
      nodes.push({
         id: i,
         lat: 0,
         lon: 0,
         point: () => [0, 0]
      });
   }
});
it('identifies node shared between lists', () => {
   const set1 = nodes.filter((_, i) => i < 10);
   const set2 = nodes.filter((_, i) => i > 8);

   const n = sharedNode(set1, set2);

   expect(n).toBeDefined();
   expect(n!.id).toBe(9);
});
