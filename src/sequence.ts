import { reverse } from '@toba/node-tools';
import { Node, Relation, Role } from './types';

export const sharedNode = (nodes1: Node[], nodes2: Node[]) =>
   nodes1.find(n => nodes2.includes(n));

/**
 * Sequence of nodes grouped into `from`, `via` and `to` sets.
 */
export class Sequence {
   nodes: Node[][];
   relationID: number;
   valid = false;

   constructor(r: Relation) {
      const from = r.members.find(m => m.role == Role.From);
      const to = r.members.find(m => m.role == Role.To);

      if (from !== undefined && to !== undefined) {
         this.valid = true;
         this.relationID = r.id;
         this.nodes = [from.nodes];
         r.members
            .filter(m => m.role == Role.Via)
            .forEach(m => {
               this.nodes.push(m.nodes);
            });

         this.nodes.push(to.nodes);
      }
   }

   fromNodes = (): number[] => [
      // TODO: this will error on array length 1
      this.nodes[0][this.nodes[0].length - 2].id,
      this.nodes[1][0].id
   ];

   get length() {
      return this.nodes.length;
   }

   /**
    * Node IDs between "from" and "to" and excluding common IDs connecting
    * member groups.
    */
   viaNodes = (): number[] => {
      const via: number[] = [];

      for (let i = 1; i < this.length - 1; i++) {
         // skip first group since it was the "from" group
         for (let j = 1; j < this.nodes[i].length; j++) {
            // skip first node since that should be duplicate connector
            via.push(this.nodes[i][j].id);
         }
      }
      return via;
   };

   /**
    * First unique Node ID in "to" group.
    */
   toNode = (): number => this.nodes[this.nodes.length - 1][1].id;

   /**
    * Sort node sets so shared nodes are adjacent.
    * @example
    * [
    *    [a, b], [b, c], [c], [c, d, e], [e, f]
    * ]
    */
   sort(): this {
      if (!this.valid) {
         return this;
      }

      for (let i = 0, j = 1; i < this.nodes.length - 1; i++, j++) {
         /** Node that both groups have in common */
         const common = sharedNode(this.nodes[i], this.nodes[j]);

         if (common === undefined) {
            console.error(
               `No common node connecting relation ${this.relationID} members`
            );
            return this;
         }

         /** Last index of first group */
         const last = this.nodes[i].length - 1;

         if (this.nodes[j][0] !== common) {
            // reverse if first node of second group isn't the common node
            this.nodes[j] = reverse(this.nodes[j]);
         }

         if (i == 0 && this.nodes[i][last] !== common) {
            // only the "from" way can be reversed while ordering the nodes,
            // otherwise, the x way could be reversed twice (as member[x] and member[x+1])
            this.nodes[i] = reverse(this.nodes[i]);
         }

         if (this.nodes[i][last] !== this.nodes[j][0]) {
            console.error(
               `Relation ${this.relationID} member common nodes are not adjacent`
            );
            return this;
         }
      }
      return this;
   }
}
