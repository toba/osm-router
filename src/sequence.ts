import { reverse } from '@toba/node-tools'
import { Node, Relation, Role } from '@toba/osm-models'

export const sharedNode = <T>(nodes1: T[], nodes2: T[]) =>
   nodes1.find(n => nodes2.includes(n))

/**
 * List item immediately before last item if length is at least 2, otherwise
 * the last item.
 */
export const nextToLast = <T>(nodes: T[]): T =>
   nodes[nodes.length - (nodes.length > 1 ? 2 : 1)]

/** Last list item. */
export const last = <T>(nodes: T[]): T => nodes[nodes.length - 1]

/**
 * Sort node sets so shared nodes are adjacent.
 * @example [[a, b], [b, c], [c], [c, d, e], [e, f]]
 * @returns Whether sort was successful
 */
export function sortNodeSets(nodes: Node[][]): boolean {
   for (let i = 0, j = 1; i < nodes.length - 1; i++, j++) {
      /** Node that both groups have in common */
      const common = sharedNode(nodes[i], nodes[j])

      if (common === undefined) {
         console.error('No common node connecting relation members')
         return false
      }
      /** Last index of first group */
      const lastIndex = nodes[i].length - 1

      // reverse if first node of second group isn't the common node
      if (nodes[j][0] !== common) nodes[j] = reverse(nodes[j])

      if (i == 0 && nodes[i][lastIndex] !== common) {
         // only the "from" way can be reversed while ordering the nodes,
         // otherwise, the x way could be reversed twice (as member[x] and member[x+1])
         nodes[i] = reverse(nodes[i])
      }

      if (nodes[i][lastIndex] !== nodes[j][0]) {
         console.error('Relation member common nodes are not adjacent')
         return false
      }
   }
   return true
}

/**
 * Sequence of nodes grouped into `from`, `via` and `to` sets. There can be only
 * one `from` and `to` set but multiple `via` sets are allowed.
 */
export class Sequence {
   #nodes: Node[][]
   /** Whether node sets could be sorted so all shared nodes are adjacent */
   valid = false

   constructor(r: Relation) {
      const from = r.members.find(m => m.role == Role.From)
      const to = r.members.find(m => m.role == Role.To)

      if (from !== undefined && to !== undefined) {
         this.valid = true
         this.#nodes = [from.nodes]

         r.members
            .filter(m => m.role == Role.Via)
            .forEach(m => this.#nodes.push(m.nodes))

         this.#nodes.push(to.nodes)
      }
   }

   /**
    * Set of nodes traveller is coming from is the last unique node of the OSM
    * relation "from" member and the first "via" node.
    */
   get fromNodes(): [number, number] {
      return [nextToLast(this.#nodes[0]).id, this.#nodes[1][0].id]
   }

   /**
    * Number of node sets.
    */
   get length() {
      return this.#nodes.length
   }

   /**
    * Nodes from all sets flattened into single unique list.
    */
   get allNodes(): number[] {
      return [...this.fromNodes, ...this.viaNodes, this.toNode]
   }

   /**
    * Node IDs between the first and last sets ("from" and "to") and excluding
    * common IDs connecting the sets.
    */
   get viaNodes(): number[] {
      const via: number[] = []

      for (let i = 1; i < this.length - 1; i++) {
         // skip first group since it was the "from" group
         for (let j = 1; j < this.#nodes[i].length; j++) {
            // skip first node since that should be duplicate connector
            via.push(this.#nodes[i][j].id)
         }
      }
      return via
   }

   /**
    * First unique node ID at destination.
    */
   get toNode(): number {
      return last(this.#nodes)[1].id
   }

   /**
    * Sort node sets so shared nodes are adjacent.
    * @example [[a, b], [b, c], [c], [c, d, e], [e, f]]
    */
   sort(): this {
      if (this.valid) this.valid = sortNodeSets(this.#nodes)
      return this
   }
}
