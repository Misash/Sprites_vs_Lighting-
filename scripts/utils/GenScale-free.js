// const fs = require('fs');

// function generateScaleFreeNetwork(numNodes, numEdges) {
//   const network = [];

//   // Create initial nodes
//   for (let i = 0; i < numEdges; i++) {
//     for (let j = i + 1; j < numEdges; j++) {
//       const weight1 = String(Math.floor(Math.random() * 10) + 1);
//       const weight2 = String(Math.floor(Math.random() * 10) + 1);
//       network.push({
//         players: [i, j],
//         weights: [weight1, weight2]
//       });
//     }
//   }

//   // Add remaining nodes with preferential attachment
//   for (let i = numEdges; i < numNodes; i++) {
//     const targets = [];
//     const degrees = [];

//     // Calculate degrees of existing nodes
//     network.forEach((edge) => {
//       const [player1, player2] = edge.players;
//       degrees[player1] = (degrees[player1] || 0) + 1;
//       degrees[player2] = (degrees[player2] || 0) + 1;
//     });

//     while (targets.length < numEdges) {
//       const sumDegrees = degrees.reduce((acc, degree) => acc + degree, 0);
//       const random = Math.random() * sumDegrees;
//       let cumulative = 0;
//       let j = 0;

//       while (cumulative < random) {
//         cumulative += degrees[j] || 0;
//         j++;
//       }

//       targets.push(j - 1);
//     }

//     targets.forEach((target) => {
//       const weight1 = String(Math.floor(Math.random() * 10) + 1);
//       const weight2 = String(Math.floor(Math.random() * 10) + 1);
//       network.push({
//         players: [i, target],
//         weights: [weight1, weight2]
//       });

//       degrees[i] = (degrees[i] || 0) + 1;
//       degrees[target] = (degrees[target] || 0) + 1;
//     });
//   }

//   return network;
// }



// const numNodes = 50;
// const numEdges = 3;

// const network = generateScaleFreeNetwork(numNodes, numEdges);
// const json = JSON.stringify(network, null, 2);

// fs.writeFileSync('./Datasets/ScaleFree.json', json);

// console.log('Scale-free network created!');
// console.log('Number of nodes:', numNodes);
