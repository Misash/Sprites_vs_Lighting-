const container = document.getElementById('graph');

const data = {
  nodes: [
    { id: 0, label: '0' },
    { id: 1, label: '1' },
    { id: 2, label: '2' },
    { id: 3, label: '3' }
  ],
  edges: [
    { from: 0, to: 1, label: '5' },
    { from: 0, to: 2, label: '3' },
    { from: 0, to: 3, label: '1' },
    { from: 1, to: 2, label: '10' },
    { from: 2, to: 3, label: '8' }
  ]
};

const options = {};
const network = new vis.Network(container, data, options);
