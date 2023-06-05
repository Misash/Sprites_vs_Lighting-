const { ethers } = require("hardhat");
const delta = 10; // Número de bloques para que expire el hash
const HashTable = require('./HashTable.js');



class Channel {

    constructor(_players, _addressChannel, _PM) {
        this.addressChannel = _addressChannel;
        this.PM = _PM;
        this.player1 = _players[0];
        this.player2 = _players[1];
    }

    //get total amount of money of the party
    getBalance(address) {
        return this.addressChannel.getBalance(address);
    }

    //get the address of the recipient
    getAddressRecipient(address) {
        return this.addressChannel.getAddressRecipient(address);
    }

    //get index of the party
    getIndex(address) {
        return this.addressChannel.getIndex(address);
    }

    getPlayer(address) {
        return address === this.player1.address ? this.player1 : this.player2;
    }

    getLastRound() {
        return this.addressChannel.getRound();
    }


    //make a transaction
    async makeTransaction(senderAddress, recipientAdress, coins) {

        let sender = this.getPlayer(senderAddress);
        let recipient = this.getPlayer(recipientAdress);

        if (this.getBalance(sender.address) < coins) {
            throw new Error("Not enough money");
        }


        //sender send the preImage to the PM
        let Round = await this.getLastRound() + 1;
        let amount = ethers.utils.parseEther(coins);
        // let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret"));
        let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret" + Date.now()));
        let indexSender = await this.getIndex(sender.address);
        let indexRecipient = indexSender == 0 ? 1 : 0;
        let direction = [indexSender, indexRecipient]; // sender -> recipient

        // console.log("Round: ", Round);
        // console.log("amount: ", amount);
        // console.log("hash: ", hash);
        console.log("direction: ", direction);
        console.log("indexSender: ", indexSender);
        console.log("indexRecipient: ", indexRecipient);

        // Generate the singature
        const messageHash = ethers.utils.solidityKeccak256(
            ["uint", "bytes32", "int[2]", "uint"],
            [Round, hash, direction, amount]
        );

        //sender send the preimage with 
        let currentBlock = await this.PM.connect(sender).submitPreimage(messageHash);
        let deadline = currentBlock.blockNumber + delta;
        console.log("currentBlock: ", currentBlock.blockNumber);
        console.log("deadline: ", deadline);


        // //recipient has delta time to reveal the preimage
        let revealPreimage = await this.PM.connect(recipient).revealPreimage(messageHash);

        if (revealPreimage) {
            console.log("Recipient reveleaded the preimage before the deadline");
            //actualizar el estado del channel
            await this.addressChannel.connect(sender).update(Round, hash, direction, amount);
            console.log("Channel updated");
        } else {
            console.log("ERROR: Recipient not reveleaded the preimage before the deadline");
        }

    }


    //close the channel
    async close() {
        await this.addressChannel.finalize();
    }


}


class Network {

    //channels adress -> channel
    channels = new HashTable();


    //Global PreimageManager
    GPM = null;

    //nodos
    constructor(_GPM) {
        this.GPM = _GPM;
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
        const SpriteChannel = await ethers.getContractFactory("ConditionalChannel");
        const spriteChannel = await SpriteChannel.deploy([player1.address, player2.address]);
        await spriteChannel.deployed();

        // Make a deposit in the channel for both parties
        await spriteChannel.connect(player1).deposit({ value: ethers.utils.parseEther(coins1) }); //strings
        await spriteChannel.connect(player2).deposit({ value: ethers.utils.parseEther(coins2) });

        //create channel instance
        const channel = new Channel(players, spriteChannel, this.GPM);

        // add the bidirectional channel to the network
        this.channels.set(player1.address, channel);
        this.channels.set(player2.address, channel);


        console.log("Channel created: ", spriteChannel.address);
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
            // console.log("queue: ", queue);
        }

        // No se encontró un camino con suficiente capacidad
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


}




async function main() {


    // Desplegar el contrato PreimageManager
    const PreimageManager = await ethers.getContractFactory("contracts/PreImageManager.sol:PreimageManager");
    const preimageManager = await PreimageManager.deploy();
    await preimageManager.deployed();

    // Obtener una instancia existente del contrato PreimageManager
    const preimageManagerAddress = preimageManager.address; // Dirección del contrato PreimageManager existente
    const Global_PM = await ethers.getContractAt("contracts/ConditionalChannel.sol:PreimageManager", preimageManagerAddress);


    net = new Network(Global_PM);

    //get accounts
    const players = await ethers.getSigners();

    console.log("players: ", players.length);

    //create channels
    let channels = [];
    // channels[0] = await net.createChannel([players[0], players[1]], ["5", "7"]); //a-b
    // channels[1] = await net.createChannel([players[0], players[2]], ["3", "4"]); //a-c
    // channels[2] = await net.createChannel([players[0], players[3]], ["1", "2"]);  //a-d

    // channels[3] = await net.createChannel([players[1], players[2]], ["10", "6"]);  //a -c
    // channels[4] = await net.createChannel([players[2], players[3]], ["8", "6"]);  //c -d

    channels[0] = await net.createChannel([players[0], players[1]], ["5", "7"]); // a-b
    channels[1] = await net.createChannel([players[0], players[2]], ["3", "4"]); // a-c
    channels[2] = await net.createChannel([players[0], players[3]], ["1", "2"]); // a-d
    channels[3] = await net.createChannel([players[1], players[2]], ["10", "6"]); // b-c
    channels[4] = await net.createChannel([players[1], players[3]], ["8", "6"]); // b-d
    channels[5] = await net.createChannel([players[2], players[3]], ["9", "11"]); // c-d
    channels[6] = await net.createChannel([players[1], players[4]], ["5", "3"]); // b-e
    channels[7] = await net.createChannel([players[2], players[4]], ["7", "2"]); // c-e
    channels[8] = await net.createChannel([players[3], players[4]], ["4", "9"]); // d-e
    channels[9] = await net.createChannel([players[3], players[5]], ["6", "5"]); // d-f
    channels[10] = await net.createChannel([players[4], players[5]], ["8", "10"]); // e-f
    channels[11] = await net.createChannel([players[4], players[6]], ["3", "7"]); // e-g
    channels[12] = await net.createChannel([players[5], players[6]], ["4", "6"]); // f-g
    channels[13] = await net.createChannel([players[4], players[7]], ["9", "8"]); // e-h
    channels[14] = await net.createChannel([players[5], players[7]], ["11", "6"]); // f-h
    channels[15] = await net.createChannel([players[6], players[7]], ["7", "10"]); // g-h
    channels[16] = await net.createChannel([players[6], players[8]], ["4", "5"]); // g-i
    channels[17] = await net.createChannel([players[7], players[8]], ["6", "7"]); // h-i
    channels[18] = await net.createChannel([players[7], players[9]], ["8", "9"]); // h-j
    channels[19] = await net.createChannel([players[8], players[9]], ["5", "11"]); // i-j


    for (let i = 0; i < channels.length; i++) {
        console.log("channel: ", i);
        console.log("player1: ", channels[i].player1.address);
        console.log("player2: ", channels[i].player2.address);
        console.log("addressChannel: ", channels[i].addressChannel.address);
    }


    net.channels.printTable();


    let toSend = 5;
    //some user want to make a transaction in linkedChannels
    let path = await net.findShortestPathWithCapacity(players[0].address, players[8].address, toSend);

    if (path.length > 0) {
        console.log("Camino encontrado:");
        for (const chunk of path) {
            console.log(`${chunk.sender} -> ${chunk.recipient}`);
        }
    } else {
        console.log("No se encontró un camino con suficiente capacidad.");
    }


    //Make many transactions


    let currentBlock = await ethers.provider.getBlockNumber();
    let deadline = currentBlock + delta;
    console.log("currentBlock: ", currentBlock);
    console.log("deadline: ", deadline);

    for (let i = currentBlock; i < deadline; i++) {
        if (i == deadline - 3) {
            for (let chunk of path) {
                await chunk.channel.makeTransaction(chunk.sender, chunk.recipient, chunk.amount.toString());
            }
        }
        await network.provider.send("evm_mine");
    }




    //close the channel
    // await channel.close();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
