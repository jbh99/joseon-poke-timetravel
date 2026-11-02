// The world line after 1945 (content_wkit.js tells how it works): twenty-one eras from the Convention of Peking to
// the end of the Second World War, in the order they come after the Korean line's last era in ERAS (content.js).
import { W1 } from './content_w1.js';
import { W2 } from './content_w2.js';
export { WORLD_QITEMS } from './content_wkit.js';

export const WORLD = [...W1, ...W2];
