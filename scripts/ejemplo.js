const fs = require('fs');

function generateSmallWorldNetwork(numNodes, k, p) {
  const network = [];

  // Create nodes with neighbors and connections
  for (let i = 0; i < numNodes; i++) {
    const neighbors = [];

    // Connect to k nearest neighbors
    for (let j = 1; j <= k / 2; j++) {
      const prev = (i - j + numNodes) % numNodes;
      const next = (i + j) % numNodes;
      neighbors.push(prev, next);
    }

    // Re-wire edges with probability p
    for (let j = 0; j < neighbors.length; j++) {
      if (Math.random() < p) {
        const randomNode = Math.floor(Math.random() * numNodes);
        neighbors[j] = randomNode;
      }
    }

    // Remove duplicate neighbors
    const uniqueNeighbors = Array.from(new Set(neighbors));

    // Create connections
    for (const neighbor of uniqueNeighbors) {
      const weight1 = String(Math.floor(Math.random() * 10) + 1);
      const weight2 = String(Math.floor(Math.random() * 10) + 1);
      network.push({
        players: [i, neighbor],
        weights: [weight1, weight2]
      });
    }
  }

  return network;
}

const numNodes = 50;
const k = 5; // Number of nearest neighbors
const p = 0.5; // Probability of re-wiring

const network = generateSmallWorldNetwork(numNodes, k, p);
const json = JSON.stringify(network, null, 2);

fs.writeFileSync('./Datasets/SmallWorld.json', json);

console.log('Small-world network created!');
console.log('Number of nodes:', numNodes);