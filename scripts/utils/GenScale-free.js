const fs = require('fs');
const Graph = require('graphology');

function generateScaleFreeNetwork(numNodes, numEdges) {
  const network = new Graph();

  // Add nodes
  for (let i = 0; i < numNodes; i++) {
    network.addNode(i);
  }

  // Connect nodes with preferential attachment
  for (let i = numEdges; i < numNodes; i++) {
    const targets = [];
    const degrees = network.nodes().map((node) => network.degree(node));

    while (targets.length < numEdges) {
      const sumDegrees = degrees.reduce((acc, degree) => acc + degree, 0);
      const random = Math.random() * sumDegrees;
      let cumulative = 0;
      let j = 0;

      while (cumulative < random) {
        cumulative += degrees[j];
        j++;
      }

      targets.push(j - 1);
    }

    network.addNode(i);
    targets.forEach((target) => network.addEdge(i, target));
  }

  // Assign random weights to edges
  network.edges().forEach((edge) => {
    network.setEdgeAttribute(edge, 'weight', Math.floor(Math.random() * 10) + 1);
  });

  return network;
}

const numNodes = 50;
const numEdges = 5;

const network = generateScaleFreeNetwork(numNodes, numEdges);
const json = JSON.stringify(network.export(), null, 2);

fs.writeFileSync('./Datasets/ScaleFree.json', json);

console.log('Scale-free network created!');
console.log('Number of nodes:', network.nodes().length);
