import '@toba/test';
import { whichTile } from './tile';

it('identifies tile ID for location', () => {
   expect(whichTile(53.7926757, 21.5732485)).toEqual([18347, -3867, 15]);
});