// KOT utility functions

import { KOTStatus } from "@/types/kot.types";

/**
 * Calculate KOT status from items
 * Logic: If ANY item is "placed" → KOT is "placed"
 *        Else if ANY item is "preparing" → KOT is "preparing"
 *        Else if ANY item is "ready" → KOT is "ready"
 *        Else if ALL items are "served" → KOT is "served"
 */
export function calculateKOTStatus(itemStatuses: KOTStatus[]): KOTStatus {
  if (itemStatuses.length === 0) return 'placed';

  const hasPlaced = itemStatuses.some(s => s === 'placed');
  const hasPreparing = itemStatuses.some(s => s === 'preparing');
  const hasReady = itemStatuses.some(s => s === 'ready');
  const allServed = itemStatuses.every(s => s === 'served');

  if (hasPlaced) return 'placed';
  if (hasPreparing) return 'preparing';
  if (hasReady) return 'ready';
  if (allServed) return 'served';

  return 'placed';
}

/**
 * Get KOT age in minutes
 */
export function getKOTAge(createdAt: string): number {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Get status badge color classes
 */
export function getStatusBadgeClass(status: KOTStatus): string {
  const statusColors = {
    placed: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    preparing: 'bg-blue-100 text-blue-800 border-blue-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    served: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return statusColors[status] || statusColors.placed;
}

/**
 * Get status color for KOT card background
 */
export function getStatusColor(status: KOTStatus, age: number): string {
  if (status === 'ready') return 'border-green-500 bg-green-50';
  if (age > 30) return 'border-red-500 bg-red-50';
  if (age > 15) return 'border-orange-500 bg-orange-50';
  if (status === 'preparing') return 'border-blue-500 bg-blue-50';
  return 'border-yellow-500 bg-yellow-50';
}
