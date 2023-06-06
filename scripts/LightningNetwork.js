
const HashTable = require('./utils/HashTable.js');
const LightningChannelContainer = require('./LightningChannelContainer.js');

class LightningNetwork {

    //channels adress -> channel
    channels = new HashTable();


    //nodos
    constructor() {
        console.log("Network created");
    }


    removeNode(adressPlayer) {
        this.nodes.remove(adressPlayer);
    }

    async createChannel([player1, player2], [coins1, coins2]) {

        const players = [player1, player2]

        console.log("player1: ", player1.address);
        console.log("player2: ", player2.address);

        // deploy a contract on the network
        const ConditionalChannel = await ethers.getContractFactory("ConditionalChannel");
        const conditionalChannel = await ConditionalChannel.deploy([player1.address, player2.address]);
        await conditionalChannel.deployed();

        // Make a deposit in the channel for both parties
        await conditionalChannel.connect(player1).deposit({ value: ethers.utils.parseEther(coins1) }); //strings
        await conditionalChannel.connect(player2).deposit({ value: ethers.utils.parseEther(coins2) });

        //create a lightning channel with Local PreimageManager
        const channel = new LightningChannelContainer(players, conditionalChannel, await this.getPM());


        // add the bidirectional channel to the network
        this.channels.set(player1.address, channel);
        this.channels.set(player2.address, channel);


        console.log("Channel created: ", conditionalChannel.address);
        return channel;
    }


    async findShortestPathWithCapacity(start, target, requiredCapacity) {

        //BFS
        const capacities = {};
        const previous = {};
        const queue = [];
        queue.push(start);
        capacities[start] = Infinity;

        while (queue.length > 0) {

            //save and delete the first element of the queue
            const vertex = queue.shift();

            if (vertex === target && capacities[vertex] >= requiredCapacity) {
                // plath found
                const path = [];
                let current = previous[target];
                while (current.sender !== start) {
                    path.unshift(current);
                    current = previous[current.sender];
                }
                path.unshift(current);
                return path;
            }

            for (const ch of this.channels.get(vertex)) {
                //get the neighbor
                const recipient = await ch.getAddressRecipient(vertex);
                //how much money can be sent
                const newCapacity = Math.min(capacities[vertex], await ch.getBalance(vertex));
                //if the neighbor has more capacity than the current one or not exists
                if (!capacities[recipient] || newCapacity > capacities[recipient]) {
                    capacities[recipient] = newCapacity;
                    let chunk = { sender: vertex, recipient: recipient, amount: requiredCapacity, channel: ch };
                    previous[recipient] = chunk;
                    queue.push(recipient);
                }
            }
         
        }

        return [];
    }


    async getAccounts(n) {
        const accounts = [];
        const players = await ethers.getSigners();

        for (let i = 0; i < n; i++) {
            accounts.push(players[i]);
        }

        return accounts;
    }


    async getPM() {
        const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
        const preimageManager = await PreimageManager.deploy();
        await preimageManager.deployed();

        const preimageManagerAddress = preimageManager.address;
        const PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);
        return PM;
    }


}


module.exports = LightningNetwork;