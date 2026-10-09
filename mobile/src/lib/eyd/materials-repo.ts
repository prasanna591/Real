import type { EydState, Material, MaterialCategory } from './types';

/**
 * Material catalogue repository.
 * Today it reads the local seed catalogue; a future marketplace API can replace
 * these functions with network-backed implementations without touching screens.
 */

export interface MaterialFilter {
  category?: MaterialCategory | 'all';
  query?: string;
}

/** Catalogue filtered by category + free-text query (name/supplier/description). */
export function listFilteredCatalog(state: EydState, filter: MaterialFilter = {}): Material[] {
  const { category = 'all', query = '' } = filter;
  const q = query.trim().toLowerCase();
  return state.materials.filter((m) => {
    if (category !== 'all' && m.category !== category) return false;
    if (!q) return true;
    return (
      m.product.toLowerCase().includes(q) ||
      m.supplier.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    );
  });
}

/** Materials the user added to their project list, in add order. */
export function listProjectMaterials(state: EydState): Material[] {
  return state.projectMaterials
    .map((id) => state.materials.find((m) => m.id === id))
    .filter((m): m is Material => Boolean(m));
}
