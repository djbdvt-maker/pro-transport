/**
 * ============================================================
 *  DIJKSTRA'S ALGORITHM — Custom Implementation
 *  No routing library used. Coded from scratch.
 * ============================================================
 *
 *  Speed constants (km/h):
 *    Metro  → 35 km/h
 *    Bus    → 18 km/h
 *    Walk   → 5  km/h
 *
 *  Edge weight = travel time in minutes (distance / speed × 60)
 *  Distance    = Haversine formula (great-circle distance)
 * ============================================================
 */

const SPEEDS = { metro: 35, bus: 18, walk: 5 };

// --- Haversine formula: distance in km between two lat/lng points ---
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Min-heap priority queue for Dijkstra's ---
class MinHeap {
  constructor() { this.heap = []; }

  push(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  isEmpty() { return this.heap.length === 0; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].cost <= this.heap[i].cost) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].cost < this.heap[smallest].cost) smallest = l;
      if (r < n && this.heap[r].cost < this.heap[smallest].cost) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// --- Build adjacency graph from network JSON ---
function buildGraph(network) {
  const stops = {};
  network.stops.forEach(s => (stops[s.id] = s));

  const graph = {};
  network.stops.forEach(s => (graph[s.id] = []));

  network.connections.forEach(conn => {
    const a = stops[conn.from];
    const b = stops[conn.to];
    if (!a || !b) return;
    const dist = haversine(a.lat, a.lng, b.lat, b.lng);
    const time = (dist / SPEEDS[conn.mode]) * 60; // minutes
    graph[conn.from].push({ to: conn.to, time, mode: conn.mode, dist });
    graph[conn.to].push({ to: conn.from, time, mode: conn.mode, dist });
  });

  return { graph, stops };
}

/**
 * Dijkstra's shortest path algorithm
 * Finds the minimum-time path from startId to endId in the graph.
 *
 * Each heap node: { cost, stopId, path, modes, distance }
 *   cost     = total time in minutes so far
 *   stopId   = current stop
 *   path     = array of stop IDs visited
 *   modes    = array of transport modes used for each leg
 *   distance = total km traveled
 */
function dijkstra(graph, stops, startId, endId) {
  const heap = new MinHeap();
  heap.push({ cost: 0, stopId: startId, path: [startId], modes: [], distance: 0 });

  const visited = new Set();

  while (!heap.isEmpty()) {
    const { cost, stopId, path, modes, distance } = heap.pop();

    // Skip already-processed stops
    if (visited.has(stopId)) continue;
    visited.add(stopId);

    // Destination reached — return result
    if (stopId === endId) {
      return {
        path,
        modes,
        transitTime: cost,
        transitDistance: distance,
        stopObjects: path.map(id => stops[id])
      };
    }

    // Explore neighbors
    for (const edge of graph[stopId] || []) {
      if (!visited.has(edge.to)) {
        heap.push({
          cost: cost + edge.time,
          stopId: edge.to,
          path: [...path, edge.to],
          modes: [...modes, edge.mode],
          distance: distance + edge.dist
        });
      }
    }
  }

  return null; // No path found
}

// --- Find n nearest stops to a lat/lng point ---
function nearestStops(lat, lng, stops, n = 3) {
  return Object.values(stops)
    .map(stop => ({ stop, dist: haversine(lat, lng, stop.lat, stop.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

/**
 * Main entry: find the best route from (startLat, startLng) to (endLat, endLng)
 * Tries top-3 nearest stops for both ends and picks the fastest overall.
 */
function findBestRoute(network, startLat, startLng, endLat, endLng) {
  const { graph, stops } = buildGraph(network);

  const startCandidates = nearestStops(startLat, startLng, stops, 3);
  const endCandidates   = nearestStops(endLat,   endLng,   stops, 3);

  let best = null;
  let bestTotalTime = Infinity;

  for (const { stop: sStop, dist: sDist } of startCandidates) {
    for (const { stop: eStop, dist: eDist } of endCandidates) {
      if (sStop.id === eStop.id) continue;

      const result = dijkstra(graph, stops, sStop.id, eStop.id);
      if (!result) continue;

      const walkTimeStart = (sDist / SPEEDS.walk) * 60;
      const walkTimeEnd   = (eDist / SPEEDS.walk) * 60;
      const totalTime = result.transitTime + walkTimeStart + walkTimeEnd;

      if (totalTime < bestTotalTime) {
        bestTotalTime = totalTime;
        best = {
          ...result,
          totalTime,
          walkStart: { stop: sStop, dist: sDist, time: walkTimeStart },
          walkEnd:   { stop: eStop, dist: eDist, time: walkTimeEnd   },
          startCoords: { lat: startLat, lng: startLng },
          endCoords:   { lat: endLat,   lng: endLng   }
        };
      }
    }
  }

  return best;
}
