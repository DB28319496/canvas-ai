// Auto-layout algorithms for canvas nodes

const NODE_WIDTH = 320;
const NODE_HEIGHT = 200;
const H_GAP = 60;
const V_GAP = 80;

/**
 * Grid layout — arranges nodes in a responsive grid
 */
export function gridLayout(nodes, startX = 100, startY = 100) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...node,
      position: {
        x: startX + col * (NODE_WIDTH + H_GAP),
        y: startY + row * (NODE_HEIGHT + V_GAP)
      }
    };
  });
}

/**
 * Tree / Mind Map layout — builds a tree from edges, positions root at center-top
 * Nodes without edges are placed in a row below the tree
 */
export function treeLayout(nodes, edges, startX = 400, startY = 80) {
  if (nodes.length === 0) return [];
  if (edges.length === 0) return gridLayout(nodes, startX, startY);

  // Build adjacency list
  const children = {};
  const hasParent = new Set();

  edges.forEach(edge => {
    if (!children[edge.source]) children[edge.source] = [];
    children[edge.source].push(edge.target);
    hasParent.add(edge.target);
  });

  // Find root nodes (no incoming edges among connected nodes)
  const connectedIds = new Set();
  edges.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target); });

  const roots = [...connectedIds].filter(id => !hasParent.has(id));
  if (roots.length === 0) roots.push([...connectedIds][0]); // cycle fallback

  // Orphan nodes (not connected to any edge)
  const orphans = nodes.filter(n => !connectedIds.has(n.id));

  // BFS to assign levels and positions
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const levels = {}; // nodeId -> level
  const levelNodes = {}; // level -> [nodeId]
  const visited = new Set();

  const queue = roots.map(id => ({ id, level: 0 }));
  roots.forEach(id => visited.add(id));

  while (queue.length > 0) {
    const { id, level } = queue.shift();
    levels[id] = level;
    if (!levelNodes[level]) levelNodes[level] = [];
    levelNodes[level].push(id);

    (children[id] || []).forEach(childId => {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Position each level centered horizontally
  const positioned = {};
  const maxLevel = Math.max(...Object.values(levels), 0);

  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const ids = levelNodes[lvl] || [];
    const totalWidth = ids.length * NODE_WIDTH + (ids.length - 1) * H_GAP;
    const offsetX = startX - totalWidth / 2;

    ids.forEach((id, i) => {
      positioned[id] = {
        x: offsetX + i * (NODE_WIDTH + H_GAP),
        y: startY + lvl * (NODE_HEIGHT + V_GAP)
      };
    });
  }

  // Place orphan nodes in a row below the tree
  const orphanY = startY + (maxLevel + 1.5) * (NODE_HEIGHT + V_GAP);
  const orphanTotalWidth = orphans.length * NODE_WIDTH + (orphans.length - 1) * H_GAP;
  const orphanOffsetX = startX - orphanTotalWidth / 2;

  const result = nodes.map(node => {
    if (positioned[node.id]) {
      return { ...node, position: positioned[node.id] };
    }
    const orphanIdx = orphans.findIndex(o => o.id === node.id);
    if (orphanIdx >= 0) {
      return {
        ...node,
        position: {
          x: orphanOffsetX + orphanIdx * (NODE_WIDTH + H_GAP),
          y: orphanY
        }
      };
    }
    return node;
  });

  return result;
}

/**
 * Radial / Mind Map layout — root at center, children radiate outward
 */
export function radialLayout(nodes, edges, centerX = 600, centerY = 400) {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ ...nodes[0], position: { x: centerX, y: centerY } }];
  if (edges.length === 0) return gridLayout(nodes, centerX - 300, centerY - 200);

  // Build adjacency
  const children = {};
  const hasParent = new Set();
  edges.forEach(edge => {
    if (!children[edge.source]) children[edge.source] = [];
    children[edge.source].push(edge.target);
    hasParent.add(edge.target);
  });

  const connectedIds = new Set();
  edges.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target); });
  const roots = [...connectedIds].filter(id => !hasParent.has(id));
  if (roots.length === 0) roots.push([...connectedIds][0]);

  const orphans = nodes.filter(n => !connectedIds.has(n.id));
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  // BFS to count subtree sizes for angle allocation
  const subtreeSize = {};
  const visited = new Set();

  function countSubtree(id) {
    if (subtreeSize[id] !== undefined) return subtreeSize[id];
    visited.add(id);
    let size = 1;
    (children[id] || []).forEach(child => {
      if (!visited.has(child)) {
        size += countSubtree(child);
      }
    });
    subtreeSize[id] = size;
    return size;
  }

  roots.forEach(r => { visited.clear(); countSubtree(r); });

  // Position using angle sectors
  const positioned = {};
  const RING_DISTANCE = 300;

  function positionNode(id, depth, angleStart, angleEnd) {
    const angle = (angleStart + angleEnd) / 2;
    const radius = depth * RING_DISTANCE;
    positioned[id] = {
      x: centerX + radius * Math.cos(angle) - NODE_WIDTH / 2,
      y: centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2
    };

    const kids = (children[id] || []).filter(c => !positioned[c]);
    if (kids.length === 0) return;

    const totalSize = kids.reduce((sum, c) => sum + (subtreeSize[c] || 1), 0);
    let currentAngle = angleStart;

    kids.forEach(child => {
      const childSize = subtreeSize[child] || 1;
      const childAngleRange = (angleEnd - angleStart) * (childSize / totalSize);
      positionNode(child, depth + 1, currentAngle, currentAngle + childAngleRange);
      currentAngle += childAngleRange;
    });
  }

  // Distribute root nodes across a full circle
  const totalRoots = roots.length;
  roots.forEach((rootId, i) => {
    const angleStart = (2 * Math.PI * i) / totalRoots - Math.PI / 2;
    const angleEnd = (2 * Math.PI * (i + 1)) / totalRoots - Math.PI / 2;
    positionNode(rootId, 0, angleStart, angleEnd);
  });

  // Place orphans in a cluster below
  const orphanY = centerY + 500;
  const orphanTotalWidth = orphans.length * (NODE_WIDTH + H_GAP);
  const orphanStartX = centerX - orphanTotalWidth / 2;

  return nodes.map(node => {
    if (positioned[node.id]) {
      return { ...node, position: positioned[node.id] };
    }
    const idx = orphans.findIndex(o => o.id === node.id);
    if (idx >= 0) {
      return {
        ...node,
        position: { x: orphanStartX + idx * (NODE_WIDTH + H_GAP), y: orphanY }
      };
    }
    return node;
  });
}
