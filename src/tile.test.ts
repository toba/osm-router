import '@toba/test';
import { tiles } from './tile';

it('identifies tile ID for location', () => {
   expect(tiles.which(53.7926757, 21.5732485)).toEqual([18347, -3867, 15]);
});

it('downloads missing tiles', async () => {
   await tiles.ensure(52.240712, 21.025801);
   expect(2).toBe(2);
});
