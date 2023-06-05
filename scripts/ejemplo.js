class Node {
    constructor(name, capacity) {
        this.name = name;
        this.capacity = capacity;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
    }

    add(name, capacity) {
        const newNode = new Node(name, capacity);
        if (!this.head) {
            this.head = newNode;
        } else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }
    }
}

const graph = {};

function findShortestPathWithCapacity(start, target, requiredCapacity) {
    const capacities = {};
    const previous = {};
    const queue = [];
    queue.push(start);
    capacities[start] = Infinity;

    while (queue.length > 0) {
        const vertex = queue.shift();

        if (vertex === target && capacities[vertex] >= requiredCapacity) {
            // Se encontró el camino con suficiente capacidad
            const path = [];
            let current = previous[target];
            while (current.sender !== start) {
                console.log("entro al while");
                path.unshift(current);
                current = previous[current.sender];
            }
            path.unshift(current);
            return path;
        }

        for (const neighbor of graph[vertex]) {
            const name = neighbor.name;
            const newCapacity = Math.min(capacities[vertex], neighbor.capacity);
            if (!capacities[name] || newCapacity > capacities[name]) {
                capacities[name] = newCapacity;
                chunk = {sender: vertex, recipient: name, amount: requiredCapacity};
                previous[name] = chunk;
                queue.push(name);
            }
        }
    }

    // No se encontró un camino con suficiente capacidad
    return [];
}

// Crear grafo de capacidades de los canales
graph["alice"] = [
    { name: "bob", capacity: 5 },
    { name: "carol", capacity: 3 },
    { name: "darian", capacity: 1 },
];
graph["bob"] = [
    { name: "alice", capacity: 7 },
    { name: "carol", capacity: 10 },
];
graph["carol"] = [
    { name: "alice", capacity: 4 },
    { name: "bob", capacity: 6 },
    { name: "darian", capacity: 8 },
];
graph["darian"] = [
    { name: "carol", capacity: 8 },
    { name: "darian", capacity: 2 },
];

// Encontrar camino más corto con suficiente capacidad
const startUser = "alice";
const targetUser = "darian";
const requiredCapacity = 3;

const shortestPath = findShortestPathWithCapacity(startUser, targetUser, requiredCapacity);

if (shortestPath.length > 0) {
    console.log("Camino encontrado:", shortestPath);
} else {
    console.log("No se encontró un camino con suficiente capacidad.");
}
