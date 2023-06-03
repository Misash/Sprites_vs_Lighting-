class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
    }

    append(data) {
        const newNode = new Node(data);
        if (this.head === null) {
            this.head = newNode;
        } else {
            let current = this.head;
            while (current.next !== null) {
                current = current.next;
            }
            current.next = newNode;
        }
    }

    search(data) {
        let current = this.head;
        while (current !== null) {
            if (current.data === data) {
                return true;
            }
            current = current.next;
        }
        return false;
    }

    remove(data) {
        if (this.head === null) {
            return;
        }
        if (this.head.data === data) {
            this.head = this.head.next;
            return;
        }
        let current = this.head;
        let previous = null;
        while (current !== null) {
            if (current.data === data) {
                previous.next = current.next;
                return;
            }
            previous = current;
            current = current.next;
        }
    }
}

class HashTable {
    constructor() {
        this.table = {};
    }

    _hash(key) {
        return key.toString();
    }

    set(key, value) {
        const hashedKey = this._hash(key);
        if (!this.table[hashedKey]) {
            this.table[hashedKey] = new LinkedList();
        }
        this.table[hashedKey].append(value);
    }

    get(key) {
        const hashedKey = this._hash(key);
        if (!this.table[hashedKey]) {
            return null;
        }
        return this.table[hashedKey];
    }

    remove(key) {
        const hashedKey = this._hash(key);
        if (!this.table[hashedKey]) {
            return;
        }
        delete this.table[hashedKey];
        for(const k in this.table){
            this.table[k].remove(key);
        }
    }

    exist(key){
        return this.table[key]
    }

    printTable() {
        console.log("\n");
        for (const key in this.table) {
            if (this.table[key]) {
                const linkedList = this.table[key];
                let current = linkedList.head;
                let listString = "";
                while (current !== null) {
                    listString += current.data + " -> ";
                    current = current.next;
                }
                listString = listString.slice(0, -4); // Eliminar la flecha y espacio extra al final
                console.log(`${key} = ${listString}`);
            }
        }
    }

}

module.exports = HashTable;

// Ejemplo de uso
const addressTable = new HashTable();

addressTable.set('O', 'A');
addressTable.set('O', 'B');
addressTable.set('A', 'O');
addressTable.set('A', 'D');
addressTable.set('A', 'C');
addressTable.set('B', 'O');
addressTable.set('B', 'C');


const linkedList1 = addressTable.get('O');
console.log(linkedList1.search('D')); // true
console.log(linkedList1.search('A')); // false

addressTable.printTable()

addressTable.remove('O');

addressTable.printTable()
