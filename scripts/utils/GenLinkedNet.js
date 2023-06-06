

function GenLinkedChannels(numNodes) {

  const graph = [];

  for (let i = 0; i < numNodes - 1; i++) {
    const players = [i, i + 1];
    const weights = [(Math.floor(Math.random() * 10) + 1).toString(), (Math.floor(Math.random() * 10) + 1).toString()];
    const edge = { players, weights };
    graph.push(edge);
  }

  // const jsonGraph = JSON.stringify(graph);
  // console.log(jsonGraph);
  // fs.writeFileSync('./Datasets/LinkedNet.json', jsonGraph);
  return graph;
}


module.exports = GenLinkedChannels

